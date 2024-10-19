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
 * - `fetchAccountMetaData()`
 * - `fetchTransactions()`
 * - `fetchOrderHistory()`
 */

/**
 * Fetches data from a Trading212 API endpoint and writes it to a specified Google Sheet.
 * Automatically handles pagination if `nextPagePath` is present in the API response.
 * Utilizes rate limiting to comply with API request limits.
 *
 * @param {string} endpoint - The API endpoint path (e.g., 'equity/pies').
 * @param {string} sheetName - The name of the Google Sheet where data will be written.
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., { limit: 50 }).
 * @param {number} [startRow=2] - The row number to start writing data (default is 2).
 * @returns {void}
 */
function fetchDataAndWriteToSheet(endpoint, sheetName, params = {}, startRow = 2) {
  // Construct the initial API URL
  let url = constructApiUrl(endpoint, params);
  
  // Start fetching data
  fetchAndHandleData(url, sheetName, startRow, endpoint);
}

/**
 * Fetches a page of data, writes it to the sheet, and handles pagination recursively.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {string} sheetName - The name of the Google Sheet where data will be written.
 * @param {number} currentRow - The current row number to start writing data.
 * @param {string} endpoint - The API endpoint to use for rate limiting.
 */
function fetchAndHandleData(url, sheetName, currentRow, endpoint) {
  // Make the API request with rate limiting
  let data = rateLimitedRequest(url, endpoint);

  if (data) {
    // Write the data and calculate the next row to write
    const rowsWritten = writeDataToSheet(data.items || data, sheetName, currentRow);

    // If there is more data (pagination), fetch the next page
    if (data.nextPagePath) {
      Logger.log('Fetching next page of data...: ' + data.nextPagePath);

      // Construct the next page URL
      const nextPageUrl = constructApiUrl(data.nextPagePath, {}, true);

      // Recursively fetch the next page
      fetchAndHandleData(nextPageUrl, sheetName, currentRow + rowsWritten, endpoint);
    } else {
      Logger.log('No more data to fetch.');
    }
  } else {
    Logger.log(`Error fetching data for ${sheetName}.`);
  }
}

/**
 * Fetches the "pies" data from the Trading212 API and writes it to the "Pies" sheet.
 * 
 * @returns {void}
 */
function fetchPies() {
  fetchDataAndWriteToSheet(API_RESOURCES.PIES.endpoint, API_RESOURCES.PIES.sheetName);
}

/**
 * Fetches the instruments list data from the Trading212 API and writes it to the "InstrumentsList" sheet.
 * 
 * @returns {void}
 */
function fetchInstrumentsList() {
  fetchDataAndWriteToSheet(API_RESOURCES.INSTRUMENTS_LIST.endpoint, API_RESOURCES.INSTRUMENTS_LIST.sheetName);
}

/**
 * Fetches the account cash data from the Trading212 API and writes it to the "Cash" sheet.
 * 
 * @returns {void}
 */
function fetchAccountCash() {
  fetchDataAndWriteToSheet(API_RESOURCES.ACCOUNT_CASH.endpoint, API_RESOURCES.ACCOUNT_CASH.sheetName);
}

/**
 * Fetches the transactions data from the Trading212 API (version: v0) and writes it to the "Transactions" sheet.
 * Supports query parameters (e.g., limit, cursor).
 * Automatically handles pagination via the nextPagePath if returned by the API.
 * 
 * @example
 * fetchTransactions({ limit: 50, cursor: 'string' }); // Fetches 50 transactions with page navigation
 * as string (other options are unknown at the moment)
 * 
 * @version v0
 * @param {Object} [params={}] - Optional query parameters for the API call (e.g., cursor, limit).
 * @returns {void}
 */

function fetchTransactions(params = {}) {
  // Declare parameters as a variable
  const queryParams = {
    cursorID: params.cursor || 'string',    // Default to 'string'    
    limit: params.limit || 50,              // Max 50, API documentation defaults to 20
  };

   // Call the generic fetchDataAndWriteToSheet function with the query parameters
  fetchDataAndWriteToSheet(API_RESOURCES.TRANSACTIONS.endpoint, API_RESOURCES.TRANSACTIONS.sheetName, queryParams);
}

/**
 * Fetches the orders history data from the Trading212 API and writes it to the specified sheet.
 * Supports pagination with a cursor and allows filtering by ticker and limit.
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
 * Automatically handles pagination via the nextPagePath if returned by the API.
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
