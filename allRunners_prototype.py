"""
  Add a run (distance + time)
      prompt_for_distance_and_time() reads input,
      add_run_to_list() saves one dict onto the list,
      add_run(runs) wires those together for menu option 1 and prints your pace
      at the end of that run (pace = time in minutes ÷ distance in miles).

  Store runs in a list
      main() builds runs = []. Each item is a dict with keys "distance" and "time".

  Calculate pace
      pace_minutes_per_mile() does the math;
      format_pace_text() turns it into text;
      view_all_runs() uses format_pace_text when printing each run;
      add_run() also uses format_pace_text right after you save a run.

  View all runs
      view_all_runs(runs) for menu option 2.
      view_runs is the same function (alias) if your instructor uses that name.

  Menu system
      print_welcome() once; then print_main_menu(runs) shows borders, run count,
      options 1–3; main() loops until you quit.
      

  FUNCTIONS (READING ORDER IN THIS FILE)
  pace_minutes_per_mile, format_pace_text: pace math and text
  add_run_to_list: append one dict to runs
  prompt_for_distance_and_time, add_run: add flow for menu 1
  view_all_runs, view_runs: menu 2 (same function)
  menu_border_line, menu_row, print_welcome: boxed menu helpers
  print_main_menu, read_menu_choice, main: menu loop; option 3 quits


"""



# 1) CALCULATE PACE
#    Pace = how many minutes it takes you to cover one mile.
#    Formula: pace (min/mile) = time (minutes) ÷ distance (miles)

def pace_minutes_per_mile(distance_miles, time_minutes):
    """Return pace in minutes per mile. Caller must ensure distance_miles > 0."""
    return time_minutes / distance_miles


def format_pace_text(distance_miles, time_minutes):
    """One readable pace line (rounded to one decimal place)."""
    pace = pace_minutes_per_mile(distance_miles, time_minutes)
    return str(round(pace, 1)) + " min/mile"



# 2) STORE RUNS IN A LIST
#    Each run is one dictionary with keys "distance" and "time".
#    The list itself lives in main() as runs — we pass runs into functions
#    so those functions can read or append to the same list.

def add_run_to_list(runs, distance_miles, time_minutes):
    """Append one new run dict to the runs list (does not print anything)."""
    runs.append({"distance": distance_miles, "time": time_minutes})



# 3) ADD A RUN — ask the user for distance + time, then save to the list

def prompt_for_distance_and_time():
    """
    Ask for distance (miles) and time (minutes).
    Returns (distance, time) as floats, or None if input is invalid.
    """
    try:
        distance = float(input("Distance (miles): ").strip())
        time_min = float(input("Time (minutes): ").strip())
    except ValueError:
        print("Invalid input. Please enter numbers.")
        return None

    if distance <= 0:
        print("Distance must be greater than zero.")
        return None
    if time_min < 0:
        print("Time cannot be negative.")
        return None

    return distance, time_min


def add_run(runs):
    """Menu action 1: prompt for a run, save it, then print pace for that run."""
    values = prompt_for_distance_and_time()
    if values is None:
        return
    distance, time_min = values
    add_run_to_list(runs, distance, time_min)
    pace_str = format_pace_text(distance, time_min)
    print("Run added successfully!")
    print(
        "Your pace this run: "
        + pace_str
        + " (based on "
        + str(distance)
        + " mi in "
        + str(time_min)
        + " min)."
    )


# 4) VIEW ALL RUNS — print every stored run and its pace
def view_all_runs(runs):
    """Print each run with distance, time, and calculated pace (menu option 2)."""
    if len(runs) == 0:
        print("No runs recorded yet.")
        return

    for i, run in enumerate(runs, start=1):
        d = run["distance"]
        t = run["time"]
        pace_str = format_pace_text(d, t)
        print(
            "Run "
            + str(i)
            + ": Distance = "
            + str(d)
            + " miles, Time = "
            + str(t)
            + " minutes, Pace = "
            + pace_str
        )


# Alias:
view_runs = view_all_runs



# 5) MENU SYSTEM — show options and loop until the user quits
MENU_WIDTH = 46


def menu_border_line():
    return "  +" + "-" * MENU_WIDTH + "+"


def menu_row(text):
    """One line inside the box: plain text padded to MENU_WIDTH."""
    line = text
    if len(line) > MENU_WIDTH:
        line = line[:MENU_WIDTH]
    return "  |" + line.ljust(MENU_WIDTH) + "|"


def print_welcome():
    """Shown once when the program starts."""
    print()
    print(menu_border_line())
    print(menu_row("  allRunners — prototype (terminal)"))
    print(menu_row("  Miles & minutes -> pace (minutes per mile)."))
    print(menu_border_line())
    print()


def print_main_menu(runs):
    """Draw the menu with a run count so you always see how much is saved."""
    n = len(runs)
    if n == 0:
        status = "No runs logged yet."
    elif n == 1:
        status = "1 run logged."
    else:
        status = str(n) + " runs logged."

    print()
    print(menu_border_line())
    print(menu_row("  MAIN MENU — allRunners (prototype)"))
    print(menu_row("  " + status))
    print("  +" + "-" * MENU_WIDTH + "+")
    print(menu_row("  1.  Add a run"))
    print(menu_row("      → distance (miles) & time (minutes)"))
    print(menu_row(""))
    print(menu_row("  2.  View all runs"))
    print(menu_row("      → list distance, time, pace for each"))
    print(menu_row(""))
    print(menu_row("  3.  Quit"))
    print(menu_border_line())
    print()


def read_menu_choice():
    """Read and trim one line of input for the menu."""
    return input("  Type 1, 2, or 3, then Enter: ").strip()


def invalid_menu_message():
    print("  ! Invalid. Use 1 (add), 2 (view all), or 3 (quit).")


def main():
    """
    Program entry: create the runs list once, then loop with a menu.

    Requirement "store runs in a list":
        runs is a Python list; each item is one dict representing one run.
    """
    runs = []
    print_welcome()

    while True:
        print_main_menu(runs)
        choice = read_menu_choice()

        if choice == "1":
            add_run(runs)
        elif choice == "2":
            view_runs(runs)
        elif choice == "3":
            print()
            print(menu_border_line())
            print(menu_row("  Thanks for using allRunners. Goodbye!"))
            print(menu_border_line())
            print()
            break
        else:
            invalid_menu_message()
            print()


if __name__ == "__main__":
    main()
