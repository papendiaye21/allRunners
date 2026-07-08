# allRunners

A full-stack running tracker for logging workouts, syncing with Smashrun, and viewing pace, stats, goals, and weather in one place.

## Features

- **Run logging:** Add runs with distance, time, and date; preview pace before saving.
- **Smashrun sync:** OAuth 2.0 login to load, create, update, and delete activities from your Smashrun account.
- **Dashboard:** Stats, goals, splits, filters, sorting, and incremental sync for your run list.
- **Map & trails:** Record GPS trails in the browser; trail data stays on your device (`localStorage`).
- **Weather:** Current conditions via Open-Meteo with place search and geocoding fallbacks.
- **PWA:** Installable web app with offline shell caching via a service worker.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla SPA)
- **Backend:** Python, Flask
- **APIs:** Smashrun OAuth/API, Open-Meteo weather
- **Storage:** Flask sessions (OAuth tokens), browser `localStorage` (trails)

## Installation

To run this project locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/allRunners.git
   cd allRunners
   ```

2. Create a virtual environment and install dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Copy environment variables and add your keys:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `SMASHRUN_CLIENT_ID`, `SMASHRUN_CLIENT_SECRET`, and optionally `FLASK_SECRET_KEY`.

4. Start the app:

   ```bash
   python launch_allrunners.py
   ```

5. Open [http://127.0.0.1:5002/](http://127.0.0.1:5002/) in your browser.

## CLI (optional)

The project also includes a terminal-based tracker:

```bash
python running_tracker_final.py
```

## License

MIT — see [LICENSE](LICENSE).
