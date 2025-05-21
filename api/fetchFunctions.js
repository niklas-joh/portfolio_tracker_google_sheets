/**
 * ===================== Fetch Functions =========================
 * 
 * This section contains functions responsible for retrieving data from the Trading212 API
 * and coordinating the writing of that data to Google Sheets.
 * 
 * Each function leverages the Trading212ApiClient for API interactions and
 * then uses a utility function to write the fetched data to the corresponding sheet.
 */

/**
 * Writes fetched data to a specified Google Sheet and applies formatting.
 * This function assumes 'writeDataToSheet' and 'formatSheet' are globally available utility functions.
 *
 * @param {Array<Object>|Object} fetchedData - The data fetched from the API. Can be an array of items or a single object.
 * @param {string} sheetName - The name of the Google Sheet where data will be written.
 * @param {number} [startRow=2] - The row number to start writing data (default is 2).
 * @returns {void}
 */
function writeDataToSheetAndFormat(fetchedData, sheetName, startRow = 2) {
  try {
    const dataToWrite = Array.isArray(fetchedData) ? fetchedData : (fetchedData ? [fetchedData] : []);
    
    if (dataToWrite.length > 0) {
      writeDataToSheet(dataToWrite, sheetName, startRow); // Assumes writeDataToSheet is defined (e.g., in sheetManager.js)
      formatSheet(sheetName); // Assumes formatSheet is defined (e.g., in sheetFormattingManager.js)
      Logger.log(`Successfully wrote ${dataToWrite.length} items to ${sheetName}`);
    } else {
      Logger.log(`No data provided to write to ${sheetName}`);
    }
  } catch (error) {
    Logger.log(`Error in writeDataToSheetAndFormat for ${sheetName}: ${error.message}`);
    // Consider re-throwing or more specific error handling based on project needs
  }
}

/**
 * Fetches the "pies" data from the Trading212 API and writes it to the "Pies" sheet.
 * @returns {Promise<void>}
 */
async function fetchPies() {
  try {
    const apiClient = getApiClient();
    const piesData = await apiClient.getPies();
    writeDataToSheetAndFormat(piesData, API_RESOURCES.PIES.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchPies: ${error.message}`);
    // Optionally, re-throw or handle more gracefully (e.g., show a UI message)
  }
}

/**
* Fetches specific "pie" details from the Trading212 API and writes it to the "Pie Details" sheet.
* @param {Object} params - The parameters for the request.
* @param {string|number} params.id - The ID of the pie to fetch.
* @returns {Promise<void>}
* @throws {Error} Throws an error if the ID is not provided.
*/
async function fetchPie(params) {
  if (!params || typeof params.id === 'undefined') {
    const errorMessage = "Invalid or missing 'id' parameter for fetchPie.";
    Logger.log(`Error in fetchPie: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  try {
    const apiClient = getApiClient();
    const pieDetailData = await apiClient.getPieDetails(params.id);
    // API_RESOURCES.PIE.sheetName might need to be defined if it was removed, or use a generic name.
    // For now, assuming API_RESOURCES.PIE.sheetName is still available or use a hardcoded/derived name.
    // If API_RESOURCES.PIE was removed, ensure 'Pie Details' is correctly sourced.
    // Let's assume 'Pie Details' is the intended sheet name.
    writeDataToSheetAndFormat(pieDetailData, 'Pie Details'); 
  } catch (error) {
    Logger.log(`Error in fetchPie for ID ${params.id}: ${error.message}`);
  }
}

/**
 * Fetches the instruments list data from the Trading212 API and writes it to the "InstrumentsList" sheet.
 * @returns {Promise<void>}
 */
async function fetchInstrumentsList() {
  try {
    const apiClient = getApiClient();
    const instrumentsData = await apiClient.getInstrumentsList();
    writeDataToSheetAndFormat(instrumentsData, API_RESOURCES.INSTRUMENTS_LIST.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchInstrumentsList: ${error.message}`);
  }
}

/**
 * Fetches the account information data from the Trading212 API and writes it to the specified sheet.
 * @param {Object} [params={}] - Optional query parameters for the API call.
 * @returns {Promise<void>}
 */
async function fetchAccountInfo(params = {}) {
  try {
    const apiClient = getApiClient();
    const accountInfoData = await apiClient.getAccountInfo(params);
    writeDataToSheetAndFormat(accountInfoData, API_RESOURCES.ACCOUNT_INFO.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchAccountInfo: ${error.message}`);
  }
}

/**
 * Fetches the account cash data from the Trading212 API and writes it to the "Cash" sheet.
 * @returns {Promise<void>}
 */
async function fetchAccountCash() {
  try {
    const apiClient = getApiClient();
    const cashData = await apiClient.getAccountCash();
    writeDataToSheetAndFormat(cashData, API_RESOURCES.ACCOUNT_CASH.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchAccountCash: ${error.message}`);
  }
}

/**
 * Fetches the transactions data from the Trading212 API and writes it to the "Transactions" sheet.
 * @param {Object} [params={}] - Optional query parameters (e.g., cursor, limit).
 * @returns {Promise<void>}
 */
async function fetchTransactions(params = {}) {
  try {
    const apiClient = getApiClient();
    const queryParams = {
      limit: params.limit || 50, // Max 50, API default 20 (as per swagger for /history/transactions)
      ...(params.cursor && { cursor: params.cursor }),
    };
    const transactionsData = await apiClient.getTransactions(queryParams);
    writeDataToSheetAndFormat(transactionsData, API_RESOURCES.TRANSACTIONS.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchTransactions: ${error.message}`);
  }
}

/**
 * Fetches the orders history data from the Trading212 API and writes it to the specified sheet.
 * @param {Object} [params={}] - Optional query parameters (e.g., cursor, ticker, limit).
 * @returns {Promise<void>}
 */
async function fetchOrderHistory(params = {}) {
  try {
    const apiClient = getApiClient();
    const queryParams = {
      limit: params.limit || 20, // API default 20, max 50
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.ticker && { ticker: params.ticker }),
    };
    const ordersData = await apiClient.getOrderHistory(queryParams);
    writeDataToSheetAndFormat(ordersData, API_RESOURCES.ORDER_HISTORY.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchOrderHistory: ${error.message}`);
  }
}

/**
 * Fetches the dividend history data from the Trading212 API and writes it to the specified sheet.
 * @param {Object} [params={}] - Optional query parameters (e.g., cursor, ticker, limit).
 * @returns {Promise<void>}
 */
async function fetchDividends(params = {}) {
  try {
    const apiClient = getApiClient();
    const queryParams = {
      limit: params.limit || 50, // API default 20, max 50
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.ticker && { ticker: params.ticker }),
    };
    const dividendsData = await apiClient.getDividends(queryParams);
    writeDataToSheetAndFormat(dividendsData, API_RESOURCES.DIVIDENDS.sheetName);
  } catch (error) {
    Logger.log(`Error in fetchDividends: ${error.message}`);
  }
}

/**
* Fetches selected Trading212 data based on user choices.
* @param {string[]} selectedOptions - An array of strings representing the data types to fetch.
* @returns {Promise<string>} A message indicating data fetching completion status.
*/
async function fetchSelectedTrading212Data(selectedOptions) {
  const fetchFunctionsMap = {
    'Pies': fetchPies,
    'Account Info': fetchAccountInfo,
    'Cash Balance': fetchAccountCash,
    'Transactions': fetchTransactions,
    'Order History': fetchOrderHistory,
    'Dividends': fetchDividends
    // 'Pie Details' is excluded here as it requires an ID, 
    // which is not typically part of a bulk selection UI without further interaction.
  };

  if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    const errorMsg = 'Please select at least one data type to fetch';
    Logger.log(`Invalid or empty selectedOptions array in fetchSelectedTrading212Data: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const results = [];
  for (const option of selectedOptions) {
    try {
      if (fetchFunctionsMap[option]) {
        Logger.log(`Fetching ${option}...`);
        await fetchFunctionsMap[option](); // Await the async fetch function
        Logger.log(`Fetched ${option} successfully.`);
        results.push({ option, status: 'success' });
      } else {
        Logger.log(`Invalid option in fetchSelectedTrading212Data: ${option}`);
        results.push({ option, status: 'invalid_option' });
      }
    } catch (error) {
      Logger.log(`Error fetching ${option}: ${error.message}`);
      results.push({ option, status: 'error', message: error.message });
    }
  }
  
  const summaryMessage = `Data fetching process completed. Processed: ${JSON.stringify(results)}`;
  Logger.log(summaryMessage);
  return summaryMessage;
}
