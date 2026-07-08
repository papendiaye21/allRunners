# `running_tracker_final.py` Documentation

## Overview

`running_tracker_final.py` is a terminal-based running log app.  
It lets a user:

- add runs (`distance`, `time`, `date`)
- view all runs
- search by date
- show totals/progress
- find fastest run
- save/load runs from a local file

The file is organized with a clear separation of concerns:

- **Pure logic functions**: parsing, validation, calculations, formatting, serialization.
- **UI/I-O functions**: terminal input/output and file operations.

Run it with:

```bash
python running_tracker_final.py
```

---

## Data Model

### `Run` (`TypedDict`)

Each run is a dictionary with:

- `distance: float` (miles)
- `time: float` (minutes)
- `date: str` (`YYYY-MM-DD`)

### `Runs`

`Runs = list[Run]`  
A list that stores all runs in memory during app execution.

---

## Libraries Used

- `ast`  
Used for `ast.literal_eval()` in file loading. It safely parses Python literals (list/dict/number/string) from text.
- `datetime`  
Used to validate dates with `datetime.strptime(..., "%Y-%m-%d")`.
- `typing.TypedDict`  
Documents the expected structure of a run dictionary.
- `from __future__ import annotations`  
Improves typing behavior and keeps type hints clean.

---

## Function Groups

## 1) Core calculations and validation (pure)

- `pace(distance, minutes)`  
Returns minutes per mile.
- `pace_label(distance, minutes)`  
Returns formatted pace text like `8.3 min/mile`.
- `is_iso_date(text)`  
Returns `True` if date is valid `YYYY-MM-DD`.
- `parse_numbers(distance_text, time_text)`  
Parses two strings to floats.
- `validate_numbers(distance, minutes)`  
Checks business rules (`distance > 0`, `minutes >= 0`).
- `make_run(distance, minutes, date_text)`  
Builds a normalized run dictionary.
- `parse_run(distance_text, time_text, date_text)`  
Full parse+validate pipeline from raw user text.
- `clean_run(item)`  
Sanitizes a loaded object into a valid `Run` or returns `None`.

---

## 2) Run analytics (pure)

- `total_distance(runs)`  
Sum of all distances.
- `average_pace(runs)`  
Weighted average pace (`total time / total distance`).
- `runs_on_date(runs, date_value)`  
Filters runs by exact date.
- `fastest_run(runs)`  
Returns run with lowest pace.

---

## 3) Formatting and report builders (pure)

- `run_line(index, run)`  
Formats one run line for display.
- `all_run_lines(runs)`  
Formats all runs for display.
- `avg_pace_line(avg)`  
Formats average pace, handles `None` as `N/A`.
- `totals_report(runs)`  
Report lines for total distance + average pace.
- `progress_report(runs)`  
Report lines for count + total distance + average pace.

---

## 4) Serialization (pure)

- `serialize_runs(runs)`  
Converts runs list to string with `repr`.
- `deserialize_runs(text)`  
Converts file text back to cleaned runs, with error handling.

---

## 5) UI/I-O functions (side effects)

- `show(lines)`  
Prints list of lines.
- `ask(prompt)`  
Reads one user input line.
- `add_run_ui(runs)`  
Interactive add flow.
- `view_runs_ui(runs)`  
Displays all runs.
- `totals_ui(runs)`  
Displays totals report.
- `search_date_ui(runs)`  
Interactive date search.
- `save_runs_ui(runs)`  
Saves runs to file.
- `load_runs_ui(runs)`  
Loads runs from file and replaces current list.
- `fastest_run_ui(runs)`  
Displays fastest run.
- `progress_ui(runs)`  
Displays progress report.

---

## Menu and App Flow

- `print_menu()` prints options `1..9`.
- `run_choice(choice, runs)` dispatches the selected action.
- `main()` runs the app loop until user chooses Quit.

Entry point:

- `if __name__ == "__main__": main()`

---

## Notes

- The app is intentionally simple and educational.
- Validation is centralized and reused.
- Most core functions are pure, making the logic easy to test and reason about.
- File format for save/load is Python literal text (list of run dictionaries).

