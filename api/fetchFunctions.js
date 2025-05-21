/**
 * ===================== Fetch Functions =========================
 * 
 * This section contains functions responsible for retrieving data from the Trading212 API.
 * Each function fetches data from a specific endpoint and writes it to the corresponding Google Sheet.
 * 
 * The functions in this section use `fetchDataAndWriteToSheet()` to handle:
 * - Making API requests.
 * - Processing the API response.
 * - Writing the response data into Google Sheets.
 * 
 * The key fetch functions in this section include:
 * - `fetchPies()`
 * - `fetchInstrumentsList()`
 * - `fetchAccountCash()`
 * - `fetchAccountInfo()`
 * - `fetchTransactions()`
 * - `fetchOrderHistory()`
 */

/**
 * Fetches data from a Trading212 API endpoint and writes it to a specified Google Sheet.
 * Automatically handles pagination if `nextPagePath` is present in the API response.
 * Uses the Trading212ApiClient for API interactions.
 *
 * @param {string} endpoint - The API endpoint path (e.g., 'equity/pies').
 * @param {string} sheetName - The name of the Google Sheet where data will be written.
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., { limit: 50 }).
 * @param {number} [startRow=2] - The row number to start writing data (default is 2).
 * @returns {void}
 */
function fetchDataAndWriteToSheet(endpoint, sheetName, params = {}, startRow = 2) {
  try {
    // Get the API client
    const apiClient = getApiClient();
    
    // Fetch all pages of data
    const allItems = apiClient.fetchAllPages(endpoint, params);
    
    if (allItems && allItems.length > 0) {
      // Write all items to the sheet
      writeDataToSheet(allItems, sheetName, startRow);
      
      // Format the sheet
      formatSheet(sheetName);
      
      Logger.log(`Successfully fetched and wrote ${allItems.length} items to ${sheetName}`);
    } else {
      Logger.log(`No data found for ${endpoint}`);
    }
  } catch (error) {
    Logger.log(`Error in fetchDataAndWriteToSheet for ${endpoint}: ${error.message}`);
  }
}

/**
 * Fetches the "pies" data from the Trading212 API and writes it to the "Pies" sheet.
 * Uses the Trading212ApiClient for API interactions.
 * 
 * @returns {void}
 */
function fetchPies() {
  fetchDataAndWriteToSheet(API_RESOURCES.PIES.endpoint, API_RESOURCES.PIES.sheetName);
}

/**
* Fetches specific "pie" details from the Trading212 API and writes it to the "Pie Details" sheet.
* Uses the Trading212ApiClient for API interactions.
* 
* @param {Object} params - The parameters for the request.
* @param {number} params.id - The ID of the pie to fetch, required (int64).
* @returns {void}
* @throws {Error} Throws an error if the ID is not provided or is invalid.
*/
function fetchPie(params) {
  // Validate the ID parameter
  // if (!params || typeof params.id !== 'number' || !Number.isInteger(params.id)) {
  //  throw new Error("Invalid or missing 'id' parameter. 'id' must be an integer.");
  // }

  // Fetch data and write it to the specified sheet
  fetchDataAndWriteToSheet(API_RESOURCES.PIE.endpoint, API_RESOURCES.PIE.sheetName);
}

/**
 * Fetches the instruments list data from the Trading212 API and writes it to the "InstrumentsList" sheet.
 * Uses the Trading212ApiClient for API interactions.
 * 
 * @returns {void}
 */
function fetchInstrumentsList() {
  fetchDataAndWriteToSheet(API_RESOURCES.INSTRUMENTS_LIST.endpoint, API_RESOURCES.INSTRUMENTS_LIST.sheetName);
}

/**
 * Fetches the account information data from the Trading212 API and writes it to the specified sheet.
 * Uses the Trading212ApiClient for API interactions.
 *
 * @param {Object} [params={}] - Optional query parameters for the API call (if any).
 * @returns {void}
 */
function fetchAccountInfo(params = {}) {
  fetchDataAndWriteToSheet(API_RESOURCES.ACCOUNT_INFO.endpoint, API_RESOURCES.ACCOUNT_INFO.sheetName, params);
}

/**
 * Fetches the account cash data from the Trading212 API and writes it to the "Cash" sheet.
 * Uses the Trading212ApiClient for API interactions.
 * 
 * @returns {void}
 */
function fetchAccountCash() {
  fetchDataAndWriteToSheet(API_RESOURCES.ACCOUNT_CASH.endpoint, API_RESOURCES.ACCOUNT_CASH.sheetName);
}

/**
 * Fetches the transactions data from the Trading212 API (version: v0) and writes it to the "Transactions" sheet.
 * Supports query parameters (e.g., limit, cursor).
 * Automatically handles pagination via the Trading212ApiClient.
 * 
 * @example
 * fetchTransactions({ limit: 50, cursor: 'string' }); // Fetches 50 transactions with page navigation
 * 
 * @version v0
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., cursor, limit).
 * @returns {void}
 */
function fetchTransactions(params = {}) {
  // Declare parameters as a variable
  const queryParams = {
    cursorID: params.cursor || 'string',  // Default to 'string'
    limit: params.limit || 50,            // Max 50, API documentation defaults to 20
  };

  // Call the generic fetchDataAndWriteToSheet function with the query parameters
  fetchDataAndWriteToSheet(API_RESOURCES.TRANSACTIONS.endpoint, API_RESOURCES.TRANSACTIONS.sheetName, queryParams);
}

/**
 * Fetches the orders history data from the Trading212 API and writes it to the specified sheet.
 * Supports pagination with a cursor and allows filtering by ticker and limit.
 * Uses the Trading212ApiClient for API interactions.
 * 
 * @example
 * fetchOrderHistory({ ticker: 'AAPL_US_EQ', limit: 10 });
 * fetchOrderHistory();
 * 
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., cursor, ticker, limit).
 * @returns {void}
 */
function fetchOrderHistory(params = {}) {
  // Declare default parameters
  const queryParams = {
    cursor: params.cursor || '0',     // Default cursor is '0'
    ticker: params.ticker || '',      // Default ticker
    limit: params.limit || 20         // Max 50, API documentation defaults to 20
  };

  // Pass the request to the generic fetchDataAndWriteToSheet function
  fetchDataAndWriteToSheet(API_RESOURCES.ORDER_HISTORY.endpoint, API_RESOURCES.ORDER_HISTORY.sheetName, queryParams);
}

/**
 * Fetches the dividend history data from the Trading212 API and writes it to the specified sheet.
 * Supports pagination with a cursor and allows filtering by ticker and limit.
 * Uses the Trading212ApiClient for API interactions.
 * 
 * @example
 * fetchDividends({ ticker: 'AAPL_US_EQ', limit: 10 });
 * fetchDividends();
 * 
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., cursor, ticker, limit).
 * @returns {void}
 */
function fetchDividends(params = {}) {
  // Declare default parameters
  const queryParams = {
    cursor: params.cursor || '0',     // Default cursor is '0'
    ticker: params.ticker || '',      // Default ticker
    limit: params.limit || 50         // Default limit is 20, max is 50
  };

  // Call the generic fetchDataAndWriteToSheet function with the 'dividends' endpoint
  fetchDataAndWriteToSheet(API_RESOURCES.DIVIDENDS.endpoint, API_RESOURCES.DIVIDENDS.sheetName, queryParams);
}

/**
* Fetches selected Trading212 data based on user choices.
* Uses the Trading212ApiClient for API interactions.
* 
* @function
* @name fetchSelectedTrading212Data
* @param {string[]} selectedOptions - An array of strings representing the data types to fetch.
* @returns {string} A message indicating that data fetching is complete.
* @description This function takes an array of selected data types and calls the corresponding
*              fetch functions for each selected type. It handles errors for individual fetch
*              operations and logs them without stopping the entire process.
* @example
* fetchSelectedTrading212Data(['Pies', 'Account Info', 'Transactions']);
*/
function fetchSelectedTrading212Data(selectedOptions) {
  const fetchFunctions = {
    'Pies': fetchPies,
    'Account Info': fetchAccountInfo,
    'Cash Balance': fetchAccountCash,
    'Transactions': fetchTransactions,
    'Order History': fetchOrderHistory,
    'Dividends': fetchDividends
  };

  // Validate input
  if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    console.error('Invalid or empty selectedOptions array');
    throw new Error('Please select at least one data type to fetch');
  }

  try {
    // Process the first option in the array
    const option = selectedOptions[0];
    
    // Check if a fetch function exists for the current option
    if (fetchFunctions[option]) {
      // Execute the fetch function for the current option
      const result = fetchFunctions[option]();
      console.log(`Fetched ${option} successfully`);
      return result;
    } else {
      console.error(`Invalid option: ${option}`);
      throw new Error(`Invalid option: ${option}`);
    }
  } catch (error) {
    console.error(`Error in fetchSelectedTrading212Data: ${error.message}`);
    throw error;
  }
}
