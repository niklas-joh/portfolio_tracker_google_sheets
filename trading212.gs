/**
 * ========================= Constants ============================
 * 
 * This section defines constants used throughout the codebase to avoid magic numbers, strings, or hardcoding of key values.
 * 
 * Constants help make the code more maintainable, as these values are defined in one place and can be easily updated if needed.
 * 
 * The constants include:
 * - `API_DOMAIN`: The domain for calling the Trading212 API, used to construct final URLs.
 * - `API_VERSION`: The API version used. Used to construct the base URL.
 * - `API_BASE_URL`: The concatenation of API_DOMAIN and API_VERSION used to construct various endpoint URLs.
 * - `SHEET_NAMES`: An object that maps to the names of the Google Sheets where data will be written.
 * - `API_ENDPOINT`: An object mapping logical names to API endpoint paths.
 * - `RATE_LIMITS`: An object defining rate limits for each API endpoint.
 */

// Constants for managing API base URL and versioning
const API_DOMAIN = 'https://live.trading212.com';
const API_VERSION = '/api/v0/';  // Keep versioning separate to allow easier upgrades

// Combine for initial API requests, but not for pagination (already includes API_VERSION)
const API_BASE_URL = `${API_DOMAIN}${API_VERSION}`;

// Simplify writing time related values
const SECOND = 1000;         // 1000 milliseconds in a second
const MINUTE = 60 * SECOND;  // 60 seconds in a minute
const HOUR = 60 * MINUTE;    // 60 minutes in an hour


/**
 * ========================= API Resources ============================
 * 
 * This section defines a central object that maps resource names to their corresponding
 * API endpoint, Google Sheet name, and rate limit configuration.
 * 
 * Each resource includes:
 * - `endpoint`: The API endpoint for the Trading212 resource (e.g., 'equity/pies').
 * - `sheetName`: The corresponding Google Sheet where the data will be written.
 * - `rateLimit`: An object specifying the rate limit and time window for the API.
 */

// Centralized constants to manage API endpoints, sheet names, and rate limits
const API_RESOURCES = {
  PIES: {
    endpoint: 'equity/pies',
    sheetName: 'Pies',
    rateLimit: { limit: 1, windowMs: 30 * SECOND } 
  },
  INSTRUMENTS_LIST: {
    endpoint: 'equity/metadata/instruments',
    sheetName: 'InstrumentsList',
    rateLimit: { limit: 1, windowMs: 50 * SECOND }
  },
  ACCOUNT_CASH: {
    endpoint: 'equity/account/cash',
    sheetName: 'Cash',
    rateLimit: { limit: 6, windowMs: 1 * SECOND }
  },
  ACCOUNT_INFO: {
    endpoint: 'equity/account/info',
    sheetName: 'AccountInfo',
    rateLimit: { limit: 6, windowMs: 30 * SECOND }
  },
  TRANSACTIONS: {
    endpoint: 'history/transactions',
    sheetName: '212Transactions',
    rateLimit: { limit: 6, windowMs: 1 * MINUTE }
  },
  ORDER_HISTORY: {
    endpoint: 'equity/history/orders',
    sheetName: 'History',
    rateLimit: { limit: 6, windowMs: 1 * MINUTE }
  },
  DIVIDENDS: {
    endpoint: 'history/dividends',
    sheetName: 'Dividends',
    rateLimit: { limit: 6, windowMs: 1 * MINUTE }
  }
};

/**
 * ===================== onOpen Function ===========================
 */

/**
 * Adds a custom menu to the spreadsheet when it is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Trading212')
    .addItem('Set API Key', 'promptApiKey')
    .addToUi();
}

/**
 * ===================== UI Interaction Functions ==================
 */

/**
 * Prompts the user to enter their API key and stores it in User Properties.
 * This function should be called from a context with UI access, such as a custom menu item.
 */
function promptApiKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Enter your Trading212 API Key', 'Please enter your API key:', ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() == ui.Button.OK) {
    var apiKey = response.getResponseText();
    if (apiKey) {
      PropertiesService.getUserProperties().setProperty('API_KEY', apiKey);
      ui.alert('API Key saved successfully.');
    } else {
      ui.alert('No API Key entered. Please try again.');
    }
  } else {
    ui.alert('API Key entry canceled.');
  }
}

/**
 * Retrieves the stored API key from User Properties.
 * If the API key is not set, logs an error message.
 *
 * @returns {string|null} The stored API key, or null if not available.
 */
function getAuthKey() {
  var apiKey = PropertiesService.getUserProperties().getProperty('API_KEY');
  if (!apiKey) {
    Logger.log('API Key is not set. Please use the "Trading212 > Set API Key" menu to enter your API key.');
    // Optionally, you could throw an error or notify the user through other means
  }
  return apiKey;
}
/**
 * ===================== Class Definitions =========================
 */
/**
 * Class representing a rate limiter for API endpoints.
 */
class RateLimiter {
  /**
   * Creates a rate limiter with the given rate limits.
   * 
   * @param {Object} rateLimits - An object mapping endpoints to their rate limits and time windows.
   */
  constructor(rateLimits) {
    this.rateLimits = rateLimits;
    this.requestLogs = {}; // Stores timestamps of requests per endpoint
  }

  /**
   * Checks if a request to the given endpoint can proceed based on the rate limits.
   * 
   * @param {string} endpoint - The API endpoint path.
   * @returns {Object} An object containing a `proceed` boolean and an optional `waitTime`.
   */
  canProceed(endpoint) {
    const now = Date.now();
    const rateLimit = this.rateLimits[endpoint];

    // If no rate limit is defined for the endpoint, proceed with the request
    if (!rateLimit) {
      return { proceed: true };
    }

    // Initialize the request log for the endpoint if it doesn't exist
    if (!this.requestLogs[endpoint]) {
      this.requestLogs[endpoint] = [];
    }

    // Remove timestamps outside the time window
    this.requestLogs[endpoint] = this.requestLogs[endpoint].filter(
      timestamp => now - timestamp < rateLimit.windowMs
    );

    // Check if we can proceed with the request
    if (this.requestLogs[endpoint].length < rateLimit.limit) {
      // Log the request timestamp
      this.requestLogs[endpoint].push(now);
      return { proceed: true };
    } else {
      // Calculate the wait time until the earliest request falls outside the time window
      const earliestTimestamp = this.requestLogs[endpoint][0];
      const waitTime = rateLimit.windowMs - (now - earliestTimestamp);
      return { proceed: false, waitTime };
    }
  }
}

/**
 * ===================== Initialization ============================
 */

// Extract the rate limits from API_RESOURCES and map them to the endpoint paths
const RATE_LIMITS = Object.fromEntries(
  Object.entries(API_RESOURCES).map(([key, resource]) => [resource.endpoint, resource.rateLimit])
);

// Initialize RateLimiter (singleton instance) with extracted rate limits
const rateLimiter = new RateLimiter(RATE_LIMITS);

/**
 * ===================== Rate Limiter Functions =====================
 * 
 * This section implements a centralized rate limiter to manage API call limits.
 * It ensures that API requests adhere to the rate limits specified for each endpoint.
 * 
 * The rate limiter tracks the number of requests made to each endpoint within their respective time windows.
 * If the rate limit is reached, it calculates the necessary wait time before the next request can proceed.
 * 
 * Functions in this section include:
 * - `RateLimiter`: A class that encapsulates rate-limiting logic.
 * - `canProceedWithRequest`: A function that checks if a request can proceed or needs to wait.
 */

/**
 * Checks if a request to the given endpoint can proceed based on rate limits.
 * 
 * @param {string} endpoint - The API endpoint path.
 * @returns {Object} An object containing a `proceed` boolean and an optional `waitTime`.
 */
function canProceedWithRequest(endpoint) {
  return rateLimiter.canProceed(endpoint);
}

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


/**
 * ===================== Utility Functions ========================
 * 
 * This section contains utility functions for making API requests,handling
 * errors, and constructing URLs.
 * 
 * These functions abstract common operations to avoid redundancy and ensure
 * that the same logic is applied consistently throughout the codebase.
 * 
 * Functions in this section include:
 * - `makeApiRequest`: Handles GET requests to the API and logs errors.
 */


/**
 * Constructs the full API URL based on the endpoint and optional query parameters.
 * Handles both initial and paginated API requests.
 * 
 * @param {string} endpointOrPath - The API endpoint path (e.g., 'pies') or nextPagePath (e.g., '/api/v0/...').
 * @param {Object} [params={}] - Optional query parameters for the API call.
 * @param {boolean} [isNextPage=false] - Flag indicating if it's a paginated request.
 * @returns {string} The full constructed API URL.
 */
function constructApiUrl(endpointOrPath, params = {}, isNextPage = false) {
  // Handle nextPagePath (pagination) if isNextPage is true
  if (isNextPage) {
    return `${API_DOMAIN}${endpointOrPath}`;  // Prepend the domain to the relative nextPagePath
  }

  // Construct URL for initial API request
  let url = `${API_BASE_URL}${endpointOrPath}`;

  // Append query parameters if present
  if (Object.keys(params).length > 0) {
    url += '?' + formatParams(params);
  }

  Logger.log('Constructed URL: ' + url);  // Log the constructed URL for debugging
  return url;
}

/**
 * Formats an object of parameters into a query string for a URL.
 * 
 * @param {Object} params - The parameters to format.
 * @returns {string} The formatted query string (e.g., 'key1=value1&key2=value2').
 */
function formatParams(params) {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * Logs a message when no data is found for a given API request.
 *
 * @param {string} ticker - The ticker symbol for which data was queried.
 * @param {string} sheetName - The name of the sheet where data would have been written.
 */
function logNoDataFound(ticker, sheetName) {
  Logger.log(`No data found for ticker "${ticker}" in sheet "${sheetName}".`);
}

/**
 * ===================== API Request Function ========================
 * 
 * This section contains the function responsible for making API requests,
 * applying rate limiting, and delegates error handling to handleApiError.
 *
 
 /**
 * Makes a rate-limited API request to the provided URL.
 * Handles rate limiting based on the endpoint.
 *
 * @param {string} url - The full API URL to make the GET request to.
 * @param {string} endpoint - The API endpoint path (used for rate limiting).
 * @returns {Object|null} The JSON-parsed response data if successful, or null if an error occurred.
 */
function rateLimitedRequest(url, endpoint) {
  // Check rate limiting
  const rateLimitStatus = canProceedWithRequest(endpoint);

  if (!rateLimitStatus.proceed) {
    Logger.log(`Rate limit reached for ${endpoint}. Waiting for ${rateLimitStatus.waitTime} ms.`);

    // Ensure we don't exceed execution time limits
    if (rateLimitStatus.waitTime > 300000) { // 5 minutes
      throw new Error('Wait time exceeds script execution time limits.');
    }

    // Wait for the required time before proceeding
    Utilities.sleep(rateLimitStatus.waitTime);
  }

    Logger.log('Making API request to URL: ' + url);  // Add this log
    Logger.log(`Rate-limited request made for: ${url} on endpoint: ${endpoint}`);

  // Proceed with the API request
  return makeApiRequest(url);
}

/**
 * Makes a GET request to the provided API URL using the authorization key.
 * Handles successful responses and errors.
 *
 * @param {string} url - The full API URL to make the GET request to.
 * @returns {Object|null} The JSON-parsed response data if successful, or null if an error occurred.
 */
function makeApiRequest(url) {
  var authKey = getAuthKey();
  if (!authKey) {
    Logger.log('Cannot make API request without an API Key.');
    return null;
  }

  var options = {
    method: 'GET',
    headers: {
      Authorization: authKey,
    },
    muteHttpExceptions: true,
  };

  try {
    Logger.log('Making API request to URL: ' + url);

    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();

    if (statusCode === 200) {
      // Successful response
      var jsonData = JSON.parse(response.getContentText());
      Logger.log('API Data: ' + JSON.stringify(jsonData, null, 2));
      return jsonData;
    } else {
      // Handle errors
      return handleApiError(response);
    }

  } catch (error) {
    Logger.log('An error occurred: ' + error.message);
    return null;
  }
}

/**
 * Logs a message when no data is found for a given API request.
 *
 * @param {string} ticker - The ticker symbol for which data was queried.
 * @param {string} sheetName - The name of the sheet where data would have been written.
 */
function logNoDataFound(ticker, sheetName) {
  Logger.log(`No data found for ticker "${ticker}" in sheet "${sheetName}".`);
}

/**
 * Handles pagination by checking for nextPagePath and recursively fetching the next page if it exists.
 * 
 * @param {Object} data - The API response data containing nextPagePath (if available).
 * @param {string} sheetName - The name of the sheet where the data will be written.
 * @param {number} nextStartRow - The row to continue writing data in case of pagination.
 */
function handlePagination(data, sheetName, nextStartRow) {
  if (data.nextPagePath) {
    Logger.log('Fetching next page of data...: ' + data.nextPagePath);
    
    // Recursively fetch the next page
    fetchDataAndWriteToSheet(data.nextPagePath, sheetName, {}, nextStartRow, true);
  } else {
    Logger.log('No more data to fetch.');
  }
}

/**
 * ===================== Sheet Management ========================
 * 
 * This section contains functions that are responsible for managing 
 * Google Sheets. These functions ensure that the target sheet exists, 
 * clear existing content, and write new data, such as headers and rows.
 * 
 * These functions simplify common Google Sheets tasks such as:
 * - Checking for or creating a sheet if it does not exist (`getOrCreateSheet`).
 * - Clearing sheets and writing headers (`clearSheetAndWriteHeaders`).
 * - Writing rows of data to the sheet (`writeRowsToSheet`).
 * 
 * By using these utility functions, the main code remains clean, 
 * and the sheet operations are consistently handled.
 */


/**
 * Checks if a Google Sheets sheet with the given name exists, and if not, creates it.
 * 
 * @param {string} sheetName - The name of the sheet to check or create.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The existing or newly created sheet.
 */
function getOrCreateSheet(sheetName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);

  // If the sheet does not exist, create it
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    Logger.log('Sheet "' + sheetName + '" did not exist and was created.');
  } else {
    Logger.log('Sheet "' + sheetName + '" already exists.');
  }

  return sheet;
}

/**
 * Clears the content of a sheet and writes headers to the first row.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to clear and write to.
 * @param {Array<string>} headers - The headers to write in the first row.
 */
function clearSheetAndWriteHeaders(sheet, headers) {
  sheet.clear();  // Clear previous content
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    Logger.log('No headers to write');
  }
}
/**
 * ===================== Data Processing Functions ========================
 * 
 * The functions in this section handle the dynamic generation of headers 
 * from the data retrieved from the API, as well as writing both the headers 
 * and data to the Google Sheets. They support both single object responses 
 * and arrays of objects.
 * 
 * Key functions include:
 * - `processAndWriteDataDynamically`: Dynamically generates headers and 
 *   writes data to the sheet, handling both single and multiple data objects.
 * - `extractHeaders`: Recursively extracts headers (field paths) from 
 *   nested JSON objects.
 * - `resolveNestedField`: Extracts values from nested objects based on 
 *   a dot-separated path.
 */

/**
 * Writes data to the specified Google Sheet, starting from the provided row.
 * 
 * @param {Object|Array} data - The data to write (can be an object or array of objects).
 * @param {string} sheetName - The name of the sheet where data will be written.
 * @param {number} [startRow=2] - The row number to start writing data (default is 2).
 * @returns {number} - The number of rows written.
 */
function writeDataToSheet(data, sheetName, startRow = 2) {
  const sheet = getOrCreateSheet(sheetName);
  const isArray = Array.isArray(data);
  const headers = isArray ? extractHeaders(data[0]) : extractHeaders(data);

  // Write headers if starting from row 2 (first page of data)
  if (startRow === 2) {
    clearSheetAndWriteHeaders(sheet, headers);
  }

  // Prepare data rows
  const rowData = isArray
    ? data.map(item => headers.map(header => resolveNestedField(item, header)))
    : [headers.map(header => resolveNestedField(data, header))];

  Logger.log(`Raw rowData: ${JSON.stringify(rowData)}`);

  // Write data to the sheet
  writeRowsToSheet(sheet, rowData, startRow);

  // Return the number of rows written
  return rowData.length;
}


/**
 * Writes row data to the given sheet starting from the specified row index.
 * Handles the case where resolveNestedField returns an array, spreading it across multiple columns.
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to write the data into.
 * @param {Array<Array<string>>} rowData - The data to write into the sheet.
 * @param {number} startRow - The row number to start writing the data (default is 2).
 */
function writeRowsToSheet(sheet, rowData, startRow = 2) {
  if (!sheet) {
    Logger.log('No valid sheet found to write data.');
    return;
  }

  rowData.forEach((row, rowIndex) => {
    // Flatten the row if any cell contains an array (spread array values across columns)
    const flattenedRow = row.flatMap(cell => Array.isArray(cell) ? cell : [cell]);

    // Log the row data being written for debugging purposes
    Logger.log(`Writing row ${startRow + rowIndex}: ${JSON.stringify(flattenedRow)}`);

    // Write the flattened row to the sheet
    sheet.getRange(startRow + rowIndex, 1, 1, flattenedRow.length).setValues([flattenedRow]);
  });
}

/**
 * ===================== Data Processing Functions ========================
 * 
 * The functions in this section handle the dynamic generation of headers 
 * from the data retrieved from the API, as well as writing both the headers 
 * and data to the Google Sheets. They support both single object responses 
 * and arrays of objects.
 * 
 * Key functions include:
 * - `processAndWriteDataDynamically`: Dynamically generates headers and 
 *   writes data to the sheet, handling both single and multiple data objects.
 * - `extractHeaders`: Recursively extracts headers (field paths) from 
 *   nested JSON objects.
 * - `resolveNestedField`: Extracts values from nested objects based on 
 *   a dot-separated path.
 */

/**
 * Dynamically writes data to a Google Sheet, starting from the specified row.
 * Supports both single object and array of objects as input.
 * 
 * @param {Object|Array} data - The data to be written into the sheet (can be an object or array of objects).
 * @param {string} sheetName - The name of the sheet where data should be written.
 * @param {number} [startRow=2] - The row where the data should start being written.
 * @returns {number} - The number of rows written to the sheet.
 */
function processAndWriteDataDynamically(data, sheetName, startRow = 2) {
  const sheet = getOrCreateSheet(sheetName);
  
  // Extract headers from the data (first write headers if not already written)
  const isArray = Array.isArray(data);
  const headers = isArray ? extractHeaders(data[0]) : extractHeaders(data);

  // If this is the first page of data (starting from row 2), write the headers
  if (startRow === 2) {
    clearSheetAndWriteHeaders(sheet, headers);
  }

  // Prepare data rows using map
  const rowData = isArray
    ? data.map(item => headers.map(header => resolveNestedField(item, header)))
    : [headers.map(header => resolveNestedField(data, header))];

  // Write the data starting from the specified startRow
  writeRowsToSheet(sheet, rowData, startRow);

  // Return the number of rows written
  return rowData.length;
}

/**
 * ===================== Data Extraction Functions ========================
 * 
 * This section contains functions for extracting headers and resolving
 * nested fields in the data.
 */

/**
 * Recursively extracts the headers (field paths) from a JSON object.
 * Handles arrays within objects and generates additional headers for array elements.
 *
 * @param {Object} obj - The object from which to extract headers.
 * @param {string} [parent=''] - The parent path for nested objects (used during recursion).
 * @returns {Array<string>} A list of dot-separated field paths representing the headers.
 */
function extractHeaders(obj, parent = '') {
  let headers = [];

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let path = parent ? `${parent}.${key}` : key;

      // Handle nested objects and arrays
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (Array.isArray(obj[key])) {
          // Extract headers from the first item in the array (assuming uniform structure)
          const firstItem = obj[key][0];
          headers = headers.concat(extractHeaders(firstItem, path));
        } else {
          // Recursively extract headers for nested objects
          headers = headers.concat(extractHeaders(obj[key], path));
        }
      } else {
        headers.push(path);  // Otherwise, it's a simple value, add it as a header
      }
    }
  }

  return headers;
}

/**
 * Resolves the value of a nested field in an object, given a dot-separated path.
 * Handles arrays and nested objects by flattening them if necessary.
 * 
 * @param {Object} obj - The object to resolve the field from.
 * @param {string} path - The dot-separated path to the field.
 * @returns {*} The resolved value, or a flattened representation if it's an array or object.
 */
function resolveNestedField(obj, path) {
  const keys = path.split('.');
  return resolveFieldRecursive(obj, keys, 0);
}

/**
 * Recursively resolves the field by traversing through keys, handling arrays and objects as needed.
 * 
 * @param {Object|Array} obj - The object or array to resolve.
 * @param {Array} keys - The array of keys from the dot-separated path.
 * @param {number} index - The current position in the keys array.
 * @returns {*} The resolved value or a flattened representation if it's an array or object.
 */
function resolveFieldRecursive(obj, keys, index) {
  if (obj === null || obj === undefined) return '';  // Early return if value is null or undefined
  const key = keys[index];

  // If the value is an array, resolve for each element in the array
  if (Array.isArray(obj[key])) {
    return obj[key].map(item => resolveFieldRecursive(item, keys, index + 1)).join(', ');
  }

  const value = obj[key];

  // If this is the last key, return the final value, flattening objects if necessary
  if (index === keys.length - 1) {
    if (typeof value === 'object' && value !== null) {
      return flattenObject(value);  // Flatten the object if necessary
    }
    return value !== undefined ? value : '';  // Return value or empty string if undefined
  }

  // Continue recursion for the next key
  return resolveFieldRecursive(value, keys, index + 1);
}


/**
 * Resolves an array by recursively resolving fields for each element, based on the remaining keys.
 * 
 * @param {Array} arr - The array to resolve.
 * @param {Array} keys - The array of keys from the dot-separated path.
 * @param {number} index - The current position in the keys array.
 * @returns {string} A flattened string of resolved array values.
 */
function resolveArray(arr, keys, index) {
  return arr.map(item => resolveFieldRecursive(item, keys, index)).join(', ');
}

/**
 * Flattens an object by joining all its values into a single string.
 * 
 * @param {Object} obj - The object to flatten.
 * @returns {string} A string of the object's values, joined by commas.
 */
function flattenObject(obj) {
  return Object.values(obj).map(val => (val !== null && val !== undefined ? val : '')).join(', ');
}

/**
 * ===================== Error Handling Functions ========================
 * 
 * This section contains functions responsible for handling errors that occur
 * during API requests and other operations. Centralizing error handling ensures
 * consistent behavior across the application and makes it easier to update
 * error handling logic in one place.
 * 
 * Functions in this section include:
 * - `handleApiError`: Processes API responses based on status codes and
 *   performs appropriate actions.
 * - Any other error handling utilities as needed.
 */

/**
 * Handles HTTP error responses from UrlFetchApp.fetch().
 * Extracts the HTTP response code and message, and logs appropriate error messages.
 *
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - The HTTP response object from UrlFetchApp.fetch().
 * @returns {null} Always returns null to indicate an error occurred.
 */
function handleApiError(response) {
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  Logger.log('Response Code: ' + statusCode);
  Logger.log('Response Text: ' + responseText);

  switch (statusCode) {
    case 400:
      Logger.log('Error 400: Bad filtering arguments.');
      break;
    case 401:
      Logger.log('Error 401: Unauthorized - Bad API key.');
      break;
    case 403:
      Logger.log('Error 403: Forbidden - Scope missing for API key.');
      break;
    case 408:
      Logger.log('Error 408: Request timed out.');
      break;
    case 429:
      Logger.log('Error 429: Rate limit exceeded.');
      break;
    case 500:
      Logger.log('Error 500: Internal server error.');
      break;
    default:
      Logger.log(`Error ${statusCode}: ${responseText}`);
      break;
  }

  // Return null to indicate an error occurred
  return null;
}
