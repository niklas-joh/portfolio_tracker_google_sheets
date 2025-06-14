# Portfolio Tracker Google Sheets

A set of Google Apps Script files that integrate the [Trading212](https://www.trading212.com/) API with Google Sheets. The scripts fetch portfolio data and format it so you can analyse your holdings directly in a spreadsheet.

## Features

- Connects to both **demo** and **live** Trading212 environments
- Fetches data such as pies, instruments, account cash and info, transactions, order history and dividends
- Handles API rate limits and shows progress while data is loading
- Configurable formatting system to apply number/date formats automatically
- Simple HTML setup wizard to store API credentials

## Getting Started

1. Clone this repository.
2. Create a new Google Apps Script project attached to your spreadsheet.
3. Copy the contents of each folder (`api`, `data`, `html`, `main`, `ui`, `css`, `js`) into your Apps Script project.
4. Save an API key and choose the environment using the provided setup dialog in the spreadsheet (under `Trading212` menu).
5. Use the menu to fetch the desired data.

If you prefer using [`clasp`](https://github.com/google/clasp), update the `appsscript.json` manifest and push the code with `clasp push`.

## Repository Overview

- **api** – API utilities, constants and functions for fetching data
- **data** – sheet management and formatting helpers
- **html/js/css** – HTML templates and client-side scripts for modals
- **main** – progress manager and entry points
- **ui** – menu and modal helpers
- **tasks** – development task descriptions

## Contributing

Pull requests are welcome. Check the `tasks` folder for high‑level development notes and areas that need attention.

## License

This project is licensed under the terms of the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

