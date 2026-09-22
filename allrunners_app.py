"""
allRunners — Flask app with Smashrun-backed run features.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import time
from datetime import date as date_cls
from datetime import datetime, time as dt_time, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, redirect, request, send_file, session

from auth_urls import AUTH_CALLBACK_PATH, authorization_callback_uri, authorized_javascript_origin
from config import (
    api_key,
    service_api_key,
    smashrun_client_id,
    smashrun_client_secret,
)
import runs_db
from smashrun_api import SmashrunApiError, SmashrunClient
from weather_api import fetch_current_weather, fetch_weather_for_place

ROOT = Path(__file__).resolve().parent
HTML_FILE = ROOT / "running_tracker_final.html"

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "allrunners-dev-secret")
app.config["ALLRUNNERS_API_KEY"] = api_key()
app.config["SERVICE_API_KEY"] = service_api_key()
app.config["SMASHRUN_CLIENT_ID"] = smashrun_client_id()
app.config["SMASHRUN_CLIENT_SECRET"] = smashrun_client_secret()

smashrun = SmashrunClient(timeout_s=20.0, retries=2)
runs_db.init(ROOT / "data" / "runs.sqlite")


def effective_service_key() -> str | None:
    val = (os.environ.get("SERVICE_API_KEY") or os.environ.get("OPENAI_API_KEY") or "").strip()
    return val or None


def _apply_service_key(raw: str | None) -> None:
    key = (raw or "").strip()
    if key:
        os.environ["SERVICE_API_KEY"] = key
        app.config["SERVICE_API_KEY"] = key
    else:
        os.environ.pop("SERVICE_API_KEY", None)
        os.environ.pop("OPENAI_API_KEY", None)
        app.config["SERVICE_API_KEY"] = None


def _smashrun_cfg() -> tuple[str | None, str | None]:
    return (
        (app.config.get("SMASHRUN_CLIENT_ID") or "").strip() or None,
        (app.config.get("SMASHRUN_CLIENT_SECRET") or "").strip() or None,
    )


def _public_origin() -> str:
    """
    Base URL (no path) for building the OAuth redirect URI. Must match exactly what is
    registered in the Smashrun app and what you use in the browser (e.g. do not mix
    http://127.0.0.1:5005 with http://localhost:5005 — session cookies differ).
    """
    override = (os.environ.get("ALLRUNNERS_PUBLIC_ORIGIN") or "").strip().rstrip("/")
    if override:
        return override
    return (request.url_root or "").rstrip("/") or "http://127.0.0.1:5000"


def _callback_uri() -> str:
    return _public_origin() + AUTH_CALLBACK_PATH


def _token_record() -> dict[str, Any] | None:
    rec = session.get("smashrun_token")
    return rec if isinstance(rec, dict) else None


def _save_token_payload(payload: dict[str, Any], *, keep_refresh_from_old: bool = True) -> dict[str, Any]:
    old = _token_record() or {}
    now = int(time.time())
    expires_in = int(payload.get("expires_in") or 0)
    refresh_token = str(payload.get("refresh_token") or "").strip()
    if not refresh_token and keep_refresh_from_old:
        refresh_token = str(old.get("refresh_token") or "").strip()
    rec = {
        "access_token": str(payload.get("access_token") or ""),
        "refresh_token": refresh_token,
        "token_type": str(payload.get("token_type") or "Bearer"),
        "expires_at": now + max(0, expires_in - 30) if expires_in else None,
        "expires_in": expires_in,
        "obtained_at": now,
    }
    session["smashrun_token"] = rec
    return rec


def _clear_smashrun_session() -> None:
    session.pop("smashrun_token", None)
    session.pop("smashrun_oauth_state", None)


def _require_access_token() -> str:
    rec = _token_record()
    if not rec or not rec.get("access_token"):
        raise SmashrunApiError("not_connected", status=401, code="not_connected")

    expires_at = rec.get("expires_at")
    now = int(time.time())
    if isinstance(expires_at, int) and now >= expires_at:
        refresh_token = str(rec.get("refresh_token") or "").strip()
        cid, csecret = _smashrun_cfg()
        if not refresh_token or not cid or not csecret:
            _clear_smashrun_session()
            raise SmashrunApiError("token_expired", status=401, code="token_expired")
        refreshed = smashrun.refresh_access_token(
            client_id=cid,
            client_secret=csecret,
            refresh_token=refresh_token,
        )
        rec = _save_token_payload(refreshed)

    token = str(rec.get("access_token") or "").strip()
    if not token:
        raise SmashrunApiError("not_connected", status=401, code="not_connected")
    return token


def _access_token_or_none() -> str | None:
    """Return a Smashrun token when the user is connected. Local runs still work without one."""
    try:
        return _require_access_token()
    except SmashrunApiError:
        return None


def _smashrun_error_response(e: SmashrunApiError):
    code = (e.code or "").lower()
    status = int(e.status or 502)
    if code in {"not_connected", "invalid_client"}:
        status = 401
    elif status in (408, 425, 429, 500, 502, 503, 504):
        status = 502 if status != 429 else 429
    return jsonify(error=code or "smashrun_error", detail=e.message), status


def _activity_id(activity: dict[str, Any]) -> Any:
    for key in ("activityId", "id", "runId"):
        if key in activity:
            return activity[key]
    return None


def _as_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _parse_iso_utc_seconds(text: str) -> int | None:
    t = (text or "").strip()
    if not t:
        return None
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except ValueError:
        return None


def _activity_modified_utc(activity: dict[str, Any]) -> int | None:
    for key in (
        "lastModifiedDateUTC",
        "modifiedDateUTC",
        "updatedAtUTC",
        "dateTimeUTCOfLastChange",
        "startDateTimeUTC",
    ):
        raw = activity.get(key)
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            ts = int(raw)
            if ts > 1000000000000:
                ts = ts // 1000
            return ts
        if isinstance(raw, str):
            sec = _parse_iso_utc_seconds(raw)
            if sec is not None:
                return sec
    return None


def _to_local_run(activity: dict[str, Any]) -> dict[str, Any]:
    km = _as_float(activity.get("distance"), _as_float(activity.get("totalDistance"), 0.0))
    seconds = _as_float(activity.get("duration"), _as_float(activity.get("totalTimerTime"), 0.0))
    start_local = str(activity.get("startDateTimeLocal") or activity.get("startDateTimeUTC") or "")
    date_text = start_local[:10] if len(start_local) >= 10 else ""
    mod = _activity_modified_utc(activity)
    out: dict[str, Any] = {
        "id": _activity_id(activity),
        "distance": round(km / 1.609344, 2),
        "time": round(seconds / 60.0, 2),
        "date": date_text,
        "notes": str(activity.get("notes") or ""),
        "source": "smashrun",
        "externalId": str(activity.get("externalId") or activity.get("external_id") or ""),
    }
    if mod is not None:
        out["_modifiedUtc"] = mod
    return out


def _stable_external_id(local: dict[str, Any]) -> str:
    date_text = str(local.get("date") or "").strip()
    d_miles = round(_as_float(local.get("distance")), 5)
    t_minutes = round(_as_float(local.get("time")), 5)
    raw = f"allrunners|{date_text}|{d_miles}|{t_minutes}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"allrunners-{digest}"


def _to_smashrun_activity(local: dict[str, Any]) -> dict[str, Any]:
    d_miles = _as_float(local.get("distance"))
    t_minutes = _as_float(local.get("time"))
    d_km = round(d_miles * 1.609344, 5)
    duration_sec = int(round(t_minutes * 60))
    date_text = str(local.get("date") or "").strip()
    run_date = date_cls.fromisoformat(date_text)
    local_tz = datetime.now().astimezone().tzinfo
    start_local = datetime.combine(run_date, dt_time(hour=6, minute=0), tzinfo=local_tz).isoformat()
    notes = str(local.get("notes") or "").strip()
    ext = str(local.get("externalId") or local.get("external_id") or "").strip()
    if not ext:
        ext = _stable_external_id(local)
    payload: dict[str, Any] = {
        "activityType": "running",
        "startDateTimeLocal": start_local,
        "distance": d_km,
        "duration": duration_sec,
        "externalId": ext[:120],
    }
    if notes:
        payload["notes"] = notes[:800]
    return payload


def _normalize_activity_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        for key in ("activities", "data", "results", "items"):
            if isinstance(payload.get(key), list):
                return [x for x in payload[key] if isinstance(x, dict)]
    return []


def _sanitize_trail_points(raw: Any) -> list[dict[str, float | int]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, float | int]] = []
    for p in raw[:5000]:
        if not isinstance(p, dict):
            continue
        try:
            lat = float(p.get("lat"))
            lon = float(p.get("lon"))
        except (TypeError, ValueError):
            continue
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            continue
        t_raw = p.get("t")
        try:
            t_val = int(float(t_raw)) if t_raw is not None else int(time.time() * 1000)
        except (TypeError, ValueError):
            t_val = int(time.time() * 1000)
        out.append({"lat": round(lat, 6), "lon": round(lon, 6), "t": t_val})
    return out


def _trail_notes_line(name: str, mode: str, points: list[dict[str, float | int]]) -> str:
    if not points:
        return "[allRunners trail] points=0"
    first = points[0]
    last = points[-1]
    clean_name = " ".join((name or "").split())[:42]
    mode_text = "walk" if mode == "walk" else "run"
    return (
        "[allRunners trail] "
        f"name={clean_name or 'run'} "
        f"mode={mode_text} "
        f"points={len(points)} "
        f"start={first['lat']:.5f},{first['lon']:.5f} "
        f"end={last['lat']:.5f},{last['lon']:.5f}"
    )


@app.get("/api/settings")
def api_get_settings():
    configured = bool(effective_service_key())
    cid, csecret = _smashrun_cfg()
    connected = bool((_token_record() or {}).get("access_token"))
    return jsonify(
        service_key_configured=configured,
        openai_configured=configured,
        smashrun_client_configured=bool(cid and csecret),
        smashrun_connected=connected,
    )


@app.post("/api/settings/service-key")
def api_set_service_key():
    data = request.get_json(silent=True) or {}
    key = (data.get("service_api_key") or "").strip()
    _apply_service_key(key if key else None)
    ok = bool(effective_service_key())
    return jsonify(ok=True, service_key_configured=ok, openai_configured=ok)


@app.post("/api/settings/openai-key")
def api_set_openai_key_legacy():
    data = request.get_json(silent=True) or {}
    key = (data.get("service_api_key") or data.get("openai_api_key") or "").strip()
    _apply_service_key(key if key else None)
    ok = bool(effective_service_key())
    return jsonify(ok=True, service_key_configured=ok, openai_configured=ok)


@app.get("/api/smashrun/login")
def api_smashrun_login():
    cid, _csecret = _smashrun_cfg()
    if not cid:
        return jsonify(
            error="smashrun_client_not_configured",
            detail="Set SMASHRUN_CLIENT_ID and SMASHRUN_CLIENT_SECRET in .env (see api.smashrun.com), then restart Flask.",
        ), 400
    state = secrets.token_urlsafe(18)
    session["smashrun_oauth_state"] = state
    url = smashrun.build_authorize_url(
        client_id=cid,
        redirect_uri=_callback_uri(),
        state=state,
        scope="read_activity write_activity",
        response_type="code",
    )
    return redirect(url)


@app.get("/api/smashrun/status")
def api_smashrun_status():
    rec = _token_record() or {}
    connected = bool(rec.get("access_token"))
    out = {
        "connected": connected,
        "expires_at": rec.get("expires_at"),
        "has_refresh_token": bool(rec.get("refresh_token")),
    }
    if connected:
        try:
            token = _require_access_token()
            userinfo = smashrun.get_userinfo(token)
            out["user"] = {
                "username": userinfo.get("username"),
                "id": userinfo.get("id"),
                "firstName": userinfo.get("firstName"),
                "lastName": userinfo.get("lastName"),
            }
        except SmashrunApiError as e:
            return _smashrun_error_response(e)
    return jsonify(out)


@app.post("/api/smashrun/logout")
def api_smashrun_logout():
    rec = _token_record() or {}
    token = str(rec.get("access_token") or "")
    if token:
        try:
            smashrun.revoke_token(token)
        except SmashrunApiError:
            pass
    _clear_smashrun_session()
    return jsonify(ok=True, connected=False)


@app.route(AUTH_CALLBACK_PATH, methods=["GET"])
def oauth_callback() -> object:
    if request.args.get("error"):
        desc = request.args.get("error_description") or request.args.get("error")
        return (
            "<!DOCTYPE html><html lang='en'><meta charset='utf-8'><title>allRunners — Smashrun auth</title>"
            "<body style='font-family:system-ui;margin:2rem'>"
            "<h3>Smashrun connection failed</h3>"
            f"<p>{desc}</p><p><a href='/'>Return to allRunners</a></p>"
            "</body></html>",
            400,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    code = (request.args.get("code") or "").strip()
    state = (request.args.get("state") or "").strip()
    expected_state = (session.get("smashrun_oauth_state") or "").strip()
    cid, csecret = _smashrun_cfg()

    if not cid or not csecret:
        return ("Smashrun client is not configured.", 400)
    if not code:
        return ("Missing authorization code.", 400)
    if not state or state != expected_state:
        return (
            "<!DOCTYPE html><html lang='en'><meta charset='utf-8'><title>allRunners — Smashrun auth</title>"
            "<body style='font-family:system-ui;margin:2rem;max-width:36rem;line-height:1.5'>"
            "<h3>OAuth state mismatch</h3>"
            "<p>The security check between your browser and Smashrun didn’t match. Common causes:</p>"
            "<ul>"
            "<li>You opened allRunners as <strong>localhost</strong> but the callback hit <strong>127.0.0.1</strong> "
            "(or the opposite). Cookies don’t carry over — use one address only.</li>"
            "<li>Set <code>ALLRUNNERS_PUBLIC_ORIGIN</code> in <code>.env</code> (e.g. "
            "<code>http://127.0.0.1:5005</code>) and register that exact redirect URI in Smashrun.</li>"
            "<li>You started login in one browser profile and finished in another.</li>"
            "</ul>"
            "<p><a href='/'>Return to allRunners</a> · "
            "<a href='/api/smashrun/login'>Try Connect again</a></p>"
            "</body></html>",
            400,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    try:
        payload = smashrun.exchange_code_for_token(
            client_id=cid,
            client_secret=csecret,
            code=code,
            redirect_uri=_callback_uri(),
        )
        _save_token_payload(payload)
        session.pop("smashrun_oauth_state", None)
        return redirect("/?smashrun=connected")
    except SmashrunApiError as e:
        cb = _callback_uri()
        app.logger.warning(
            "Smashrun OAuth token exchange failed: %s (upstream status=%s error=%s) callback=%s",
            e.message,
            e.status,
            e.code or (e.payload or {}).get("error"),
            cb,
        )
        # Smashrun usually returns 400 for invalid_grant / redirect_uri mismatch — not a server outage.
        http_status = 502
        if e.status is not None and 400 <= e.status < 500:
            http_status = 400
        elif e.code == "network_error" or e.status is None:
            http_status = 502

        hint = (
            "<p><strong>If you see invalid_grant / redirect_uri mismatch:</strong></p>"
            "<ul>"
            "<li>In the Smashrun developer app, add this exact redirect URI:<br /><code>"
            + cb
            + "</code></li>"
            "<li>Set <code>ALLRUNNERS_PUBLIC_ORIGIN="
            + _public_origin().replace("&", "&amp;")
            + "</code> in <code>.env</code> if your browser URL must stay fixed.</li>"
            "<li>Use the same host for the whole flow (prefer <code>127.0.0.1</code> "
            "<em>or</em> <code>localhost</code>, not both).</li>"
            "<li>Don’t refresh this page — the <code>code</code> is single-use; start Connect again from the app.</li>"
            "</ul>"
        )
        return (
            "<!DOCTYPE html><html lang='en'><meta charset='utf-8'><title>allRunners — Smashrun auth</title>"
            "<body style='font-family:system-ui;margin:2rem;max-width:40rem;line-height:1.5'>"
            "<h3>Smashrun token exchange failed</h3>"
            f"<p>{e.message}</p>"
            + hint
            + "<p><a href='/'>Return to allRunners</a> · "
            "<a href='/api/smashrun/login'>Try Connect again</a></p>"
            "</body></html>",
            http_status,
            {"Content-Type": "text/html; charset=utf-8"},
        )


def _sync_smashrun_into_db(token: str, *, page: int, count: int, from_date_utc: int | None) -> bool:
    raw = smashrun.get_activities(
        token,
        page=max(0, page),
        count=min(max(1, count), 200),
        from_date_utc=from_date_utc,
    )
    for activity in _normalize_activity_list(raw):
        runs_db.upsert_smashrun(_to_local_run(activity))
    return True


@app.get("/api/runs")
def api_runs_list():
    try:
        page = int(request.args.get("page", "0"))
        count = int(request.args.get("count", "100"))
        from_raw = (request.args.get("fromDateUTC") or request.args.get("from_date_utc") or "").strip()
        from_date_utc: int | None = None
        if from_raw:
            from_date_utc = int(from_raw)
    except ValueError:
        return jsonify(error="invalid_pagination"), 400

    smashrun_synced = False
    token = _access_token_or_none()
    if token:
        try:
            smashrun_synced = _sync_smashrun_into_db(
                token, page=page, count=count, from_date_utc=from_date_utc
            )
        except SmashrunApiError:
            smashrun_synced = False

    runs = runs_db.list_runs()
    return jsonify(
        runs=runs,
        count=len(runs),
        fromDateUTC=from_date_utc,
        smashrun_synced=smashrun_synced,
        storage="sqlite",
    )


@app.post("/api/runs")
def api_runs_create():
    data = request.get_json(silent=True) or {}
    try:
        d = float(data.get("distance"))
        t = float(data.get("time"))
    except (TypeError, ValueError):
        return jsonify(error="invalid_input"), 400
    if d <= 0:
        return jsonify(error="distance_must_be_positive"), 400
    if t < 0:
        return jsonify(error="time_cannot_be_negative"), 400
    date_text = str(data.get("date") or "").strip()
    try:
        date_cls.fromisoformat(date_text)
    except ValueError:
        return jsonify(error="invalid_date"), 400

    notes = str(data.get("notes") or "")
    external_id = str(data.get("externalId") or data.get("external_id") or "").strip()
    saved = runs_db.insert_local(
        distance=d,
        time_min=t,
        date=date_text,
        notes=notes,
        external_id=external_id,
    )

    token = _access_token_or_none()
    if not token:
        return jsonify(ok=True, run=saved, saved="local")

    try:
        payload = _to_smashrun_activity({**data, "externalId": saved.get("externalId") or external_id})
        raw = smashrun.create_activity(token, payload)
        created = raw if isinstance(raw, dict) else {}
        mapped = _to_local_run(created) if created else {}
        smashrun_id = mapped.get("id")
        if smashrun_id:
            updated = runs_db.attach_smashrun(
                str(saved["id"]),
                str(smashrun_id),
                mapped.get("_modifiedUtc") if isinstance(mapped.get("_modifiedUtc"), int) else None,
            )
            if updated:
                saved = updated
        return jsonify(ok=True, run=saved, saved="smashrun", smashrun=raw)
    except SmashrunApiError as e:
        return jsonify(ok=True, run=saved, saved="local", smashrun_error=e.message)


@app.get("/api/runs/<activity_id>")
def api_run_detail(activity_id: str):
    local = runs_db.get_run(activity_id)
    token = _access_token_or_none()
    smashrun_id = str((local or {}).get("smashrunId") or "")
    remote_id = smashrun_id or ("" if str(activity_id).startswith("local-") else activity_id)
    if token and remote_id:
        try:
            raw = smashrun.get_activity_detail(token, remote_id)
            if isinstance(raw, dict):
                mapped = _to_local_run(raw)
                runs_db.upsert_smashrun(mapped)
                fresh = runs_db.get_run(activity_id) or runs_db.get_run(str(mapped.get("id") or ""))
                return jsonify(run=fresh or mapped, smashrun=raw)
        except SmashrunApiError:
            if local:
                return jsonify(run=local)
            return jsonify(error="not_found"), 404
    if local:
        return jsonify(run=local)
    return jsonify(error="not_found"), 404


@app.delete("/api/runs/<activity_id>")
def api_run_delete(activity_id: str):
    local = runs_db.get_run(activity_id)
    if not local:
        return jsonify(error="not_found"), 404
    smashrun_id = str(local.get("smashrunId") or "")
    if smashrun_id:
        token = _access_token_or_none()
        if not token:
            return jsonify(
                error="not_connected",
                detail="Connect Smashrun to delete a run that was synced there.",
            ), 401
        try:
            smashrun.delete_activity(token, smashrun_id)
        except SmashrunApiError as e:
            return _smashrun_error_response(e)
    runs_db.delete_run(str(local["id"]))
    return jsonify(ok=True, saved="local")


@app.patch("/api/runs/<activity_id>/notes")
def api_run_patch_notes(activity_id: str):
    data = request.get_json(silent=True) or {}
    notes = str(data.get("notes") or "")
    updated = runs_db.update_notes(activity_id, notes)
    if not updated:
        return jsonify(error="not_found"), 404
    smashrun_id = str(updated.get("smashrunId") or "")
    token = _access_token_or_none()
    if smashrun_id and token:
        try:
            raw = smashrun.patch_activity(token, smashrun_id, {"notes": notes[:800]})
            return jsonify(ok=True, run=updated, saved="smashrun", smashrun=raw)
        except SmashrunApiError as e:
            return jsonify(ok=True, run=updated, saved="local", smashrun_error=e.message)
    return jsonify(ok=True, run=updated, saved="local")


@app.post("/api/runs/<activity_id>/trail-sync")
def api_run_sync_trail(activity_id: str):
    data = request.get_json(silent=True) or {}
    mode = "walk" if str(data.get("mode") or "").strip().lower() == "walk" else "run"
    name = str(data.get("name") or "").strip()
    points = _sanitize_trail_points(data.get("points"))
    if len(points) < 2:
        return jsonify(error="trail_too_short"), 400

    local = runs_db.get_run(activity_id)
    smashrun_id = str((local or {}).get("smashrunId") or "")
    token = _access_token_or_none()
    if not token or not smashrun_id:
        line = _trail_notes_line(name=name, mode=mode, points=points)
        existing = str((local or {}).get("notes") or "")
        marker = "[allRunners trail]"
        kept = [ln for ln in existing.splitlines() if not ln.strip().startswith(marker)]
        kept.append(line)
        merged = "\n".join([ln for ln in kept if ln.strip()]).strip()[:800]
        if local:
            runs_db.update_notes(str(local["id"]), merged)
        return jsonify(ok=True, sync_state="local", strategy="device")

    try:
        # First try a direct route patch. Some Smashrun setups may not accept this schema yet.
        direct_payload = {"route": {"source": "allrunners", "mode": mode, "points": points}}
        try:
            raw = smashrun.patch_activity(token, smashrun_id, direct_payload)
            return jsonify(ok=True, sync_state="uploaded", strategy="direct_patch", smashrun=raw)
        except SmashrunApiError as primary_err:
            app.logger.warning(
                "Trail direct patch failed for activity %s: %s (status=%s code=%s)",
                activity_id,
                primary_err.message,
                primary_err.status,
                primary_err.code,
            )

            # Fallback: persist compact route metadata in notes so trail status can still sync cross-device.
            existing_notes = ""
            try:
                detail = smashrun.get_activity_detail(token, smashrun_id)
                if isinstance(detail, dict):
                    existing_notes = str(detail.get("notes") or "")
            except SmashrunApiError:
                existing_notes = ""

            marker = "[allRunners trail]"
            kept = [ln for ln in existing_notes.splitlines() if not ln.strip().startswith(marker)]
            kept.append(_trail_notes_line(name=name, mode=mode, points=points))
            merged_notes = "\n".join([ln for ln in kept if ln.strip()]).strip()[:800]
            raw2 = smashrun.patch_activity(token, smashrun_id, {"notes": merged_notes})
            if local:
                runs_db.update_notes(str(local["id"]), merged_notes)
            return jsonify(
                ok=True,
                sync_state="notes_fallback",
                strategy="notes",
                direct_error=primary_err.message,
                smashrun=raw2,
            )
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/stats")
def api_stats():
    year_text = (request.args.get("year") or "").strip()
    month_text = (request.args.get("month") or "").strip()
    try:
        year = int(year_text) if year_text else None
        month = int(month_text) if month_text else None
        token = _require_access_token()
        raw = smashrun.get_stats(token, year=year, month=month)
        return jsonify(raw)
    except ValueError:
        return jsonify(error="invalid_year_or_month"), 400
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/userinfo")
def api_userinfo():
    try:
        token = _require_access_token()
        raw = smashrun.get_userinfo(token)
        return jsonify(raw)
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/goals")
def api_goals():
    year_text = (request.args.get("year") or "").strip()
    month_text = (request.args.get("month") or "").strip()
    try:
        year = int(year_text) if year_text else None
        month = int(month_text) if month_text else None
        token = _require_access_token()
        raw = smashrun.get_goals(token, year=year, month=month)
        if raw is None:
            return jsonify(goal=None)
        return jsonify(raw)
    except ValueError:
        return jsonify(error="invalid_year_or_month"), 400
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


def _smashrun_activity_key(activity_id: str) -> str | None:
    local = runs_db.get_run(activity_id)
    if local and local.get("smashrunId"):
        return str(local["smashrunId"])
    if str(activity_id).startswith("local-"):
        return None
    return activity_id


@app.get("/api/runs/<activity_id>/notables")
def api_run_notables(activity_id: str):
    remote_id = _smashrun_activity_key(activity_id)
    token = _access_token_or_none()
    if not remote_id or not token:
        return jsonify([])
    try:
        raw = smashrun.get_notables(token, remote_id)
        return jsonify(raw)
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/runs/<activity_id>/splits/<unit>")
def api_run_splits(activity_id: str, unit: str):
    remote_id = _smashrun_activity_key(activity_id)
    token = _access_token_or_none()
    if not remote_id or not token:
        return jsonify(message="Splits are available after this run syncs to Smashrun.")
    try:
        raw = smashrun.get_splits(token, remote_id, unit=unit)
        return jsonify(raw)
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/runs/<activity_id>/tags")
def api_run_tags(activity_id: str):
    remote_id = _smashrun_activity_key(activity_id)
    token = _access_token_or_none()
    if not remote_id or not token:
        return jsonify(tags=[])
    try:
        raw = smashrun.get_tags(token, remote_id)
        return jsonify(raw)
    except SmashrunApiError as e:
        return _smashrun_error_response(e)


@app.get("/api/weather")
def api_weather():
    try:
        lat = float(request.args.get("lat", ""))
        lon = float(request.args.get("lon", ""))
    except (TypeError, ValueError):
        return jsonify(error="invalid_coordinates"), 400
    if not -90.0 <= lat <= 90.0 or not -180.0 <= lon <= 180.0:
        return jsonify(error="coordinates_out_of_range"), 400
    try:
        data = fetch_current_weather(lat, lon)
        return jsonify(**data)
    except Exception:
        return jsonify(error="weather_unavailable"), 502


@app.get("/api/weather/place")
def api_weather_place():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify(error="query_too_short"), 400
    try:
        data = fetch_weather_for_place(q)
        return jsonify(**data)
    except ValueError as e:
        err = str(e).lower()
        if "not found" in err or "too short" in err:
            return jsonify(error="place_not_found"), 404
        return jsonify(error="bad_query"), 400
    except Exception:
        return jsonify(error="weather_unavailable"), 502


@app.route("/")
def index() -> object:
    if not HTML_FILE.is_file():
        return ("Missing running_tracker_final.html next to allrunners_app.py.", 404)
    return send_file(HTML_FILE, mimetype="text/html; charset=utf-8")


@app.get("/manifest.webmanifest")
def manifest() -> object:
    path = ROOT / "manifest.webmanifest"
    if not path.is_file():
        return ("", 404)
    return send_file(path, mimetype="application/manifest+json; charset=utf-8")


@app.get("/sw.js")
def service_worker() -> object:
    path = ROOT / "sw.js"
    if not path.is_file():
        return ("", 404)
    resp = send_file(path, mimetype="application/javascript; charset=utf-8")
    resp.headers["Service-Worker-Allowed"] = "/"
    return resp


def main() -> None:
    parser = argparse.ArgumentParser(description="allRunners web UI (Flask)")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument("--port", type=int, default=5000, help="Port (default 5000)")
    parser.add_argument("--debug", action="store_true", help="Flask debug mode")
    args = parser.parse_args()
    print(f"allRunners → http://{args.host}:{args.port}/")
    print("OAuth redirect URI:     " + authorization_callback_uri(args.host, args.port))
    print("Authorized JS origin:   " + authorized_javascript_origin(args.host, args.port))
    cid, csecret = _smashrun_cfg()
    if cid and csecret:
        print("Smashrun OAuth client configured.")
    else:
        print("Smashrun OAuth not configured — set SMASHRUN_CLIENT_ID and SMASHRUN_CLIENT_SECRET.")
    if effective_service_key():
        print("Integration API key loaded (SERVICE_API_KEY or OPENAI_API_KEY).")
    else:
        print("No integration API key — set SERVICE_API_KEY in .env or paste one under Settings → Optional.")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
