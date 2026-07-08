"""Terminal running tracker with clear SRP-style organization.

This module implements a lightweight command-line app to log and review runs.
It is designed for readability and learning: each function does one clear task,
and side effects are separated from pure business logic.

Core features:
- Add runs with distance, time, and date.
- View all runs, search by date, and show progress summaries.
- Compute pace, total distance, average pace, and fastest run.
- Save/load runs from a local file.

Run data model:
- A run has three fields:
  - distance: float (miles)
  - time: float (minutes)
  - date: str in YYYY-MM-DD format
- The code represents this with TypedDict `Run` and type alias `Runs = list[Run]`.

Design structure:
1) Pure logic helpers:
   parsing, validation, calculations, formatting, and serialization.
2) UI/I-O helpers:
   terminal input/output and file operations.

Why this matters:
- Testability: pure functions are easy to verify with input/output checks.
- Maintainability: UI flow is simple because logic is delegated to helpers.
- Reliability: data validation is centralized and reused during both input
  handling and file loading.

Run the app:
- `python running_tracker_final.py` — interactive menu (options 1–9)
- `python running_tracker_final.py add -d MILES -t MINUTES --date YYYY-MM-DD [-f FILE]`
- `python running_tracker_final.py list [-f FILE]` · `totals [-f FILE]`
"""

from __future__ import annotations

import argparse
import ast
from datetime import datetime
from typing import TypedDict


class Run(TypedDict):
    """Single run record stored by the tracker."""

    distance: float
    time: float
    date: str


Runs = list[Run]





def pace(distance: float, minutes: float) -> float:
    """Return minutes per mile."""
    return minutes / distance


def pace_label(distance: float, minutes: float) -> str:
    """Return a readable pace string."""
    return f"{pace(distance, minutes):.1f} min/mile"


def is_iso_date(text: str) -> bool:
    """Return True when text matches YYYY-MM-DD."""
    try:
        datetime.strptime(text, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def make_run(distance: float, minutes: float, date_text: str) -> Run:
    """Build a run dictionary from already-validated values."""
    return {"distance": distance, "time": minutes, "date": date_text}


def parse_numbers(distance_text: str, time_text: str) -> tuple[float, float] | None:
    """Parse distance and time inputs into floats."""
    try:
        return float(distance_text.strip()), float(time_text.strip())
    except ValueError:
        return None


def validate_numbers(distance: float, minutes: float) -> str | None:
    """Validate distance/time values and return an error message if invalid."""
    if distance <= 0:
        return "Distance must be greater than zero."
    if minutes < 0:
        return "Time cannot be negative."
    return None


def parse_run(distance_text: str, time_text: str, date_text: str) -> tuple[Run | None, str | None]:
    """Create a validated run from raw text fields."""
    parsed = parse_numbers(distance_text, time_text)
    if parsed is None:
        return None, "Please enter numbers for distance and time."

    distance, minutes = parsed
    number_error = validate_numbers(distance, minutes)
    if number_error is not None:
        return None, number_error

    date_value = date_text.strip()
    if not is_iso_date(date_value):
        return None, "Invalid date. Use YYYY-MM-DD."

    return make_run(distance, minutes, date_value), None


def clean_run(item: object) -> Run | None:
    """Return normalized run data or None when the item is invalid."""
    if not isinstance(item, dict):
        return None
    if "distance" not in item or "time" not in item or "date" not in item:
        return None

    try:
        distance = float(item["distance"])
        minutes = float(item["time"])
        date_value = str(item["date"]).strip()
    except (ValueError, TypeError):
        return None

    if validate_numbers(distance, minutes) is not None:
        return None
    if not is_iso_date(date_value):
        return None
    return make_run(distance, minutes, date_value)


def total_distance(runs: Runs) -> float:
    """Return total miles across all runs."""
    return sum(run["distance"] for run in runs)


def average_pace(runs: Runs) -> float | None:
    """Return weighted average pace (minutes per mile), if possible."""
    miles = total_distance(runs)
    if miles <= 0:
        return None
    return sum(run["time"] for run in runs) / miles


def runs_on_date(runs: Runs, date_value: str) -> Runs:
    """Return runs matching a specific date."""
    return [run for run in runs if run["date"] == date_value]


def fastest_run(runs: Runs) -> Run | None:
    """Return the fastest run by pace, or None when empty."""
    if not runs:
        return None
    return min(runs, key=lambda run: pace(run["distance"], run["time"]))


def run_line(index: int, run: Run) -> str:
    """Format one run as a display line."""
    return (
        f"Run {index}: date={run['date']}, distance={run['distance']} mi, "
        f"time={run['time']} min, pace={pace_label(run['distance'], run['time'])}"
    )


def all_run_lines(runs: Runs) -> list[str]:
    """Format all runs as numbered lines."""
    return [run_line(i, run) for i, run in enumerate(runs, start=1)]


def avg_pace_line(avg: float | None) -> str:
    """Format average pace safely."""
    return "Average pace: N/A" if avg is None else f"Average pace: {avg:.2f} min/mile"


def totals_report(runs: Runs) -> list[str]:
    """Build total distance and average pace lines."""
    if not runs:
        return ["No runs recorded yet."]
    return [f"Total distance: {total_distance(runs):.2f} miles", avg_pace_line(average_pace(runs))]


def progress_report(runs: Runs) -> list[str]:
    """Build progress summary lines."""
    if not runs:
        return ["No runs recorded yet."]
    return [
        f"Number of runs: {len(runs)}",
        f"Total distance: {total_distance(runs):.2f} miles",
        avg_pace_line(average_pace(runs)),
    ]


def serialize_runs(runs: Runs) -> str:
    """Convert runs into a plain text representation."""
    return repr(runs)


def deserialize_runs(text: str) -> tuple[Runs | None, str]:
    """Parse text into cleaned runs; return (runs, error_message)."""
    raw = text.strip()
    if raw == "":
        data = []
    else:
        try:
            data = ast.literal_eval(raw)
        except (ValueError, SyntaxError):
            return None, "File is not valid Python data."

    if not isinstance(data, list):
        return None, "File must contain a Python list of runs."

    cleaned: Runs = []
    for item in data:
        run = clean_run(item)
        if run is not None:
            cleaned.append(run)
    return cleaned, ""


def load_runs_from_path(filename: str) -> tuple[Runs | None, str]:
    """Load runs from a text file. Returns (runs, error_message) with empty error on success."""
    try:
        with open(filename, "r", encoding="utf-8") as file_obj:
            return deserialize_runs(file_obj.read())
    except FileNotFoundError:
        return None, "File not found."
    except OSError:
        return None, "Could not read that file."


def save_runs_to_path(filename: str, runs: Runs) -> str | None:
    """Persist runs to a file. Returns None on success or an error message on failure."""
    try:
        with open(filename, "w", encoding="utf-8") as file_obj:
            file_obj.write(serialize_runs(runs))
    except OSError:
        return "Could not write that file."
    return None


def show(lines: list[str]) -> None:
    """Print each line in order."""
    for line in lines:
        print(line)


def ask(prompt: str) -> str:
    """Read one trimmed input line from the terminal."""
    return input(prompt).strip()


def add_run_ui(runs: Runs) -> None:
    """Handle interactive add-run flow."""
    run, error = parse_run(
        ask("Distance (miles): "),
        ask("Time (minutes): "),
        ask("Date (YYYY-MM-DD): "),
    )
    if error is not None:
        print(error)
        return

    runs.append(run)
    print("Run added.")
    print("Pace: " + pace_label(run["distance"], run["time"]))


def view_runs_ui(runs: Runs) -> None:
    """Display all runs."""
    show(all_run_lines(runs) if runs else ["No runs recorded yet."])


def totals_ui(runs: Runs) -> None:
    """Display totals report."""
    show(totals_report(runs))


def search_date_ui(runs: Runs) -> None:
    """Display runs for one date."""
    if not runs:
        print("No runs recorded yet.")
        return

    date_value = ask("Search date (YYYY-MM-DD): ")
    if not is_iso_date(date_value):
        print("Invalid date. Use YYYY-MM-DD.")
        return

    matches = runs_on_date(runs, date_value)
    show(all_run_lines(matches) if matches else ["No runs on that date."])


def save_runs_ui(runs: Runs) -> None:
    """Save runs to a user-provided file."""
    filename = ask("Save filename (example: my_runs.pydata): ")
    if not filename:
        print("Filename cannot be empty.")
        return

    err = save_runs_to_path(filename, runs)
    if err is not None:
        print(err)
        return

    print(f"Saved {len(runs)} run(s) to '{filename}'.")


def load_runs_ui(runs: Runs) -> None:
    """Load runs from a user-provided file and replace current runs."""
    filename = ask("Load filename (example: my_runs.pydata): ")
    if not filename:
        print("Filename cannot be empty.")
        return

    loaded, error = load_runs_from_path(filename)
    if loaded is None:
        print(error)
        return

    runs.clear()
    runs.extend(loaded)
    print(f"Loaded {len(runs)} run(s) from '{filename}'.")


def fastest_run_ui(runs: Runs) -> None:
    """Display the fastest run."""
    run = fastest_run(runs)
    if run is None:
        print("No runs recorded yet.")
        return

    print("Fastest run:")
    print(run_line(1, run))


def progress_ui(runs: Runs) -> None:
    """Display progress summary."""
    show(progress_report(runs))


def print_menu() -> None:
    """Display main menu options."""
    print("\n=== Running Tracker (Final) ===")
    print("1) Add a run")
    print("2) View all runs")
    print("3) Total distance and average pace")
    print("4) Search runs by date")
    print("5) Save runs to file (Python data)")
    print("6) Load runs from file (Python data)")
    print("7) Fastest run")
    print("8) Progress summary")
    print("9) Quit")


def run_choice(choice: str, runs: Runs) -> bool:
    """Execute one menu choice. Return False when the app should stop."""
    if choice == "1":
        add_run_ui(runs)
    elif choice == "2":
        view_runs_ui(runs)
    elif choice == "3":
        totals_ui(runs)
    elif choice == "4":
        search_date_ui(runs)
    elif choice == "5":
        save_runs_ui(runs)
    elif choice == "6":
        load_runs_ui(runs)
    elif choice == "7":
        fastest_run_ui(runs)
    elif choice == "8":
        progress_ui(runs)
    elif choice == "9":
        print("Goodbye!")
        return False
    else:
        print("Please enter a number from 1 to 9.")
    return True


def main_interactive() -> None:
    """Run the terminal menu application loop."""
    runs: Runs = []
    keep_running = True
    while keep_running:
        print_menu()
        keep_running = run_choice(ask("Choice (1-9): "), runs)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Terminal running tracker — interactive menu by default, or non-interactive subcommands.",
    )
    sub = parser.add_subparsers(dest="command", metavar="COMMAND")

    add_p = sub.add_parser("add", help="Add one run (append to --file when given)")
    add_p.add_argument("--distance", "-d", required=True, help="Distance in miles")
    add_p.add_argument("-t", "--time", "--minutes", required=True, dest="time", help="Duration in minutes")
    add_p.add_argument("--date", required=True, help="Date as YYYY-MM-DD")
    add_p.add_argument("--file", "-f", help="Python-data file: load, append this run, save")

    list_p = sub.add_parser("list", help="Print all runs (from --file if given)")
    list_p.add_argument("--file", "-f", help="Python-data runs file")

    totals_p = sub.add_parser("totals", help="Print total distance and average pace")
    totals_p.add_argument("--file", "-f", help="Python-data runs file")

    return parser


def cli_add(args: argparse.Namespace) -> int:
    run, err = parse_run(str(args.distance), str(args.time), str(args.date))
    if err is not None:
        print(err)
        return 1

    runs: Runs = []
    if args.file:
        loaded, msg = load_runs_from_path(args.file)
        if loaded is None:
            print(msg)
            return 2
        runs = loaded

    runs.append(run)
    print("Run added.")
    print("Pace: " + pace_label(run["distance"], run["time"]))
    if args.file:
        werr = save_runs_to_path(args.file, runs)
        if werr is not None:
            print(werr)
            return 2
        print(f"Saved {len(runs)} run(s) to '{args.file}'.")
    else:
        print("(Not saved — pass --file PATH to persist.)")
    return 0


def cli_list(args: argparse.Namespace) -> int:
    runs: Runs = []
    if args.file:
        loaded, msg = load_runs_from_path(args.file)
        if loaded is None:
            print(msg)
            return 2
        runs = loaded
    show(all_run_lines(runs) if runs else ["No runs recorded yet."])
    return 0


def cli_totals(args: argparse.Namespace) -> int:
    runs: Runs = []
    if args.file:
        loaded, msg = load_runs_from_path(args.file)
        if loaded is None:
            print(msg)
            return 2
        runs = loaded
    show(totals_report(runs))
    return 0


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command is None:
        main_interactive()
        return
    if args.command == "add":
        raise SystemExit(cli_add(args))
    if args.command == "list":
        raise SystemExit(cli_list(args))
    if args.command == "totals":
        raise SystemExit(cli_totals(args))
    raise SystemExit(2)


if __name__ == "__main__":
    main()
