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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.logError(error, 'Failed to save API settings');
    return {
      success: false,
      error: 'Failed to save settings. Check logs for details.' // User-friendly part
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
    // This is a specific setup error, direct alert is okay, but let's use ErrorHandler for consistency in display
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(new Error(msg), msg); // Display the direct message
    throw new Error(msg); // Still throw to stop execution
  }
  // Ensure Trading212ApiClient is available
  if (typeof Trading212ApiClient === 'undefined') {
    const msg = "Trading212ApiClient class is not defined. Ensure api/Trading212ApiClient.js is loaded.";
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(new Error(msg), "A critical component (Trading212ApiClient) is missing. The add-on might not function correctly.");
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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(new Error(msg), "A critical component (SheetManager) is missing. The add-on might not function correctly.");
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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(e, 'Failed to fetch and save pies.');
  }
}

/**
 * Fetches and saves all pie items (instruments) to the 'PieItems' sheet.
 * Triggered by menu item.
 */
async function fetchPieItemsAndSave_() {
  try {
    Logger.log("UI: Starting fetchPieItemsAndSave_...");
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('html/fetchData.html').setWidth(300).setHeight(100), 'Fetching Pie Items...');

    const apiClient = getApiClientForUi_();
    const sheetManager = getSheetManagerForUi_();
    const errorHandler = getErrorHandlerForUi_(); // errorHandler can be used for general UI errors if needed

    // Ensure Repositories are available
    if (typeof PieRepository === 'undefined') throw new Error("PieRepository class is not defined.");
    if (typeof PieItemRepository === 'undefined') throw new Error("PieItemRepository class is not defined.");

    const pieRepository = new PieRepository(apiClient, sheetManager, errorHandler); // PieRepository uses errorHandler
    const pieItemRepository = new PieItemRepository(apiClient, sheetManager, errorHandler); // Pass errorHandler

    Logger.log("UI: Fetching all pies from sheet...");
    const pies = await pieRepository.getAllPiesFromSheet();

    if (!pies || pies.length === 0) {
      Logger.log("UI: No pies found in the 'Pies' sheet. Cannot fetch pie items.");
      SpreadsheetApp.getUi().alert("No pies found. Please fetch pies first.");
      return;
    }

    Logger.log(`UI: Found ${pies.length} pies. Fetching items for each...`);
    
    // Create an array to store any errors that occur during fetching
    const fetchErrors = [];
    
    // Fetch items for each pie
    const fetchPromises = pies.map(pie => {
      if (pie && typeof pie.id !== 'undefined') {
        return pieItemRepository.fetchPieItemsForPie(pie.id)
          .catch(error => {
            // Log the error and add it to the errors array
            const errorMsg = `Failed to fetch items for pie ID ${pie.id} (${pie.name || 'Unknown'}): ${error.message}`;
            Logger.log(`UI: ${errorMsg}`);
            fetchErrors.push(errorMsg);
            return []; // Return empty array for this pie
          });
      }
      Logger.log(`UI: Pie object or pie.id is undefined for a pie: ${JSON.stringify(pie)}. Skipping.`);
      return Promise.resolve([]); // Resolve with empty array for invalid pie objects
    });
    
    // Wait for all fetch operations to complete
    const pieItemsArrays = await Promise.all(fetchPromises);
    
    // Process the results
    const allPieItems = pieItemsArrays.flat().filter(item => item); // Flatten and remove any null/undefined items
    
    Logger.log(`UI: Fetched ${allPieItems.length} total pie items across ${pies.length} pies.`);
    
    // Detailed logging of what was fetched
    const pieItemCounts = {};
    allPieItems.forEach(item => {
      if (item.pieId) {
        pieItemCounts[item.pieId] = (pieItemCounts[item.pieId] || 0) + 1;
      }
    });
    
    // Log the count of items per pie
    Object.keys(pieItemCounts).forEach(pieId => {
      Logger.log(`UI: Pie ID ${pieId} has ${pieItemCounts[pieId]} items.`);
    });
    
    // Check if we have any items to save
    if (allPieItems.length > 0) {
      Logger.log(`UI: Saving ${allPieItems.length} pie items to sheet...`);
      
      // Save the items to the sheet
      const saveResult = await pieItemRepository.savePieItemsToSheet(allPieItems);
      
      if (saveResult) {
        Logger.log("UI: fetchPieItemsAndSave_ completed successfully.");
        
        // Construct a detailed success message
        let successMessage = `Fetch & Save Pie Items completed. ${allPieItems.length} items saved.`;
        
        // Add information about any errors that occurred
        if (fetchErrors.length > 0) {
          successMessage += `\n\nNote: ${fetchErrors.length} pie(s) had errors during fetch.`;
        }
        
        SpreadsheetApp.getUi().alert(successMessage);
      } else {
        Logger.log("UI: Failed to save pie items to sheet.");
        SpreadsheetApp.getUi().alert("Error: Items were fetched but could not be saved to the sheet. Check logs for details.");
      }
    } else {
      // No items were found
      let noItemsMessage = "No pie items found for the existing pies.";
      
      // Add information about any errors that occurred
      if (fetchErrors.length > 0) {
        noItemsMessage += `\n\n${fetchErrors.length} pie(s) had errors during fetch:`;
        fetchErrors.slice(0, 3).forEach(error => {
          noItemsMessage += `\n- ${error}`;
        });
        if (fetchErrors.length > 3) {
          noItemsMessage += `\n- ... and ${fetchErrors.length - 3} more errors. Check logs for details.`;
        }
      }
      
      Logger.log("UI: No pie items found for any of the pies.");
      SpreadsheetApp.getUi().alert(noItemsMessage);
    }

  } catch (e) {
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(e, 'Failed to fetch and save pie items.');
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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(e, 'Failed to fetch and save transactions.');
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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.displayError(e, 'Failed to fetch and save dividends.');
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
    const errorHandler = getErrorHandlerForUi_();
    // This is an async function potentially called from HTML, direct alert might be okay,
    // but logging should use ErrorHandler.
    errorHandler.logError(error, 'API key validation failed');
    return {
      success: false,
      error: 'Failed to validate API key. See logs for details.' // User-friendly part
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
    const errorHandler = getErrorHandlerForUi_();
    errorHandler.logError(error, 'Failed to reset setup');
    return {
      success: false,
      error: 'Failed to reset setup. Check logs for details.' // User-friendly part
    };
  }
}
