/**
 * Save API configuration and test connection
 * This will be the ONLY function that tests the API connection
 */
function saveApiConfig(apiKey, environment) {
  console.log('saveApiConfig called with environment:', environment);
  
  try {
    const baseUrl = `${API_DOMAIN}${API_VERSION}`;
    const endpoint = API_RESOURCES.ACCOUNT_INFO.endpoint;
    const url = `${baseUrl}${endpoint}`;
    
    console.log('API Request Details:', {
      'baseUrl': baseUrl,
      'endpoint': endpoint,
      'fullUrl': url,
      'apiKeyLength': apiKey ? apiKey.length : 0,
      'environment': environment
    });

    const response = makeInitialApiRequest(url, apiKey);
    const responseCode = response.getResponseCode();
    const responseContent = response.getContentText();
    
    console.log('API Response:', {
      'statusCode': responseCode,
      'content': responseContent,
      'headers': response.getAllHeaders()
    });

    if (responseCode === 200) {
      // Save credentials only after successful test
      saveCredentials(apiKey, environment);
      console.log('API connection successful, credentials saved');
      return { success: true };
    } else if (responseCode === 429) {
      console.log('Rate limit hit');
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    } else {
      console.log(`Failed with status code: ${responseCode}`);
      throw new Error(`Connection failed (${responseCode}). Please check your API key.`);
    }
    
  } catch (error) {
    console.error('API request failed:', {
      'error': error.toString(),
      'message': error.message
    });
    throw error; // Re-throw to be handled by the client
  }
}

/**
 * Makes the actual API request
 */
function makeInitialApiRequest(url, apiKey) {
  return UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });
}

/**
 * Saves the credentials after successful validation
 */
function saveCredentials(apiKey, environment) {
  PropertiesService.getUserProperties().setProperties({
    'API_KEY': apiKey,
    'SELECTED_ENVIRONMENT': environment
  });
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(API_RESOURCES.ACCOUNT_INFO.sheetName);
    
  if (sheet) {
    sheet.getRange('B2:B3').setValues([[apiKey], [environment]]);
  }
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