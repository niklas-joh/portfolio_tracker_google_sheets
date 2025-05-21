/**
 * @description Includes and evaluates HTML content from another file
 * @param {string} filename - The name of the file to include
 * @returns {string} The evaluated content of the file
 */
function include(filename, data) {
  const template = HtmlService.createTemplateFromFile(filename);
  template.data = data;  // Pass the data to the included template
  return template.evaluate().getContent();
}

/**
 * @description Saves the API key and environment selection to user properties
 * @param {string} apiKey - The API key to save
 * @param {string} environment - The selected environment ('demo' or 'live')
 * @returns {Object} Result of the save operation
 */
function saveApiSettings(apiKey, environment) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    // Store settings
    userProperties.setProperties({
      'API_KEY': apiKey,
      'ENVIRONMENT': environment,
      'SETUP_COMPLETE': 'true',
      'SETUP_TIMESTAMP': new Date().toISOString()
    });

    return {
      success: true,
      message: 'Settings saved successfully'
    };
  } catch (error) {
    console.error('Error saving settings:', error);
    return {
      success: false,
      error: 'Failed to save settings'
    };
  }
}

// --- Helper Functions for Repository Operations ---

/**
 * Gets the Trading212 API client.
 * Reads API_KEY and SELECTED_ENVIRONMENT from UserProperties.
 * @private
 * @return {Trading212ApiClient} The API client instance.
 */
function getApiClientForUi_() {
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('TRADING212_API_KEY') || userProperties.getProperty('API_KEY'); // Check both for backward compatibility
  const environment = userProperties.getProperty('SELECTED_ENVIRONMENT') || userProperties.getProperty('ENVIRONMENT') || 'demo'; // Default to 'demo'

  if (!apiKey) {
    const msg = "API key not set. Please run 'Setup Account' from the Trading212 Portfolio menu.";
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
    throw new Error(msg);
  }
  // Ensure Trading212ApiClient is available
  if (typeof Trading212ApiClient === 'undefined') {
    const msg = "Trading212ApiClient class is not defined. Ensure api/Trading212ApiClient.js is loaded.";
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
    throw new Error(msg);
  }
  Logger.log(`Initializing Trading212ApiClient for environment: ${environment} from uiFunctions`);
  return new Trading212ApiClient(environment);
}

/**
 * Gets the SheetManager instance.
 * @private
 * @return {SheetManager} The SheetManager instance.
 */
function getSheetManagerForUi_() {
  // Ensure SheetManager is available
  if (typeof SheetManager === 'undefined') {
    const msg = "SheetManager class is not defined. Ensure data/sheetManager.js is loaded.";
    Logger.log(msg);
    SpreadsheetApp.getUi().alert(msg);
    throw new Error(msg);
  }
  return new SheetManager();
}

/**
 * Gets the ErrorHandler instance.
 * @private
 * @return {ErrorHandler} The ErrorHandler instance.
 */
function getErrorHandlerForUi_() {
  // Ensure ErrorHandler is available
  if (typeof ErrorHandler === 'undefined') {
    Logger.log("ErrorHandler class is not defined. Ensure main/errorHandling.js is loaded. Using fallback.");
    // Fallback basic error handler
    return {
      handleError: (error, message) => {
        const fullMessage = `Fallback Error: ${message} - ${error.message}`;
        Logger.log(`${fullMessage}\nStack: ${error.stack || 'No stack available'}`);
        SpreadsheetApp.getUi().alert(fullMessage);
      },
      logError: (error, message) => {
        const fullMessage = `Fallback Log: ${message} - ${error.message}`;
        Logger.log(`${fullMessage}\nStack: ${error.stack || 'No stack available'}`);
      }
    };
  }
  return new ErrorHandler('uiFunctions');
}


// --- Menu Item Handlers for Fetching Repository Data ---

/**
 * Fetches and saves all pies to the 'Pies' sheet.
 * Triggered by menu item.
 */
function fetchPiesAndSave_() {
  try {
    Logger.log("UI: Starting fetchPiesAndSave_...");
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('html/fetchData.html').setWidth(300).setHeight(100), 'Fetching Pies...');

    const apiClient = getApiClientForUi_();
    const sheetManager = getSheetManagerForUi_();
    const errorHandler = getErrorHandlerForUi_();

    // Ensure PieRepository is available
    if (typeof PieRepository === 'undefined') throw new Error("PieRepository class is not defined.");

    const pieRepository = new PieRepository(apiClient, sheetManager, errorHandler);
    pieRepository.fetchAndSaveAllPies();

    Logger.log("UI: fetchPiesAndSave_ completed successfully.");
    SpreadsheetApp.getUi().alert("Fetch & Save Pies completed. Check logs and the 'Pies' sheet.");
  } catch (e) {
    Logger.log(`UI Error in fetchPiesAndSave_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error fetching Pies: ${e.toString()}`);
    // ErrorHandler instance within repository should handle detailed logging/reporting
  }
}

/**
 * Fetches and saves all pie items (instruments) to the 'PieInstruments' sheet.
 * Triggered by menu item.
 */
function fetchPieItemsAndSave_() {
  try {
    Logger.log("UI: Starting fetchPieItemsAndSave_...");
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('html/fetchData.html').setWidth(300).setHeight(100), 'Fetching Pie Items...');

    const apiClient = getApiClientForUi_();
    const sheetManager = getSheetManagerForUi_();
    const errorHandler = getErrorHandlerForUi_();
    
    // Ensure PieItemRepository is available
    if (typeof PieItemRepository === 'undefined') throw new Error("PieItemRepository class is not defined.");

    const pieItemRepository = new PieItemRepository(apiClient, sheetManager, errorHandler);
    pieItemRepository.fetchAndSaveAllPieItems(); // Assumes Pies sheet is populated

    Logger.log("UI: fetchPieItemsAndSave_ completed successfully.");
    SpreadsheetApp.getUi().alert("Fetch & Save Pie Items completed. Check logs and the 'PieInstruments' sheet.");
  } catch (e) {
    Logger.log(`UI Error in fetchPieItemsAndSave_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error fetching Pie Items: ${e.toString()}`);
  }
}

/**
 * Fetches and saves transactions to the 'Transactions' sheet.
 * For now, fetches for a default period (e.g., last 30 days).
 * Could be enhanced with a date range prompt.
 * Triggered by menu item.
 */
function fetchTransactionsAndSave_() {
  try {
    Logger.log("UI: Starting fetchTransactionsAndSave_...");
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('html/fetchData.html').setWidth(300).setHeight(100), 'Fetching Transactions...');

    const apiClient = getApiClientForUi_();
    const sheetManager = getSheetManagerForUi_();
    const errorHandler = getErrorHandlerForUi_();

    // Ensure TransactionRepository is available
    if (typeof TransactionRepository === 'undefined') throw new Error("TransactionRepository class is not defined.");

    const transactionRepository = new TransactionRepository(apiClient, sheetManager, errorHandler);

    // Default: Fetch transactions for the last 30 days
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateTo.getDate() - 30);
    Logger.log(`UI: Fetching transactions from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    transactionRepository.fetchAndSaveTransactions(dateFrom, dateTo);

    Logger.log("UI: fetchTransactionsAndSave_ completed successfully.");
    SpreadsheetApp.getUi().alert("Fetch & Save Transactions completed. Check logs and the 'Transactions' sheet.");
  } catch (e) {
    Logger.log(`UI Error in fetchTransactionsAndSave_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error fetching Transactions: ${e.toString()}`);
  }
}

/**
 * Fetches and saves dividends to the 'Dividends' sheet.
 * For now, fetches for a default period (e.g., last 90 days).
 * Could be enhanced with a date range prompt.
 * Triggered by menu item.
 */
function fetchDividendsAndSave_() {
  try {
    Logger.log("UI: Starting fetchDividendsAndSave_...");
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('html/fetchData.html').setWidth(300).setHeight(100), 'Fetching Dividends...');
    
    const apiClient = getApiClientForUi_();
    const sheetManager = getSheetManagerForUi_();
    const errorHandler = getErrorHandlerForUi_();

    // Ensure DividendRepository is available
    if (typeof DividendRepository === 'undefined') throw new Error("DividendRepository class is not defined.");

    const dividendRepository = new DividendRepository(apiClient, sheetManager, errorHandler);

    // Default: Fetch dividends for the last 90 days
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateTo.getDate() - 90);
    Logger.log(`UI: Fetching dividends from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    dividendRepository.fetchAndSaveDividends(dateFrom, dateTo);

    Logger.log("UI: fetchDividendsAndSave_ completed successfully.");
    SpreadsheetApp.getUi().alert("Fetch & Save Dividends completed. Check logs and the 'Dividends' sheet.");
  } catch (e) {
    Logger.log(`UI Error in fetchDividendsAndSave_: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Error fetching Dividends: ${e.toString()}`);
  }
}

/**
 * @description Validates an API key with the selected environment
 * @param {string} apiKey - The API key to validate
 * @param {string} environment - The environment to validate against
 * @returns {Promise<Object>} Validation result
 */
async function validateApiKey(apiKey, environment) {
  try {
    // Here you would typically make an API call to validate the key
    // This is a placeholder for the actual API validation logic
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'API key validated successfully'
    };
  } catch (error) {
    console.error('API validation error:', error);
    return {
      success: false,
      error: 'Failed to validate API key'
    };
  }
}

/**
 * @description Gets the current setup status
 * @returns {Object} The current setup status and settings
 */
function getSetupStatus() {
  const userProperties = PropertiesService.getUserProperties();
  const properties = userProperties.getProperties();

  return {
    isComplete: properties.SETUP_COMPLETE === 'true',
    environment: properties.ENVIRONMENT,
    setupTimestamp: properties.SETUP_TIMESTAMP
  };
}

/**
 * @description Resets the setup, clearing all saved settings
 * @returns {Object} Result of the reset operation
 */
function resetSetup() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteAllProperties();

    return {
      success: true,
      message: 'Setup reset successfully'
    };
  } catch (error) {
    console.error('Error resetting setup:', error);
    return {
      success: false,
      error: 'Failed to reset setup'
    };
  }
}
