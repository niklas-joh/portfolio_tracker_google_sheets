/**
 * Makes a GET request to the provided API URL and caches the response to reduce repeated API calls.
 *
 * @param {string} url - The API endpoint URL.
 * @param {string} cacheKey - The key used to store the response in the cache.
 * @returns {Object|null} The JSON-parsed response from the API, or null if the request fails.
 */
function makeApiRequestWithCache(url, cacheKey) {
  var cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    Logger.log(`Using cached data for: ${cacheKey}`);
    return JSON.parse(cachedData);
  }
  
  Logger.log(`Cache miss for: ${cacheKey}. Fetching new data from API.`);
  var data = makeApiRequest(url);
  
  if (data) {
    setCachedData(cacheKey, data);
  }
  
  return data;
}

/**
 * Stores data in the cache using a specified key.
 * 
 * This function serializes the data as a JSON string and stores it in the cache 
 * for a specified amount of time defined by `CACHE_EXPIRY`.
 * 
 * @param {string} cacheKey - The key used to identify the cached data.
 * @param {Object|Array} data - The data to be cached (can be an object or array).
 * 
 * @example
 * setCachedData('piesCache', data);  // Caches data for pies using the key 'piesCache'
 * 
 * @returns {void}
 */
function setCachedData(cacheKey, data) {
  var cache = CacheService.getScriptCache();
  cache.put(cacheKey, JSON.stringify(data), CACHE_EXPIRY);
}


/**
 * Retrieves cached data using a specified key.
 * 
 * This function looks for the cached data associated with the provided key. 
 * If the key is found, it returns the cached value as a string; otherwise, it returns `null`.
 * 
 * @param {string} cacheKey - The key used to retrieve the cached data.
 * 
 * @example
 * var cachedData = getCachedData('piesCache');  // Retrieves cached data for pies
 * 
 * @returns {string|null} The cached data as a string, or `null` if the key does not exist.
 */
function getCachedData(cacheKey) {
  var cache = CacheService.getScriptCache();
  return cache.get(cacheKey);
}
