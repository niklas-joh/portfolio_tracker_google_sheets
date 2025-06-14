# Code Improvement Plan

This document outlines potential enhancements for the Trading212 portfolio tracker project.
The items are listed with an estimated priority and complexity to help plan future work.

| ID | Description | Priority | Complexity |
|----|-------------|----------|------------|
| 1 | Consolidate the duplicated `include` helper used for HTML templating in `ui/modalManager.js` and `main/uiFunctions.js`. Maintain a single utility function to avoid inconsistencies. | Low | Low |
| 2 | Break down the large `sheetFormattingManager.js` file into smaller modules (e.g., format config handling, UI helpers, application logic). This will make it easier to maintain and test. | Medium | Medium |
| 3 | Improve environment selection and API base URL management. Update `api/constants.js` to recalculate `API_BASE_URL` whenever the user switches between demo and live environments. | Medium | Low |
| 4 | Add a `clasp` manifest and helper scripts for deploying the Apps Script project. This simplifies development and onboarding for contributors. | Low | Low |
| 5 | Introduce unit tests for API utilities and data processing functions (using a framework like gas-unit or clasp with Jest). | Medium | Medium |
| 6 | Refine progress polling logic to reduce server calls when operations are stable and provide clearer feedback in the UI. | Medium | Medium |
| 7 | Implement data export options (CSV/PDF) for portfolio reports, as described in task 43. | High | Medium |
| 8 | Build a summary dashboard sheet with charts and metrics, referenced in task 15. | High | High |
| 9 | Centralize error handling and user-facing notifications. Extend `main/errorHandling.js` to capture context and provide clearer messages. | Medium | Medium |
|10 | Enhance caching and rate limiting to minimize API usage and handle long-running fetches gracefully. | Medium | Medium |

### Suggested Implementation Order
1. **Item 1** – quick refactor to remove duplication.
2. **Item 3** – fixes environment handling to prevent incorrect API calls.
3. **Item 2** – reorganize formatting code before adding new features.
4. **Item 4** – add `clasp` manifest to streamline subsequent changes.
5. **Item 6** – refine progress updates (depends on existing UI structure).
6. **Item 9** – expand centralized error handling.
7. **Item 10** – improve caching and rate limiting.
8. **Item 5** – begin adding unit tests as the codebase stabilizes.
9. **Item 7** – add export functionality.
10. **Item 8** – implement dashboard with charts (largest task).

These improvements will help make the codebase easier to maintain and extend while providing additional features for end users.

## Detailed Changes

Below is a more in‑depth overview of each item outlining which files will be touched and the proposed approach. In some cases alternative options are highlighted so we can evaluate trade‑offs before implementation.

### 1. Consolidate the `include` Helper
**Affected files:** `ui/modalManager.js`, `main/uiFunctions.js` (new helper in `main/include.js`)

**Proposal:** Both files currently define nearly identical `include` functions for HTML templating. Move this logic to a single module (e.g. `main/include.js`) that exports `include(filename, data)`. Import this helper in both locations. This avoids duplication and ensures template evaluation behaves consistently across the UI.

**Alternative:** Keep the function in `main/uiFunctions.js` and have `modalManager.js` call it via the global scope. Creating a dedicated utility file keeps responsibilities clearer and is preferred.

### 2. Split `sheetFormattingManager.js`
**Affected files:** `data/sheetFormattingManager.js` (plus new modules under `data/formatting/`)

**Proposal:** The current file mixes configuration loading, format guessing, trigger creation and UI actions. Break it into smaller modules:
* `formatConfig.js` – manages configuration sheets and default patterns
* `formatTriggers.js` – creates and removes onEdit/onOpen triggers
* `formatApply.js` – applies formats and handles guessing logic

Export functions from each module and have a small wrapper in `sheetFormattingManager.js` that ties them together. This makes unit testing simpler and isolates responsibilities.

**Alternative:** Instead of new modules, we could keep a single file but separate into clearly marked sections. However, splitting into modules encourages reusability and reduces file size.

### 3. Improve Environment Handling
**Affected files:** `api/constants.js`, `api/apiUtilities.js`, `main/uiFunctions.js`

**Proposal:** When the user changes environment via the setup UI, recalculate `API_BASE_URL` and store the environment. Add a helper `getBaseUrl()` in `api/constants.js` that reads the saved environment each time. Replace direct references to `API_BASE_URL` in API utilities with calls to this helper so that switching between demo/live is reflected immediately without reloading the script.

**Alternative:** Store both base URLs and select the appropriate one at call time. Either approach removes the need for a global constant that might become stale. The helper function keeps code readable and centralizes logic.

### 4. Add `clasp` Manifest and Scripts
**Affected files:** new `.clasp.json`, deployment scripts in `package.json`

**Proposal:** Use [clasp](https://github.com/google/clasp) to manage Apps Script deployments. Commit a `.clasp.json` configured for `src`/`dist` directories and add npm scripts (`clasp push`, `clasp pull`) to streamline syncing with Google Apps Script. Document usage in `README.md`.

### 5. Add Unit Tests
**Affected files:** new `tests/` directory; modules under `api/` and `main/`

**Proposal:** Introduce a lightweight testing framework such as [gas-unit](https://github.com/Levz0r/gas-unit) or use `clasp` with Jest. Start by testing pure functions in `api/apiUtilities.js` and `data/format*` modules. Provide npm scripts to run tests locally before pushing updates.

### 6. Refine Progress Polling
**Affected files:** `main/progressManager.js`, `main/uiFunctions.js`

**Proposal:** Current polling checks for progress on a fixed interval. Modify `progressManager` to increase the interval when no change is detected and reset when activity resumes. Expose a callback for UI updates so the polling logic is decoupled from the modal implementation.

### 7. Data Export Options
**Affected files:** new `export/` directory; updates to `ui/menuBuilder.js`

**Proposal:** Implement the features from task 43. Create a common export interface (`export/exportInterface.js`) with handlers for CSV and PDF. Add menu items for exporting the currently selected sheet or generating a report. Provide options in the UI for email delivery and template selection.

### 8. Summary Dashboard
**Affected files:** `main/dashboard.js`, updates to `ui/menuBuilder.js`, possible templates under `html/`

**Proposal:** Build the dashboard described in task 15 using a separate script file (`main/dashboard.js`). Generate charts and metrics using existing data sheets. Include a menu option to refresh the dashboard. The layout can be defined in a new HTML template for easier editing.

### 9. Centralize Error Handling
**Affected files:** `main/errorHandling.js`, various call sites

**Proposal:** Extend the current error handler to accept context (function name, parameters) and produce user-friendly messages. Replace inline `try/catch` blocks with calls to this centralized handler. Consider logging errors to a dedicated sheet for easier debugging.

### 10. Caching and Rate Limiting
**Affected files:** `main/caching.js`, `api/rateLimiter.js`

**Proposal:** Review existing caching strategies and ensure API calls respect rate limits. Add exponential backoff for long-running fetches and consider caching successful responses for a short period to reduce API usage.
