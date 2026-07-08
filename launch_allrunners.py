#!/usr/bin/env python3
"""
Launch the allRunners web UI (Flask).

Use this file as the entry point from another IDE: Run / Debug `launch_allrunners.py`.

Requires the project virtualenv (or Flask installed):

  .venv/bin/python launch_allrunners.py

Then open http://127.0.0.1:5002/ in your browser (default port avoids macOS AirPlay on 5000).
"""

from __future__ import annotations

import argparse

from allrunners_app import app, effective_service_key
from auth_urls import authorization_callback_uri, authorized_javascript_origin


def main() -> None:
    parser = argparse.ArgumentParser(description="Launch allRunners web UI")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument(
        "--port",
        type=int,
        default=5002,
        help="Port (default 5002; use 5000 if nothing else is listening)",
    )
    parser.add_argument("--debug", action="store_true", help="Flask debug / auto-reload")
    args = parser.parse_args()
    print(f"allRunners → http://{args.host}:{args.port}/")
    print("OAuth redirect URI:     " + authorization_callback_uri(args.host, args.port))
    print("Authorized JS origin:   " + authorized_javascript_origin(args.host, args.port))
    if app.config.get("SMASHRUN_CLIENT_ID") and app.config.get("SMASHRUN_CLIENT_SECRET"):
        print("Smashrun OAuth configured (SMASHRUN_CLIENT_ID/SMASHRUN_CLIENT_SECRET).")
    else:
        print("Smashrun OAuth missing — add SMASHRUN_CLIENT_ID and SMASHRUN_CLIENT_SECRET to .env.")
    if app.config.get("ALLRUNNERS_API_KEY"):
        print("API key loaded (ALLRUNNERS_API_KEY).")
    else:
        print("No API key in .env — add ALLRUNNERS_API_KEY or ignore if you do not use an API.")
    if effective_service_key():
        print("Integration API key loaded (SERVICE_API_KEY or OPENAI_API_KEY).")
    else:
        print(
            "No integration API key — set SERVICE_API_KEY in .env or use Settings → Optional."
        )
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
