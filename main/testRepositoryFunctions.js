/**
 * @file testRepositoryFunctions.js
 * @description Contains test functions for validating repository classes by interacting
 * with the Trading212 API and a Google Sheet.
 *
 * To use these functions:
 * 1. Ensure you have set the following UserProperties in your Google Apps Script project:
 *    - 'TRADING212_API_KEY': Your Trading212 API key.
 *    - 'SELECTED_ENVIRONMENT': 'live' or 'demo'. Defaults to 'demo' if not set.
 * 2. Open the Apps Script editor.
 * 3. Select the test function you want to run from the function dropdown (e.g., "testFetchAndSaveAllPies_").
 * 4. Click the "Run" button.
 * 5. Check the logs (View > Logs) and the Google Sheet for results.
 */

// --- Temporary SheetManager Workaround ---
// This is a temporary implementation of SheetManager methods required by the repositories.
// The actual data/sheetManager.js should be updated in a separate effort.

/**
 * @class TemporarySheetManager
 * @description A temporary workaround class providing essential sheet operations.
 */
class TemporarySheetManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!this.spreadsheet) {
      throw new Error("TemporarySheetManager: No active spreadsheet found. Ensure a sheet is open.");
    }
  }

  /**
   * Ensures a sheet with the given name exists. If not, it creates it.
   * @param {string} sheetName The name of the sheet.
   * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
   */
  ensureSheetExists(sheetName) {
    let sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
      Logger.log(`TemporarySheetManager: Created sheet "${sheetName}".`);
    }
    return sheet;
  }

  /**
   * Sets the header row for a given sheet.
   * @param {string} sheetName The name of the sheet.
   * @param {string[]} headers An array of header strings.
   */
  setHeaders(sheetName, headers) {
    const sheet = this.ensureSheetExists(sheetName);
    sheet.clearContents(); // Clear existing content before setting new headers
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    Logger.log(`TemporarySheetManager: Set headers for sheet "${sheetName}": ${headers.join(", ")}`);
  }

  /**
   * Updates a sheet with new data, clearing old data below the headers.
   * @param {string} sheetName The name of the sheet.
   * @param {Array<Array<any>>} dataRows An array of arrays representing rows of data.
   * @param {string[]} headers An array of header strings (used to determine columns).
   */
  updateSheetData(sheetName, dataRows, headers) {
    const sheet = this.ensureSheetExists(sheetName);
    // Clear old data (below header row)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    if (dataRows && dataRows.length > 0) {
      sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
      Logger.log(`TemporarySheetManager: Updated sheet "${sheetName}" with ${dataRows.length} rows of data.`);
    } else {
      Logger.log(`TemporarySheetManager: No data to update for sheet "${sheetName}".`);
    }
  }

  /**
   * Retrieves all data from a sheet, excluding the header row.
   * @param {string} sheetName The name of the sheet.
   * @return {Array<Array<any>>} An array of arrays representing rows of data.
   */
  getSheetData(sheetName) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`TemporarySheetManager: Sheet "${sheetName}" not found.`);
      return [];
    }
    if (sheet.getLastRow() <= 1) {
      Logger.log(`TemporarySheetManager: Sheet "${sheetName}" has no data beyond headers.`);
      return [];
    }
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    Logger.log(`TemporarySheetManager: Retrieved ${data.length} rows from sheet "${sheetName}".`);
    return data;
  }
}

// --- Helper Functions for Instantiation ---

/**
 * Gets the Trading212 API client.
 * Reads API_KEY and SELECTED_ENVIRONMENT from UserProperties.
 * @return {Trading212ApiClient} The API client instance.
 */
function getApiClient_() {
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('TRADING212_API_KEY');
  const environment = userProperties.getProperty('SELECTED_ENVIRONMENT') || 'demo'; // Default to 'demo'

  if (!apiKey) {
    const msg = "TRADING212_API_KEY not set in UserProperties. Please set it via File > Project properties > Script properties.";
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
    throw new Error(msg);
  }

  Logger.log(`Initializing Trading212ApiClient for environment: ${environment}`);
  return new Trading212ApiClient(environment);
}

/**
 * Gets the (temporary) SheetManager instance.
 * @return {TemporarySheetManager} The SheetManager instance.
 */
function getSheetManager_() {
  return new TemporarySheetManager();
}

/**
 * Gets the ErrorHandler instance.
 * @return {ErrorHandler} The ErrorHandler instance.
 */
function getErrorHandler_() {
  // Assuming ErrorHandler is globally available or defined in errorHandling.js
  // If not, it might need to be explicitly loaded or defined here.
  if (typeof ErrorHandler === 'undefined') {
    Logger.log("ErrorHandler class is not defined. Please ensure errorHandling.js is part of the project and loaded.");
    // Fallback basic error handler if ErrorHandler class is missing
    return {
      handleError: (error, message) => {
        Logger.log(`Fallback Error: ${message} - ${error.message} \n${error.stack}`);
        SpreadsheetApp.getUi().alert(`Error: ${message} - ${error.message}`);
      },
      logError: (error, message) => {
        Logger.log(`Fallback Log: ${message} - ${error.message} \n${error.stack}`);
      }
    };
  }
  return new ErrorHandler('testRepositoryFunctions');
}


// --- Test Functions for Repositories ---

/**
 * Tests fetching and saving all pies.
 */
function testFetchAndSaveAllPies_() {
  try {
    Logger.log("Starting testFetchAndSaveAllPies_...");
    const apiClient = getApiClient_();
    const sheetManager = getSheetManager_();
    const errorHandler = getErrorHandler_();
    const pieRepository = new PieRepository(apiClient, sheetManager, errorHandler);

    pieRepository.fetchAndSaveAllPies();
    Logger.log("testFetchAndSaveAllPies_ completed successfully.");
    SpreadsheetApp.getUi().alert("Test: Fetch and Save All Pies completed. Check logs and 'Pies' sheet.");
  } catch (e) {
    Logger.log(`Error in testFetchAndSaveAllPies_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error in testFetchAndSaveAllPies_: ${e.toString()}`);
    // No explicit errorHandler.handleError(e, ...) here as repositories should use it.
  }
}

/**
 * Tests fetching and saving all pie items (instruments within pies).
 * This test assumes pies have already been fetched or are available.
 */
function testFetchAndSaveAllPieItems_() {
  try {
    Logger.log("Starting testFetchAndSaveAllPieItems_...");
    const apiClient = getApiClient_();
    const sheetManager = getSheetManager_();
    const errorHandler = getErrorHandler_();
    const pieItemRepository = new PieItemRepository(apiClient, sheetManager, errorHandler);

    // This method requires pie IDs. For a comprehensive test, it might need to fetch pies first
    // or have known pie IDs. For simplicity, we'll call it directly.
    // It will attempt to fetch items for pies listed in the 'Pies' sheet.
    pieItemRepository.fetchAndSaveAllPieItems();
    Logger.log("testFetchAndSaveAllPieItems_ completed successfully.");
    SpreadsheetApp.getUi().alert("Test: Fetch and Save All Pie Items completed. Check logs and 'PieInstruments' sheet.");
  } catch (e) {
    Logger.log(`Error in testFetchAndSaveAllPieItems_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error in testFetchAndSaveAllPieItems_: ${e.toString()}`);
  }
}

/**
 * Tests fetching and saving transactions.
 * Example: Fetches transactions for the last 30 days.
 */
function testFetchAndSaveTransactions_() {
  try {
    Logger.log("Starting testFetchAndSaveTransactions_...");
    const apiClient = getApiClient_();
    const sheetManager = getSheetManager_();
    const errorHandler = getErrorHandler_();
    const transactionRepository = new TransactionRepository(apiClient, sheetManager, errorHandler);

    // Example: Fetch transactions for the last 30 days
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateTo.getDate() - 30);

    transactionRepository.fetchAndSaveTransactions(dateFrom, dateTo);
    Logger.log("testFetchAndSaveTransactions_ completed successfully.");
    SpreadsheetApp.getUi().alert("Test: Fetch and Save Transactions completed. Check logs and 'Transactions' sheet.");
  } catch (e) {
    Logger.log(`Error in testFetchAndSaveTransactions_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error in testFetchAndSaveTransactions_: ${e.toString()}`);
  }
}

/**
 * Tests fetching and saving dividends.
 * Example: Fetches dividends for the last 90 days.
 */
function testFetchAndSaveDividends_() {
  try {
    Logger.log("Starting testFetchAndSaveDividends_...");
    const apiClient = getApiClient_();
    const sheetManager = getSheetManager_();
    const errorHandler = getErrorHandler_();
    const dividendRepository = new DividendRepository(apiClient, sheetManager, errorHandler);

    // Example: Fetch dividends for the last 90 days
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateTo.getDate() - 90);

    dividendRepository.fetchAndSaveDividends(dateFrom, dateTo);
    Logger.log("testFetchAndSaveDividends_ completed successfully.");
    SpreadsheetApp.getUi().alert("Test: Fetch and Save Dividends completed. Check logs and 'Dividends' sheet.");
  } catch (e) {
    Logger.log(`Error in testFetchAndSaveDividends_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error in testFetchAndSaveDividends_: ${e.toString()}`);
  }
}

/**
 * A utility function to set up UserProperties for testing if they don't exist.
 * IMPORTANT: The API key provided here is a placeholder and MUST be replaced by the user.
 */
function setupTestUserProperties_() {
  const userProperties = PropertiesService.getUserProperties();
  
  const apiKey = userProperties.getProperty('TRADING212_API_KEY');
  if (!apiKey) {
    // !!! IMPORTANT: User must replace 'YOUR_ACTUAL_API_KEY_HERE' !!!
    // This is a placeholder to avoid errors, but will not work for live data.
    const placeholderApiKey = 'YOUR_ACTUAL_API_KEY_HERE_OR_DEMO_KEY'; 
    userProperties.setProperty('TRADING212_API_KEY', placeholderApiKey);
    Logger.log(`TRADING212_API_KEY was not set. A placeholder has been set. PLEASE REPLACE IT with your actual key for live data or a valid demo key.`);
    SpreadsheetApp.getUi().alert("TRADING212_API_KEY was not set. A placeholder has been set. Please update it in File > Project properties > Script properties with your actual key.");
  } else {
    Logger.log("TRADING212_API_KEY is already set.");
  }

  const environment = userProperties.getProperty('SELECTED_ENVIRONMENT');
  if (!environment) {
    userProperties.setProperty('SELECTED_ENVIRONMENT', 'demo'); // Default to 'demo'
    Logger.log("SELECTED_ENVIRONMENT was not set. Defaulted to 'demo'.");
  } else {
    Logger.log(`SELECTED_ENVIRONMENT is already set to: ${environment}`);
  }
  
  SpreadsheetApp.getUi().alert("User properties checked/initialized. Ensure TRADING212_API_KEY is correct.");
}

// --- Instructions for Use ---
// To use these test functions:
// 1. Open your Google Sheet associated with this Apps Script project.
// 2. Go to "Extensions" > "Apps Script" to open the editor.
// 3. If this is the first time, or if you haven't set your API key:
//    a. Select "setupTestUserProperties_" from the function dropdown above the editor.
//    b. Click the "Run" (play icon) button.
//    c. Follow prompts. Crucially, go to "File" > "Project properties" > "Script properties" (tab)
//       and set 'TRADING212_API_KEY' to your actual Trading212 API key.
//    d. Also ensure 'SELECTED_ENVIRONMENT' is set to 'live' or 'demo' as desired.
// 4. Once properties are set, select one of the test functions from the dropdown:
//    - testFetchAndSaveAllPies_
//    - testFetchAndSaveAllPieItems_
//    - testFetchAndSaveTransactions_
//    - testFetchAndSaveDividends_
// 5. Click the "Run" button.
// 6. You may be asked for authorization the first time you run a function that accesses Google services or external APIs. Grant the necessary permissions.
// 7. Check the "Execution log" (View > Logs or Ctrl+Enter / Cmd+Enter) for detailed output.
// 8. Check your Google Sheet for new sheets (e.g., "Pies", "PieInstruments", "Transactions", "Dividends") and data.
//
// Note: The PieItemRepository's fetchAndSaveAllPieItems method relies on pie IDs being present in the 'Pies' sheet.
// It's recommended to run testFetchAndSaveAllPies_ first.
