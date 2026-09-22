"""SQLite store for runs saved on this machine.

Smashrun stays optional. A run is stored here first, then linked to a Smashrun
activity id when sync succeeds.
"""

from __future__ import annotations

import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()
_PATH: Path | None = None

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    distance REAL NOT NULL,
    time_min REAL NOT NULL,
    date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'local',
    external_id TEXT NOT NULL DEFAULT '',
    smashrun_id TEXT,
    modified_utc INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_date ON runs(date);
CREATE INDEX IF NOT EXISTS idx_runs_smashrun ON runs(smashrun_id);
CREATE INDEX IF NOT EXISTS idx_runs_external ON runs(external_id);
"""


def init(path: Path) -> None:
    global _PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    _PATH = path
    with _LOCK:
        conn = _connect()
        try:
            conn.executescript(_SCHEMA)
            conn.commit()
        finally:
            conn.close()


def _connect() -> sqlite3.Connection:
    if _PATH is None:
        raise RuntimeError("runs database is not initialized")
    conn = sqlite3.connect(_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_run(row: sqlite3.Row) -> dict[str, Any]:
    smashrun_id = row["smashrun_id"]
    out: dict[str, Any] = {
        "id": row["id"],
        "distance": row["distance"],
        "time": row["time_min"],
        "date": row["date"],
        "notes": row["notes"] or "",
        "source": row["source"] or "local",
        "externalId": row["external_id"] or "",
    }
    if smashrun_id:
        out["smashrunId"] = smashrun_id
    if row["modified_utc"] is not None:
        out["_modifiedUtc"] = int(row["modified_utc"])
    return out


def list_runs() -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                "SELECT * FROM runs ORDER BY date DESC, created_at DESC, id DESC"
            ).fetchall()
        finally:
            conn.close()
    return [_row_to_run(row) for row in rows]


def get_run(run_id: str) -> dict[str, Any] | None:
    key = (run_id or "").strip()
    if not key:
        return None
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                """
                SELECT * FROM runs
                WHERE id = ? OR smashrun_id = ?
                LIMIT 1
                """,
                (key, key),
            ).fetchone()
        finally:
            conn.close()
    return _row_to_run(row) if row else None


def insert_local(
    *,
    distance: float,
    time_min: float,
    date: str,
    notes: str,
    external_id: str,
) -> dict[str, Any]:
    run_id = "local-" + uuid.uuid4().hex[:16]
    now = int(time.time())
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO runs (
                    id, distance, time_min, date, notes, source,
                    external_id, smashrun_id, modified_utc, created_at
                ) VALUES (?, ?, ?, ?, ?, 'local', ?, NULL, ?, ?)
                """,
                (
                    run_id,
                    round(float(distance), 2),
                    round(float(time_min), 2),
                    date,
                    (notes or "")[:800],
                    (external_id or "")[:120],
                    now,
                    now,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        finally:
            conn.close()
    return _row_to_run(row)


def attach_smashrun(local_id: str, smashrun_id: str, modified_utc: int | None) -> dict[str, Any] | None:
    now = int(modified_utc or time.time())
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                UPDATE runs
                SET source = 'smashrun', smashrun_id = ?, modified_utc = ?
                WHERE id = ?
                """,
                (str(smashrun_id), now, local_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM runs WHERE id = ?", (local_id,)).fetchone()
        finally:
            conn.close()
    return _row_to_run(row) if row else None


def update_notes(run_id: str, notes: str) -> dict[str, Any] | None:
    now = int(time.time())
    text = (notes or "")[:800]
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.execute(
                """
                UPDATE runs
                SET notes = ?, modified_utc = ?
                WHERE id = ? OR smashrun_id = ?
                """,
                (text, now, run_id, run_id),
            )
            conn.commit()
            if cur.rowcount == 0:
                return None
            row = conn.execute(
                "SELECT * FROM runs WHERE id = ? OR smashrun_id = ? LIMIT 1",
                (run_id, run_id),
            ).fetchone()
        finally:
            conn.close()
    return _row_to_run(row) if row else None


def delete_run(run_id: str) -> bool:
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.execute(
                "DELETE FROM runs WHERE id = ? OR smashrun_id = ?",
                (run_id, run_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


def upsert_smashrun(run: dict[str, Any]) -> None:
    """Insert or refresh a Smashrun activity without dropping a newer local note."""
    smashrun_id = str(run.get("id") or "").strip()
    if not smashrun_id:
        return
    external_id = str(run.get("externalId") or "")[:120]
    distance = round(float(run.get("distance") or 0), 2)
    time_min = round(float(run.get("time") or 0), 2)
    date = str(run.get("date") or "")[:10]
    incoming_notes = str(run.get("notes") or "")[:800]
    modified = run.get("_modifiedUtc")
    modified_utc = int(modified) if isinstance(modified, (int, float)) else int(time.time())
    now = int(time.time())

    with _LOCK:
        conn = _connect()
        try:
            row = None
            if external_id:
                row = conn.execute(
                    """
                    SELECT * FROM runs
                    WHERE smashrun_id = ? OR id = ? OR external_id = ?
                    LIMIT 1
                    """,
                    (smashrun_id, smashrun_id, external_id),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT * FROM runs WHERE smashrun_id = ? OR id = ? LIMIT 1",
                    (smashrun_id, smashrun_id),
                ).fetchone()

            if row is None:
                conn.execute(
                    """
                    INSERT INTO runs (
                        id, distance, time_min, date, notes, source,
                        external_id, smashrun_id, modified_utc, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'smashrun', ?, ?, ?, ?)
                    """,
                    (
                        smashrun_id,
                        distance,
                        time_min,
                        date,
                        incoming_notes,
                        external_id,
                        smashrun_id,
                        modified_utc,
                        now,
                    ),
                )
            else:
                local_modified = row["modified_utc"] or 0
                notes = incoming_notes
                if local_modified > modified_utc and (row["notes"] or ""):
                    notes = row["notes"]
                elif not incoming_notes and row["notes"]:
                    notes = row["notes"]
                conn.execute(
                    """
                    UPDATE runs
                    SET distance = ?, time_min = ?, date = ?, notes = ?,
                        source = 'smashrun', external_id = ?,
                        smashrun_id = ?, modified_utc = ?
                    WHERE id = ?
                    """,
                    (
                        distance,
                        time_min,
                        date or row["date"],
                        notes,
                        external_id or row["external_id"] or "",
                        smashrun_id,
                        max(modified_utc, int(local_modified or 0)),
                        row["id"],
                    ),
                )
            conn.commit()
        finally:
            conn.close()
