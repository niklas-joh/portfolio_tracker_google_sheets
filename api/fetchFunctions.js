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

  // Inform UI which sheet is being fetched
  updateProgress(`Fetching data for ${sheetName} ...`);

  // Start fetching data
  fetchAndHandleData(url, sheetName, startRow, endpoint);

  // Format sheet when done
  formatSheet(sheetName);
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

    // Inform UI about progress of written rows
    updateProgress(`Fetched rows up to ${currentRow + rowsWritten - 1} for ${sheetName}`);

    // If there is more data (pagination), fetch the next page
    if (data.nextPagePath) {
      Logger.log('Fetching next page of data...: ' + data.nextPagePath);

      // Notify the UI that we are fetching another page
      updateProgress('Fetching additional data ...');

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
 * This efficiently fetches all pie-related data in a single operation, including:
 * - Basic pie data + settings merged into the "Pies" sheet
 * - Individual instrument details written to the "Pie Details" sheet
 * 
 * @returns {void}
 */
function fetchPies() {
  fetchPiesComplete();
}

/**
 * Fetches complete pie data from the Trading212 API with optimal efficiency.
 * Makes one call to get the pies list, then one call per pie to get detailed information.
 * Extracts and organizes data into two sheets:
 * - '🥧Pies' sheet: Basic pie data merged with settings (one row per pie)
 * - 'Pie Details' sheet: Instrument data with pie context (one row per instrument)
 * 
 * @returns {void}
 */
function fetchPiesComplete() {
  updateProgress('Fetching pies data...');
  
  // Step 1: Fetch pies list (basic data)
  const piesUrl = constructApiUrl(API_RESOURCES.PIES.endpoint);
  const piesResponse = rateLimitedRequest(piesUrl, API_RESOURCES.PIES.endpoint);
  
  if (!piesResponse) {
    Logger.log('Failed to fetch pies list');
    return;
  }
  
  const pies = piesResponse.items || piesResponse;
  
  if (!Array.isArray(pies) || pies.length === 0) {
    Logger.log('No pies found');
    return;
  }
  
  Logger.log(`Found ${pies.length} pies. Fetching details...`);
  
  let piesWithSettings = [];  // For '🥧Pies' sheet
  let allInstruments = [];     // For 'Pie Details' sheet
  
  // Step 2: Fetch detailed info for each pie (ONE call per pie)
  pies.forEach((pie, index) => {
    if (pie.id) {
      updateProgress(`Fetching pie ${index + 1} of ${pies.length}: ${pie.name || pie.id}`);
      
      const dynamicEndpoint = `${API_RESOURCES.PIES.endpoint}/${pie.id}`;
      const url = constructApiUrl(dynamicEndpoint);
      const pieDetails = rateLimitedRequest(url, API_RESOURCES.PIES.endpoint);
      
      if (pieDetails) {
        // Extract settings and merge with basic pie data
        if (pieDetails.settings) {
          piesWithSettings.push({
            ...pie,                    // id, cash, dividendDetails, result, progress, status
            ...pieDetails.settings     // creationDate, dividendCashAction, goal, icon, etc.
          });
        }
        
        // Extract instruments with pie context
        if (pieDetails.instruments) {
          const instrumentsWithPieInfo = pieDetails.instruments.map(inst => ({
            pieId: pie.id,
            pieName: pie.name,
            ...inst  // Spread all instrument fields - future-proof
          }));
          allInstruments = allInstruments.concat(instrumentsWithPieInfo);
        }
      } else {
        Logger.log(`Failed to fetch details for pie ${pie.id}`);
      }
    }
  });
  
  // Step 3: Write to BOTH sheets
  if (piesWithSettings.length > 0) {
    updateProgress(`Writing ${piesWithSettings.length} pies to sheet...`);
    writeDataToSheet(piesWithSettings, API_RESOURCES.PIES.sheetName);
    formatSheet(API_RESOURCES.PIES.sheetName);
  }
  
  if (allInstruments.length > 0) {
    updateProgress(`Writing ${allInstruments.length} instruments to sheet...`);
    writeDataToSheet(allInstruments, API_RESOURCES.PIE.sheetName);
    formatSheet(API_RESOURCES.PIE.sheetName);
  }
  
  updateProgress('Completed fetching all pie data');
  Logger.log(`Successfully wrote ${piesWithSettings.length} pies and ${allInstruments.length} instruments`);
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
 * Fetches the exchange list data from the Trading212 API and writes it to the "ExchangeList" sheet.
 * 
 * @returns {void}
 
 * @since 1.0.0
 * @version 1.0.0
 * @author [Niklas Johansson]
 * @license MIT
 * 
 */
function fetchExchanges() {
  fetchDataAndWriteToSheet(API_RESOURCES.EXCHANGE_LIST.endpoint, API_RESOURCES.EXCHANGE_LIST.sheetName);
}

/**
 * Fetches the account information data from the Trading212 API and writes it to the specified sheet.
 *
 * @param {Object} [params={}] - Optional query parameters for the API call (if any).
 * @returns {void}
 */
function fetchAccountInfo(params = {}) {
  fetchDataAndWriteToSheet(API_RESOURCES.ACCOUNT_INFO.endpoint, API_RESOURCES.ACCOUNT_INFO.sheetName);
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
 * Fetches all open positions from the Trading212 API and writes it to the "Portfolio" sheet.
 * Includes current prices, quantities, profit/loss, and other position details.
 * 
 * @returns {void}
 */
function fetchPortfolio() {
  fetchDataAndWriteToSheet(API_RESOURCES.PORTFOLIO.endpoint, API_RESOURCES.PORTFOLIO.sheetName);
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
    cursorID: params.cursor || 'string',  // Default to 'string'
    limit: params.limit || 50,            // Max 50, API documentation defaults to 20
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
    limit: params.limit || 50         // Max 50, API documentation defaults to 20
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



/**
* Fetches selected Trading212 data based on user choices.
* 
* @function
* @name fetchSelectedTrading212Data
* @param {string[]} selectedOptions - An array of strings representing the data types to fetch.
* @returns {string} A message indicating that data fetching is complete.
* @description This function takes an array of selected data types and calls the corresponding
*              fetch functions for each selected type. It handles errors for individual fetch
*              operations and logs them without stopping the entire process.
* @example
* fetchSelectedTrading212Data(['pies', 'accountInfo', 'transactions']);
*/
function fetchSelectedTrading212Data(selectedOptions) {
  const fetchFunctions = {
    'Pies': fetchPies,
    'Account Info': fetchAccountInfo,
    'Cash Balance': fetchAccountCash,
    'Portfolio': fetchPortfolio,
    'Transactions': fetchTransactions,
    'Order History': fetchOrderHistory,
    'Dividends': fetchDividends
  };

  // Iterate through each selected option
  const option = selectedOptions[0];
    // Check if a fetch function exists for the current option
    if (fetchFunctions[option]) {
      try {
        // Execute the fetch function for the current option
        const result = fetchFunctions[option]();
        console.log(`Fetched ${option}:`, result);  // Add logging
        return result;
      } catch (error) {
        // If an error occurs during fetch, log it using the Logger
        console.error(`Error fetching ${option}:`, error);  // Add error logging
        throw error;
      }
    }
    else {
      console.error(`Invalid option: ${option}`);  // Add error logging
      throw new Error(`Invalid option: ${option}`);
    }
  }
