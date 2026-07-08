"""
Load secrets from environment variables or a local ``.env`` file.

1. Copy ``.env.example`` to ``.env`` in this folder.
2. Put secrets on ``ALLRUNNERS_API_KEY=`` or ``SERVICE_API_KEY=`` (or legacy ``OPENAI_API_KEY=``).
3. Never commit ``.env`` (it is listed in ``.gitignore``).

Usage:

    from config import api_key, service_api_key, smashrun_client_id, smashrun_client_secret
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")


def api_key() -> str | None:
    """API key from ``ALLRUNNERS_API_KEY`` (.env or OS environment)."""
    val = os.environ.get("ALLRUNNERS_API_KEY", "").strip()
    return val or None


def service_api_key() -> str | None:
    """
    Generic integration key (weather, maps, AI, etc.).

    Reads ``SERVICE_API_KEY``, then falls back to ``OPENAI_API_KEY`` for older .env files.
    """
    for env_name in ("SERVICE_API_KEY", "OPENAI_API_KEY"):
        val = os.environ.get(env_name, "").strip()
        if val:
            return val
    return None


def openai_api_key() -> str | None:
    """Alias for ``service_api_key()`` (backward compatibility)."""
    return service_api_key()


def smashrun_client_id() -> str | None:
    """OAuth client id for Smashrun code flow."""
    for key in ("SMASHRUN_CLIENT_ID", "SMASHRUN_OAUTH_CLIENT_ID"):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return None


def smashrun_client_secret() -> str | None:
    """OAuth client secret for Smashrun code flow."""
    for key in ("SMASHRUN_CLIENT_SECRET", "SMASHRUN_OAUTH_CLIENT_SECRET"):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return None
