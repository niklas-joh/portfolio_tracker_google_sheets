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

/**
 * @description Provides singleton instances of core services and repositories.
 * This function centralizes the instantiation of dependencies, making them
 * easily accessible throughout the application.
 * @returns {Object} An object containing instances of apiClient, sheetManager,
 *                   errorHandler, headerMappingService, and various repositories.
 */
function getServices() {
  // Ensure API_RESOURCES is available globally or passed in if not.
  // Assuming global availability for now as per Apps Script common practice.
  
  const apiClient = getApiClient(); // From api/Trading212ApiClient.js
  const sheetManager = new SheetManager(); // From data/sheetManager.js
  const errorHandler = new ErrorHandler(); // From main/errorHandling.js
  const headerMappingService = new HeaderMappingService(); // From data/headerMappingService.js

  const services = { apiClient, sheetManager, errorHandler, headerMappingService };

  // Instantiate repositories
  const pieRepository = new PieRepository(services);
  const pieItemRepository = new PieItemRepository(services);
  const transactionRepository = new TransactionRepository(services);
  const dividendRepository = new DividendRepository(services);
  const instrumentRepository = new InstrumentRepository(services); // New
  const accountInfoRepository = new AccountInfoRepository(services); // New
  const accountCashRepository = new AccountCashRepository(services); // New
  const orderRepository = new OrderRepository(services); // New

  // Add repositories to services object for easy access
  services.pieRepository = pieRepository;
  services.pieItemRepository = pieItemRepository;
  services.transactionRepository = transactionRepository;
  services.dividendRepository = dividendRepository;
  services.instrumentRepository = instrumentRepository; // New
  services.accountInfoRepository = accountInfoRepository; // New
  services.accountCashRepository = accountCashRepository; // New
  services.orderRepository = orderRepository; // New

  return services;
}

/**
 * @description Displays a temporary message to the user in the spreadsheet UI.
 * @param {string} message The message to display.
 */
function showToast(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message);
}

/**
 * @description Global function to update all pies data from API and save to sheet.
 */
async function updateAllPies_() {
  showToast('Updating all pies...', 'Data Update');
  try {
    const { pieRepository } = getServices();
    const pies = await pieRepository.fetchAndSaveAllPies();
    showToast(`Successfully updated ${pies.length} pies.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating pies: ${error.message}`, 'Error');
    Logger.log(`Error in updateAllPies_: ${error.message}`);
  }
}

/**
 * @description Global function to update all pie items data from API and save to sheet.
 * This orchestrates fetching items for all pies and saving them to a single sheet.
 */
async function updateAllPieItems_() {
  showToast('Updating all pie items...', 'Data Update');
  try {
    const { pieRepository, pieItemRepository } = getServices();
    const allPies = await pieRepository.fetchAllPies(); // Get all pies to iterate their IDs

    let allCollectedPieItems = [];
    for (const pie of allPies) {
      try {
        const pieItems = await pieItemRepository.fetchPieItemsForPie(pie.id);
        allCollectedPieItems = allCollectedPieItems.concat(pieItems);
      } catch (itemError) {
        Logger.log(`Warning: Could not fetch items for pie ID ${pie.id}: ${itemError.message}`);
        // Continue to next pie even if one fails
      }
    }

    if (allCollectedPieItems.length > 0) {
      await pieItemRepository.savePieItemsToSheet(allCollectedPieItems);
      showToast(`Successfully updated ${allCollectedPieItems.length} pie items.`, 'Data Update');
    } else {
      showToast('No pie items found to update.', 'Data Update');
    }
  } catch (error) {
    showToast(`Error updating pie items: ${error.message}`, 'Error');
    Logger.log(`Error in updateAllPieItems_: ${error.message}`);
  }
}

/**
 * @description Global function to update all transactions data from API and save to sheet.
 */
async function updateTransactions_() {
  showToast('Updating transactions...', 'Data Update');
  try {
    const { transactionRepository } = getServices();
    const transactions = await transactionRepository.fetchAndSaveAllTransactions();
    showToast(`Successfully updated ${transactions.length} transactions.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating transactions: ${error.message}`, 'Error');
    Logger.log(`Error in updateTransactions_: ${error.message}`);
  }
}

/**
 * @description Global function to update all dividends data from API and save to sheet.
 */
async function updateDividends_() {
  showToast('Updating dividends...', 'Data Update');
  try {
    const { dividendRepository } = getServices();
    const dividends = await dividendRepository.fetchAndSaveAllDividends();
    showToast(`Successfully updated ${dividends.length} dividends.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating dividends: ${error.message}`, 'Error');
    Logger.log(`Error in updateDividends_: ${error.message}`);
  }
}

// Placeholder functions for new data types (Models and Repositories to be created later)

/**
 * @description Global function to update instruments list from API and save to sheet.
 * (Requires InstrumentModel.js and InstrumentRepository.js)
 */
async function updateInstrumentsList_() {
  showToast('Updating instruments list...', 'Data Update');
  try {
    const { instrumentRepository } = getServices();
    const instruments = await instrumentRepository.fetchAndSaveAllInstruments();
    showToast(`Successfully updated ${instruments.length} instruments.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating instruments list: ${error.message}`, 'Error');
    Logger.log(`Error in updateInstrumentsList_: ${error.message}`);
  }
}

/**
 * @description Global function to update account information from API and save to sheet.
 */
async function updateAccountInfo_() {
  showToast('Updating account info...', 'Data Update');
  try {
    const { accountInfoRepository } = getServices();
    const accountInfo = await accountInfoRepository.fetchAndSaveAccountInfo();
    if (accountInfo) {
      showToast('Successfully updated account info.', 'Data Update');
    } else {
      showToast('No account info found to update.', 'Data Update');
    }
  } catch (error) {
    showToast(`Error updating account info: ${error.message}`, 'Error');
    Logger.log(`Error in updateAccountInfo_: ${error.message}`);
  }
}

/**
 * @description Global function to update account cash balance from API and save to sheet.
 */
async function updateAccountCash_() {
  showToast('Updating account cash...', 'Data Update');
  try {
    const { accountCashRepository } = getServices();
    const accountCash = await accountCashRepository.fetchAndSaveAccountCash();
    showToast(`Successfully updated ${accountCash.length} cash entries.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating account cash: ${error.message}`, 'Error');
    Logger.log(`Error in updateAccountCash_: ${error.message}`);
  }
}

/**
 * @description Global function to update order history from API and save to sheet.
 */
async function updateOrderHistory_() {
  showToast('Updating order history...', 'Data Update');
  try {
    const { orderRepository } = getServices();
    const orders = await orderRepository.fetchAndSaveAllOrderHistory();
    showToast(`Successfully updated ${orders.length} order history entries.`, 'Data Update');
  } catch (error) {
    showToast(`Error updating order history: ${error.message}`, 'Error');
    Logger.log(`Error in updateOrderHistory_: ${error.message}`);
  }
}

/**
 * @description Global function to update all core portfolio data sequentially.
 */
async function updateAllCoreData_() {
  showToast('Starting full data update...', 'Data Update');
  try {
    await updateAllPies_();
    await updateAllPieItems_();
    await updateDividends_();
    await updateOrderHistory_(); // Placeholder
    await updateAccountInfo_(); // Placeholder
    await updateAccountCash_(); // Placeholder
    await updateTransactions_();
    showToast('Full data update complete!', 'Data Update');
  } catch (error) {
    showToast(`Full data update failed: ${error.message}`, 'Error');
    Logger.log(`Error in updateAllCoreData_: ${error.message}`);
  }
}
