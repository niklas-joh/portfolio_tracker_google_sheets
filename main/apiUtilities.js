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