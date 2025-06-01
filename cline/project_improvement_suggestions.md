# Project Improvement Suggestions for Portfolio Tracker

This document outlines potential areas for improvement for the Google Apps Script Portfolio Tracker project. These suggestions cover new features, refactoring, user experience, documentation, and more, based on an analysis of `tasks/tasks.json` and a review of key code files (`api/apiUtilities.js`, `data/sheetManager.js`, `main/errorHandling.js`, `README.md`).

## I. Existing Planned Tasks (from `tasks/tasks.json`)

The following tasks are already planned and marked as `pending`. The suggestions below aim to expand on them or provide specific considerations.

*   **Task 13: Implement Advanced Error Handling and Logging**
*   **Task 14: Implement Data Refresh Automation**
*   **Task 15: Implement Data Analysis and Summary Dashboard**

## II. Detailed Suggestions

### A. Error Handling and Logging (Relates to Task 13)

The current `main/errorHandling.js` (`handleApiError` function) logs API errors to `Logger.log` (Stackdriver). Task 13 plans for a more advanced `handleError` function logging to an "Error Log" sheet.

**Suggestions:**

1.  **Implement Task 13's `handleError` function:**
    *   Ensure it logs to a dedicated "Error Log" sheet as planned.
    *   Include columns for: Timestamp, Function Name/Context, Error Message, Stack Trace, User Identifier (if applicable, e.g., `Session.getEffectiveUser().getEmail()`), Error ID.
2.  **Integrate `handleError`:** Replace `Logger.log` for errors in `handleApiError` and other critical functions with calls to the new centralized `handleError`.
3.  **User-Facing Error Messages:**
    *   When an error occurs that impacts the user (e.g., API key invalid, data fetch failed), show a user-friendly message via `SpreadsheetApp.getUi().alert()` or in a modal.
    *   Include the unique Error ID from the "Error Log" sheet in the user-facing message so they can report it for easier debugging.
4.  **Granular Logging Levels:**
    *   Consider implementing different logging levels (DEBUG, INFO, WARNING, ERROR).
    *   Store the desired logging level in `PropertiesService`.
    *   Wrap `Logger.log` and the new sheet-based logging in helper functions that respect the configured level.
5.  **Error Log Sheet Management:**
    *   Provide a menu option to view the "Error Log" sheet.
    *   Add functionality to clear or archive old entries from the "Error Log" sheet to prevent it from becoming too large.
6.  **`api/apiUtilities.js` Specifics:**
    *   The `saveApiConfig` function currently throws errors like `new Error('Rate limit exceeded...')`. These should also be passed to the centralized `handleError` for consistent logging.

### B. Data Refresh Automation (Relates to Task 14)

Task 14 plans for time-based triggers.

**Suggestions:**

1.  **UI for Trigger Management:**
    *   Create an HTML modal/sidebar to:
        *   Enable/disable automatic refresh.
        *   Set refresh frequency (e.g., daily, specific days, specific hour).
        *   View current trigger status (active/inactive, last run, next run).
        *   Manually trigger a full refresh.
2.  **Robust Trigger Function (`fetchAndWriteAllData`):**
    *   Ensure this function has comprehensive try-catch blocks, calling the centralized `handleError`.
    *   Log start and end of automated runs, and a summary of data fetched.
3.  **Notifications:**
    *   Implement email notifications (e.g., to `Session.getEffectiveUser().getEmail()`) upon completion or failure of automated refreshes. Include a summary or error details.
4.  **Quota Management:**
    *   Be mindful of Google Apps Script quotas (e.g., total trigger runtime per day, UrlFetch calls). Log quota usage or warn users if they are approaching limits.
    *   The `rateLimitedRequest` in `api/apiUtilities.js` has a `Utilities.sleep()`. For long automated runs, ensure total sleep time doesn't excessively prolong execution.

### C. Data Analysis and Summary Dashboard (Relates to Task 15)

Task 15 plans for a dashboard sheet.

**Suggestions:**

1.  **Interactive Dashboard:**
    *   Use in-sheet controls (e.g., dropdowns for date ranges) to make the dashboard interactive.
    *   Allow users to select which accounts or pies to include in summaries.
2.  **Key Performance Indicators (KPIs):**
    *   Calculate and display:
        *   Total Portfolio Value (Cash + Holdings).
        *   Overall Profit/Loss (absolute and percentage).
        *   Portfolio Growth over time (chart).
        *   Asset Allocation charts (by type, sector, etc., if data is available).
        *   Dividend Yield.
3.  **Data Source Robustness:**
    *   Dashboard formulas should gracefully handle cases where underlying data sheets (`Cash Balance`, `Transactions`, etc.) are empty or partially populated. Use `IFERROR` or similar checks.
4.  **Refresh Mechanism:**
    *   Include a "Refresh Dashboard" button on the dashboard sheet itself that re-runs calculations or re-applies formulas.
5.  **Visualizations:**
    *   Utilize Google Sheets' built-in charting tools effectively.
    *   Use conditional formatting for positive/negative values, highlighting key metrics.

### D. Code Refactoring and Optimization

1.  **`api/apiUtilities.js`:**
    *   **Consolidate Request Functions:** Clarify the roles of `makeInitialApiRequest` and `makeApiRequest`. Aim for a single, robust `makeApiRequest` function used by all parts of the script, potentially with options to modify behavior (e.g., skip auth for initial setup if necessary, though current `makeInitialApiRequest` still uses an API key).
    *   **Error Handling Consistency:** Ensure all API call sites use the `handleApiError` (and subsequently the new centralized `handleError`) consistently.
    *   **Constants:** API domains, versions, and resources are mentioned. Ensure these are clearly defined as global constants (e.g., in a `constants.js` or `Config.gs` file as per Task 1).
2.  **`data/sheetManager.js`:**
    *   **Class vs. Functions:** Decide on a consistent approach. Either fully develop the `SheetManager` class and use its methods throughout, or stick to standalone utility functions. The current mix is confusing. If using a class, instantiate it once and pass it around or use a singleton pattern.
    *   **Dynamic Headers (`extractHeaders`, `resolveNestedField`):** These functions (assumed to be in `dataProcessing.js`) are powerful but can be complex.
        *   Add extensive comments explaining their logic.
        *   Consider performance implications for very large or deeply nested JSON.
        *   The `writeRowsToSheet` logic that flattens arrays within rows needs careful testing to ensure it always produces the expected sheet layout. Document this behavior clearly.
    *   **Sheet Formatting:** Consider moving all sheet formatting logic (setting number formats, font weights, auto-resizing) into `data/sheetFormattingManager.js` if it exists, or create it. Task 9 mentions `formatSheetColumns` which seems to be a good candidate for this.
3.  **`main/caching.js` (and Caching in general):**
    *   Task 2 mentions caching in `makeApiRequest`. Centralize all caching logic in `main/caching.js`.
    *   Provide functions like `getCache(key)`, `setCache(key, value, expiration)`, `clearCache(keyPrefix)`.
    *   Offer a UI option for users to manually clear the script's cache, which can be helpful for troubleshooting.
4.  **Modularity and Naming:**
    *   Review file and function names for clarity and consistency. The current structure (`api/`, `data/`, `main/`, `ui/`) is a good start.
    *   Ensure files mentioned in initial tasks (e.g., `Config.gs`, `ApiUtils.gs`, `DataFetcher.gs`, `SheetManager.gs`, `UI.gs`, `Main.gs`) have been mapped to the current file structure or their purpose is covered.

### E. User Experience (UX) Enhancements

1.  **Loading Indicators:**
    *   For any action that takes more than a second or two (especially API calls or large sheet updates), display a "Loading..." toast or modal: `SpreadsheetApp.getActiveSpreadsheet().toast('Fetching data...', 'Status', -1);` and clear it on completion: `SpreadsheetApp.getActiveSpreadsheet().toast('Done.');`
2.  **Configuration Flow (`saveApiConfig`):**
    *   The current `saveApiConfig` tests the connection *before* saving. This is good.
    *   Provide immediate feedback in the UI after saving (success or specific error message).
3.  **Input Validation:**
    *   Client-side validation in HTML modals (e.g., for API key format if there's a known pattern) before calling server-side functions.
    *   Server-side validation for all inputs.
4.  **Help and Guidance:**
    *   Add tooltips or placeholder text in UI elements.
    *   Create a "Help" or "FAQ" section in the UI or link to the `README.md`.

### F. Documentation (README.md and Code Comments)

The current `README.md` is minimal.

1.  **Expand `README.md`:**
    *   **Detailed Project Description:** What it does, who it's for.
    *   **Features:** List all key functionalities.
    *   **Prerequisites:** Google Account, Trading 212 Account, how to generate an API key.
    *   **Setup Instructions:**
        1.  How to make a copy of the Google Sheet template.
        2.  How to open the Apps Script editor.
        3.  Initial `onOpen` execution and menu creation.
        4.  How to use "Configure API" to enter the API key and select environment.
    *   **Usage Guide:**
        *   Explanation of each menu item.
        *   How to fetch different data types.
        *   Description of each sheet created and the data it contains.
    *   **API Rate Limits & Quotas:** Briefly explain Trading 212 API rate limits and Google Apps Script quotas and how they might affect usage. Link to official documentation if possible.
    *   **Troubleshooting:** Common issues (e.g., API key errors, permissions, data not refreshing).
    *   **License:** Refer to the `LICENSE` file.
2.  **Code Comments (JSDoc):**
    *   Ensure all functions, especially public/global ones and those in shared utilities, have JSDoc comments explaining their purpose, parameters (`@param`), return values (`@return`), and any thrown errors (`@throws`). This is crucial for maintainability and for other developers (or future you).
    *   The existing JSDoc in `api/apiUtilities.js` and `data/sheetManager.js` is a good start. Extend this to all files.
3.  **Constants Documentation:** If using a central file for constants (e.g., `api/constants.js`), document what each constant represents.

### G. Security

1.  **API Key Security:**
    *   Continue using `PropertiesService.getUserProperties()` for API key storage, as it's scoped to the user and script.
    *   In the `README.md` and UI, strongly advise users on API key best practices (e.g., use restricted keys if the API supports it, don't share the sheet if the key is in it - though `PropertiesService` mitigates this direct sheet risk).
2.  **Permissions:**
    *   The script will require permissions (e.g., to fetch external URLs, access spreadsheets, run triggers). Explain why these permissions are needed during the authorization flow or in the `README.md`.

### H. Testing

1.  **Test Functions:**
    *   Create dedicated test functions within the Apps Script project (e.g., in a `testing/` folder or `tests.gs` file).
    *   These functions can call your main functions with mock data or specific scenarios.
    *   Example: `function test_fetchAccountInfo_success() { /* mock makeApiRequest, call fetchAccountInfo, assert result */ }`
2.  **Mocking:**
    *   For testing functions that make API calls, create mock versions of `UrlFetchApp.fetch` or your `makeApiRequest` function that return predefined responses. This allows testing logic without actual API calls.
3.  **UI Testing Checklist:**
    *   Maintain a checklist for manually testing UI elements (modals, menu items) across different scenarios.

## III. Next Steps for Cline (If continuing in ACT mode for implementation)

1.  **Prioritize:** Discuss with the user which of these areas/suggestions are the highest priority.
2.  **Create/Update Tasks:** For each chosen improvement, create a new task in `tasks/tasks.json` or update an existing one (like Tasks 13, 14, 15) with more specific details based on these suggestions.
3.  **Iterative Implementation:** Tackle one task at a time, following the development workflow (branch, code, test, commit, push, Clasp push).

This structured approach should help in systematically improving the Portfolio Tracker.
