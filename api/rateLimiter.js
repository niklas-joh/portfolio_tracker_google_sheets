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