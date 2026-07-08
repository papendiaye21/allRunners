"""
OAuth / OIDC URLs for allRunners.

Register these with your identity provider (Google, GitHub, Auth0, Supabase, etc.).

• Redirect URI — full URL ending in AUTH_CALLBACK_PATH (exact match).
• Authorized JavaScript origin — scheme + host + port only (no path).
"""

from __future__ import annotations

# Single canonical path — do not change once users have configured IdPs.
AUTH_CALLBACK_PATH = "/auth/callback"


def public_base_url(host: str = "127.0.0.1", port: int = 5002, tls: bool = False) -> str:
    scheme = "https" if tls else "http"
    return f"{scheme}://{host}:{port}"


def authorization_callback_uri(host: str = "127.0.0.1", port: int = 5002, tls: bool = False) -> str:
    """Full redirect URI to paste under “Authorized redirect URIs” in the IdP console."""
    return public_base_url(host, port, tls) + AUTH_CALLBACK_PATH


def authorized_javascript_origin(host: str = "127.0.0.1", port: int = 5002, tls: bool = False) -> str:
    """Origin to paste under “Authorized JavaScript origins” (Google Cloud, etc.)."""
    return public_base_url(host, port, tls)
