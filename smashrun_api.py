"""
Smashrun OAuth + API client (Python only).
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


AUTH_BASE = "https://secure.smashrun.com"
API_BASE = "https://api.smashrun.com"


class SmashrunApiError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        code: str | None = None,
        retryable: bool = False,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.retryable = retryable
        self.payload = payload or {}


def _json_loads(data: bytes) -> Any:
    text = data.decode("utf-8", errors="replace").strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


def _request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout_s: float = 20.0,
) -> tuple[int, Any]:
    req = urllib.request.Request(url, method=method, headers=headers or {}, data=body)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            status = int(getattr(resp, "status", 200))
            return status, _json_loads(resp.read())
    except urllib.error.HTTPError as e:
        status = int(getattr(e, "code", 500))
        payload = _json_loads(e.read())
        msg = str(payload.get("error_description") or payload.get("error") or f"http_{status}")
        retryable = status in (408, 425, 429, 500, 502, 503, 504)
        raise SmashrunApiError(
            msg,
            status=status,
            code=str(payload.get("error") or ""),
            retryable=retryable,
            payload=payload if isinstance(payload, dict) else {"raw": payload},
        ) from e
    except urllib.error.URLError as e:
        raise SmashrunApiError(
            f"network_error: {e.reason}",
            retryable=True,
            code="network_error",
        ) from e


def _with_query(url: str, query: dict[str, Any] | None) -> str:
    if not query:
        return url
    q = {k: v for k, v in query.items() if v is not None and v != ""}
    return url + ("?" + urllib.parse.urlencode(q) if q else "")


@dataclass
class SmashrunOAuthConfig:
    client_id: str
    client_secret: str
    redirect_uri: str


class SmashrunClient:
    def __init__(self, *, timeout_s: float = 20.0, retries: int = 2) -> None:
        self.timeout_s = timeout_s
        self.retries = max(0, retries)

    def build_authorize_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        state: str,
        scope: str = "read_activity write_activity",
        response_type: str = "code",
    ) -> str:
        params = urllib.parse.urlencode(
            {
                "client_id": client_id,
                "scope": scope,
                "redirect_uri": redirect_uri,
                "response_type": response_type,
                "state": state,
            }
        )
        return f"{AUTH_BASE}/oauth2/authenticate?{params}"

    def exchange_code_for_token(
        self,
        *,
        client_id: str,
        client_secret: str,
        code: str,
        redirect_uri: str,
    ) -> dict[str, Any]:
        # Token endpoint (RFC 6749) uses grant_type, code, redirect_uri, client credentials — not `state`.
        form = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }
        body = urllib.parse.urlencode(form).encode("utf-8")
        status, payload = _request(
            "POST",
            f"{AUTH_BASE}/oauth2/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=body,
            timeout_s=self.timeout_s,
        )
        if status < 200 or status >= 300 or not isinstance(payload, dict):
            err = str(
                (payload or {}).get("error_description")
                or (payload or {}).get("error")
                or f"token_http_{status}"
            )
            raise SmashrunApiError(
                err,
                status=status,
                code="token_exchange_failed",
                payload=payload if isinstance(payload, dict) else {"raw": payload},
            )
        return payload

    def refresh_access_token(
        self,
        *,
        client_id: str,
        client_secret: str,
        refresh_token: str,
    ) -> dict[str, Any]:
        form = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        }
        body = urllib.parse.urlencode(form).encode("utf-8")
        status, payload = _request(
            "POST",
            f"{AUTH_BASE}/oauth2/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=body,
            timeout_s=self.timeout_s,
        )
        if status < 200 or status >= 300 or not isinstance(payload, dict):
            raise SmashrunApiError("token_refresh_failed", status=status, payload={"raw": payload})
        return payload

    def _api_call(
        self,
        method: str,
        path: str,
        *,
        access_token: str,
        query: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        url = _with_query(API_BASE + path, query)
        body = None
        headers = {"Authorization": f"Bearer {access_token}"}
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        last_err: SmashrunApiError | None = None
        for attempt in range(self.retries + 1):
            try:
                _, payload = _request(
                    method,
                    url,
                    headers=headers,
                    body=body,
                    timeout_s=self.timeout_s,
                )
                return payload
            except SmashrunApiError as e:
                last_err = e
                if not e.retryable or attempt >= self.retries:
                    raise
                # Tiny exponential backoff for transient failures/rate limits.
                time.sleep(0.35 * (2**attempt))
        if last_err is not None:
            raise last_err
        raise SmashrunApiError("unknown_api_error")

    def get_auth_token_info(self, access_token: str) -> dict[str, Any]:
        out = self._api_call("GET", f"/v1/auth/{urllib.parse.quote(access_token)}", access_token=access_token)
        if not isinstance(out, dict):
            raise SmashrunApiError("invalid_auth_response")
        return out

    def revoke_token(self, access_token: str) -> dict[str, Any]:
        out = self._api_call("DELETE", f"/v1/auth/{urllib.parse.quote(access_token)}", access_token=access_token)
        return out if isinstance(out, dict) else {"ok": True}

    def get_userinfo(self, access_token: str) -> dict[str, Any]:
        out = self._api_call("GET", "/v1/my/userinfo", access_token=access_token)
        if not isinstance(out, dict):
            raise SmashrunApiError("invalid_userinfo_response")
        return out

    def get_activities(
        self,
        access_token: str,
        *,
        page: int = 0,
        count: int = 50,
        from_date_utc: int | None = None,
    ) -> Any:
        query: dict[str, Any] = {"page": page, "count": count}
        if from_date_utc is not None:
            query["fromDateUTC"] = from_date_utc
        return self._api_call("GET", "/v1/my/activities/search", access_token=access_token, query=query)

    def get_activity_detail(self, access_token: str, activity_id: int | str) -> Any:
        return self._api_call("GET", f"/v1/my/activities/{activity_id}", access_token=access_token)

    def create_activity(self, access_token: str, activity: dict[str, Any]) -> Any:
        return self._api_call(
            "POST",
            "/v1/my/activities/",
            access_token=access_token,
            json_body=activity,
        )

    def update_activity(self, access_token: str, activity: dict[str, Any]) -> Any:
        return self._api_call(
            "PUT",
            "/v1/my/activities/",
            access_token=access_token,
            json_body=activity,
        )

    def patch_activity(self, access_token: str, activity_id: int | str, patch_obj: dict[str, Any]) -> Any:
        return self._api_call(
            "PATCH",
            f"/v1/my/activities/{activity_id}",
            access_token=access_token,
            json_body=patch_obj,
        )

    def delete_activity(self, access_token: str, activity_id: int | str) -> Any:
        return self._api_call("DELETE", f"/v1/my/activities/{activity_id}", access_token=access_token)

    def get_stats(self, access_token: str, year: int | None = None, month: int | None = None) -> Any:
        path = "/v1/my/stats"
        if year is not None and month is not None:
            path = f"/v1/my/stats/{year}/{month}"
        elif year is not None:
            path = f"/v1/my/stats/{year}"
        return self._api_call("GET", path, access_token=access_token)

    def get_splits(self, access_token: str, activity_id: int | str, unit: str = "km") -> Any:
        u = "mi" if str(unit).lower() == "mi" else "km"
        return self._api_call("GET", f"/v1/my/activities/{activity_id}/splits/{u}", access_token=access_token)

    def get_tags(self, access_token: str, activity_id: int | str) -> Any:
        return self._api_call("GET", f"/v1/my/activities/{activity_id}/tags", access_token=access_token)

    def get_notables(self, access_token: str, activity_id: int | str) -> Any:
        return self._api_call("GET", f"/v1/my/activities/{activity_id}/notables", access_token=access_token)

    def get_goals(self, access_token: str, *, year: int | None = None, month: int | None = None) -> Any:
        path = "/v1/my/goals"
        if year is not None and month is not None:
            path = f"/v1/my/goals/{year}/{month}"
        elif year is not None:
            path = f"/v1/my/goals/{year}"
        return self._api_call("GET", path, access_token=access_token)
