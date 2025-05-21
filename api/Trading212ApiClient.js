/**
 * ===================== Trading212ApiClient Class =====================
 * 
 * A centralized client for interacting with the Trading212 API.
 * This class handles:
 * - API request construction and execution
 * - Error handling and retry logic
 * - Response caching
 * - Rate limiting
 * - Authentication management
 * 
 * The client supports different environments (demo/live) and provides
 * a clean interface for all API operations.
 */

class Trading212ApiClient {
  /**
   * Creates a new Trading212ApiClient instance.
   * 
   * @param {string} [environment='demo'] - The API environment to use ('demo' or 'live').
   */
  constructor(environment = null) {
    // If environment is not provided, get it from user properties or default to 'demo'
    this.environment = environment || PropertiesService.getUserProperties().getProperty('SELECTED_ENVIRONMENT') || 'demo';
    this.baseUrl = this.environment === 'live' ? API_DOMAIN_LIVE : API_DOMAIN_DEMO;
    this.apiVersion = API_VERSION;
    this.cache = CacheService.getScriptCache();
    this.rateLimiter = new RateLimiter(RATE_LIMITS);
    
    // Log initialization
    Logger.log(`Trading212ApiClient initialized with environment: ${this.environment}`);
  }

  /**
   * Makes a GET request to the Trading212 API.
   * 
   * @param {string} endpoint - The API endpoint to call.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Object|null} - The API response data or null if an error occurred.
   */
  async get(endpoint, params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    // Generate cache key based on endpoint and params
    const cacheKey = this._generateCacheKey(endpoint, params);
    
    // Try to get data from cache if caching is enabled
    if (cacheOptions.enabled) {
      const cachedData = this._getFromCache(cacheKey);
      if (cachedData) {
        Logger.log(`Cache hit for ${endpoint}`);
        return cachedData;
      }
    }
    
    // Construct the URL
    const url = this._buildUrl(endpoint, params);
    
    // Check rate limiting
    const canProceed = this.rateLimiter.canProceed(endpoint);
    if (!canProceed.proceed) {
      const proactiveWaitTime = canProceed.waitTime + 500; // Add a 500ms buffer
      Logger.log(`Rate limit reached for ${endpoint}. Proactively waiting for ${proactiveWaitTime} ms.`);
      
      // Ensure we don't exceed execution time limits
      if (proactiveWaitTime > 300000) { // 5 minutes
        throw new Error('Proactive wait time exceeds script execution time limits.');
      }
      
      // Wait for the required time before proceeding
      Utilities.sleep(proactiveWaitTime);
    }
    
    // Make the request with retry logic
    const data = await this._makeRequestWithRetry(url, endpoint);
    
    // Cache the result if enabled and data was successfully retrieved
    if (cacheOptions.enabled && data) {
      this._setInCache(cacheKey, data, cacheOptions.ttl);
    }
    
    return data;
  }

  /**
   * Makes an API request with retry logic.
   * 
   * @private
   * @param {string} url - The full URL to request.
   * @param {string} endpoint - The API endpoint (for logging).
   * @param {number} [retryCount=0] - The current retry attempt.
   * @returns {Object|null} - The API response data or null if all retries failed.
   */
  async _makeRequestWithRetry(url, endpoint, retryCount = 0) {
    try {
      Logger.log(`Making API request to ${url} (attempt ${retryCount + 1})`);
      
      const options = this._getRequestOptions();
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 200) {
        // Successful response
        const jsonData = JSON.parse(response.getContentText());
        return jsonData;
      } else if (statusCode === 429 && retryCount < 3) {
        // Rate limit hit, wait and retry
        let waitTime;
        const specificRateLimit = this.rateLimiter.rateLimits[endpoint];
        if (specificRateLimit && specificRateLimit.limit > 0 && specificRateLimit.windowMs > 0) {
          // Calculate wait based on specific endpoint limit, add jitter and backoff factor
          const baseInterval = specificRateLimit.windowMs / specificRateLimit.limit;
          waitTime = baseInterval + (Math.random() * 1000) + (retryCount * baseInterval / 2); // Base + jitter + increasing backoff
          Logger.log(`Rate limit hit for ${endpoint} (specific). Waiting ${waitTime}ms before retry.`);
        } else {
          // Fallback to a longer generic exponential backoff if specific limit not found or invalid
          waitTime = Math.pow(2, retryCount) * 2000 + (Math.random() * 1000); // 2s, 4s, 8s + jitter
          Logger.log(`Rate limit hit for ${endpoint} (generic). Waiting ${waitTime}ms before retry.`);
        }
        Utilities.sleep(waitTime);
        return this._makeRequestWithRetry(url, endpoint, retryCount + 1);
      } else {
        // Handle other errors
        return this._handleApiError(response, endpoint);
      }
    } catch (error) {
      Logger.log(`API request error: ${error.message}`);
      
      // Retry on network errors or server errors
      if (retryCount < 3 && this._isRetryableError(error)) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        Logger.log(`Retryable error. Waiting ${waitTime}ms before retry.`);
        Utilities.sleep(waitTime);
        return this._makeRequestWithRetry(url, endpoint, retryCount + 1);
      }
      
      // Log the error and return null after all retries
      Logger.log(`Failed after ${retryCount + 1} attempts: ${error.message}`);
      return null;
    }
  }

  /**
   * Determines if an error is retryable.
   * 
   * @private
   * @param {Error} error - The error to check.
   * @returns {boolean} - True if the error is retryable.
   */
  _isRetryableError(error) {
    // Network errors or 5xx server errors are typically retryable
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('500') ||
           error.message.includes('503');
  }

  /**
   * Handles API errors based on status code.
   * 
   * @private
   * @param {Object} response - The API response object.
   * @param {string} endpoint - The API endpoint (for logging).
   * @returns {null} - Always returns null to indicate an error occurred.
   */
  _handleApiError(response, endpoint) {
    // The global handleApiError (from main/errorHandling.js) now processes the response
    // and throws an ApiError. This client method will let that error propagate.
    // The ErrorHandler instance within this class is not used here anymore for this specific step,
    // as the global function handles the immediate response processing.
    // Context for the error can be passed to the global handler.
    const contextMessage = `API request to ${endpoint} failed`;
    return handleApiError(response, contextMessage); // This will throw an ApiError
  }

  /**
   * Builds a complete URL for an API request.
   * 
   * @private
   * @param {string} endpoint - The API endpoint.
   * @param {Object} params - Query parameters.
   * @returns {string} - The complete URL.
   */
  _buildUrl(endpoint, params) {
    // Check if this is a pagination URL (starts with '/')
    if (endpoint.startsWith('/')) {
      return `${this.baseUrl}${endpoint}`;
    }
    
    // Build the base URL
    let url = `${this.baseUrl}${this.apiVersion}${endpoint}`;
    
    // Add query parameters if present
    if (Object.keys(params).length > 0) {
      url += '?' + this._formatParams(params);
    }
    
    return url;
  }

  /**
   * Formats parameters into a URL query string.
   * 
   * @private
   * @param {Object} params - The parameters to format.
   * @returns {string} - The formatted query string.
   */
  _formatParams(params) {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Gets the request options for an API call.
   * 
   * @private
   * @returns {Object} - The request options.
   */
  _getRequestOptions() {
    return {
      method: 'GET',
      headers: {
        'Authorization': this._getAuthKey(),
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
  }

  /**
   * Gets the authentication key from user properties.
   * 
   * @private
   * @returns {string} - The authentication key.
   */
  _getAuthKey() {
    const apiKey = PropertiesService.getUserProperties().getProperty('API_KEY');
    if (!apiKey) {
      Logger.log('API Key is not set. Please configure your API key.');
      throw new Error('API Key is not configured');
    }
    return apiKey;
  }

  /**
   * Generates a cache key for an endpoint and parameters.
   * 
   * @private
   * @param {string} endpoint - The API endpoint.
   * @param {Object} params - The query parameters.
   * @returns {string} - The cache key.
   */
  _generateCacheKey(endpoint, params) {
    return `t212_${endpoint}_${JSON.stringify(params)}`;
  }

  /**
   * Gets data from the cache.
   * 
   * @private
   * @param {string} cacheKey - The cache key.
   * @returns {Object|null} - The cached data or null if not found.
   */
  _getFromCache(cacheKey) {
    const cachedData = this.cache.get(cacheKey);
    return cachedData ? JSON.parse(cachedData) : null;
  }

  /**
   * Sets data in the cache.
   * 
   * @private
   * @param {string} cacheKey - The cache key.
   * @param {Object} data - The data to cache.
   * @param {number} ttl - Time to live in seconds.
   */
  _setInCache(cacheKey, data, ttl) {
    this.cache.put(cacheKey, JSON.stringify(data), ttl);
  }

  /**
   * Tests the API connection with the current configuration.
   * 
   * @returns {Object} - An object with success status and optional error message.
   */
  testConnection() {
    try {
      const endpoint = API_RESOURCES.ACCOUNT_INFO.endpoint;
      const url = this._buildUrl(endpoint, {});
      
      Logger.log(`Testing API connection to ${url}`);
      
      const options = this._getRequestOptions();
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 200) {
        Logger.log('API connection test successful');
        return { success: true };
      } else {
        Logger.log(`API connection test failed with status code ${statusCode}`);
        return { 
          success: false, 
          error: `Connection failed with status code ${statusCode}` 
        };
      }
    } catch (error) {
      Logger.log(`API connection test error: ${error.message}`);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Fetches data from a Trading212 API endpoint and handles pagination.
   * 
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [params={}] - Query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Object[]} - An array of all items from all pages.
   */
  async fetchAllPages(endpoint, params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    let allItems = [];
    let nextPagePath = null;
    let currentParams = { ...params };
    
    do {
      // Fetch the current page
      const data = nextPagePath 
        ? await this.get(nextPagePath, {}, cacheOptions)
        : await this.get(endpoint, currentParams, cacheOptions);
      
      if (!data) {
        Logger.log(`Error fetching data for ${endpoint}`);
        break;
      }
      
      // Add items from this page to the result
      const items = data.items || data;
      if (Array.isArray(items)) {
        allItems = allItems.concat(items);
      } else {
        // If it's not an array, it might be a single item response
        allItems.push(items);
      }
      
      // Check if there's another page
      nextPagePath = data.nextPagePath;
      
    } while (nextPagePath);
    
    return allItems;
  }

  /**
   * Fetches all pies from the Trading212 API.
   * Uses fetchAllPages to handle potential pagination.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of pie objects.
   */
  async getPies(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.PIES.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for PIES is not defined in API_RESOURCES.");
      throw new Error("Pies API endpoint not configured.");
    }
    Logger.log(`Fetching pies from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.fetchAllPages(endpoint, params, cacheOptions);
  }

  /**
   * Fetches account information from the Trading212 API.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Object>} - A promise that resolves to the account information.
   */
  async getAccountInfo(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.ACCOUNT_INFO.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for ACCOUNT_INFO is not defined in API_RESOURCES.");
      throw new Error("Account Info API endpoint not configured.");
    }
    Logger.log(`Fetching account info from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.get(endpoint, params, cacheOptions);
  }

  /**
   * Fetches account cash balance from the Trading212 API.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Object>} - A promise that resolves to the account cash balance.
   */
  async getAccountCash(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.ACCOUNT_CASH.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for ACCOUNT_CASH is not defined in API_RESOURCES.");
      throw new Error("Account Cash API endpoint not configured.");
    }
    Logger.log(`Fetching account cash from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.get(endpoint, params, cacheOptions);
  }

  /**
   * Fetches the list of instruments from the Trading212 API.
   * Uses fetchAllPages to handle potential pagination.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of instrument objects.
   */
  async getInstrumentsList(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.INSTRUMENTS_LIST.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for INSTRUMENTS_LIST is not defined in API_RESOURCES.");
      throw new Error("Instruments List API endpoint not configured.");
    }
    Logger.log(`Fetching instruments list from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.fetchAllPages(endpoint, params, cacheOptions);
  }

  /**
   * Fetches transactions from the Trading212 API.
   * Uses fetchAllPages to handle potential pagination.
   * @param {Object} [params={}] - Optional query parameters (e.g., limit, cursor).
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of transaction objects.
   */
  async getTransactions(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.TRANSACTIONS.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for TRANSACTIONS is not defined in API_RESOURCES.");
      throw new Error("Transactions API endpoint not configured.");
    }
    Logger.log(`Fetching transactions from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.fetchAllPages(endpoint, params, cacheOptions);
  }

  /**
   * Fetches order history from the Trading212 API.
   * Uses fetchAllPages to handle potential pagination.
   * @param {Object} [params={}] - Optional query parameters (e.g., limit, cursor, ticker).
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of order history objects.
   */
  async getOrderHistory(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.ORDER_HISTORY.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for ORDER_HISTORY is not defined in API_RESOURCES.");
      throw new Error("Order History API endpoint not configured.");
    }
    const queryParams = {
      limit: params.limit || 20, // API default
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.ticker && { ticker: params.ticker }),
    };
    Logger.log(`Fetching order history from endpoint: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    return this.fetchAllPages(endpoint, queryParams, cacheOptions);
  }

  /**
   * Fetches dividends from the Trading212 API.
   * Uses fetchAllPages to handle potential pagination.
   * @param {Object} [params={}] - Optional query parameters (e.g., limit, cursor, ticker).
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of dividend objects.
   */
  async getDividends(params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    const endpoint = API_RESOURCES.DIVIDENDS.endpoint;
    if (!endpoint) {
      Logger.log("API endpoint for DIVIDENDS is not defined in API_RESOURCES.");
      throw new Error("Dividends API endpoint not configured.");
    }
    const queryParams = {
      limit: params.limit || 20, // API default
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.ticker && { ticker: params.ticker }),
    };
    Logger.log(`Fetching dividends from endpoint: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    return this.fetchAllPages(endpoint, queryParams, cacheOptions);
  }

  /**
   * Fetches details for a specific pie by ID.
   * @param {string|number} pieId - The ID of the pie to fetch.
   * @param {Object} [params={}] - Optional query parameters.
   * @param {Object} [cacheOptions={ enabled: true, ttl: 300 }] - Cache configuration.
   * @returns {Promise<Object>} - A promise that resolves to the pie details.
   */
  async getPieDetails(pieId, params = {}, cacheOptions = { enabled: true, ttl: 300 }) {
    if (!pieId) {
      throw new Error("Pie ID is required to fetch pie details.");
    }
    const endpoint = `equity/pies/${pieId}`;
    Logger.log(`Fetching pie details from endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);
    return this.get(endpoint, params, cacheOptions);
  }
}

/**
 * Creates and returns a singleton instance of the Trading212ApiClient.
 * 
 * @param {string} [environment=null] - The API environment to use.
 * @returns {Trading212ApiClient} - The API client instance.
 */
function getApiClient(environment = null) {
  // Use a script property to store the singleton instance
  const scriptProperties = PropertiesService.getScriptProperties();
  let client = scriptProperties.getProperty('API_CLIENT_INSTANCE');
  
  if (!client) {
    client = new Trading212ApiClient(environment);
    // We can't actually store the instance in properties, but we can mark that it's been created
    scriptProperties.setProperty('API_CLIENT_INSTANCE', 'created');
  }
  
  return client;
}

/**
 * Saves API configuration and tests the connection.
 * 
 * @param {string} apiKey - The Trading212 API key.
 * @param {string} [environment='demo'] - The API environment ('demo' or 'live').
 * @returns {Object} - An object with success status and optional error message.
 */
function saveApiConfig(apiKey, environment = 'demo') {
  try {
    // Create a client with the new configuration
    const client = new Trading212ApiClient(environment);
    
    // Test the connection
    const testResult = client.testConnection();
    
    if (testResult.success) {
      // Save credentials only after successful test
      PropertiesService.getUserProperties().setProperties({
        'API_KEY': apiKey,
        'SELECTED_ENVIRONMENT': environment
      });
      
      return { success: true };
    } else {
      return testResult;
    }
  } catch (error) {
    Logger.log(`Error saving API config: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
