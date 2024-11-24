/**
 * ========================= Constants ============================
 * 
 * This section defines constants used throughout the codebase to avoid magic numbers, strings, or hardcoding of key values.
 * 
 * Constants help make the code more maintainable, as these values are defined in one place and can be easily updated if needed.
 * 
 * The constants include:
 * - `API_DOMAIN_LIVE`: The domain for calling the live Trading212 API.
 * - `API_DOMAIN_DEMO`: The domain for calling the demo Trading212 API.
 * - `API_DOMAIN`: The domain for calling the Trading212 API, used to construct final URLs.
 * - `API_VERSION`: The API version used. Used to construct the base URL.
 * - `API_BASE_URL`: The concatenation of API_DOMAIN and API_VERSION used to construct various endpoint URLs.
 * - `SHEET_NAMES`: An object that maps to the names of the Google Sheets where data will be written.
 * - `API_ENDPOINT`: An object mapping logical names to API endpoint paths.
 * - `RATE_LIMITS`: An object defining rate limits for each API endpoint.
 */

// Constants for managing API base URL and versioning
const API_DOMAIN_LIVE = 'https://live.trading212.com';
const API_DOMAIN_DEMO = 'https://demo.trading212.com';
const API_VERSION = '/api/v0/';  // Keep versioning separate to allow easier upgrades

// Determine the API domain based on the saved environment setting
const userProperties = PropertiesService.getUserProperties();
const selectedEnvironment = userProperties.getProperty('SELECTED_ENVIRONMENT') || 'demo';
const API_DOMAIN = selectedEnvironment === 'live' ? API_DOMAIN_LIVE : API_DOMAIN_DEMO;

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
    sheetName: '🥧Pies',
    rateLimit: { limit: 1, windowMs: 30 * SECOND } 
  },
  PIE: {
    endpoint: 'equity/pies/2616371',
    sheetName: 'Pie Details',
    rateLimit: { limit: 1, windowMs: 5 * SECOND }
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
    // TO DO: Fix 500 error when hitting end of list, i.e. when fetching more items than is remaining
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