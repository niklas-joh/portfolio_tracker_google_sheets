/**
 * @fileoverview Constants for use across the application.
 * This file centralizes important constants, especially API-related ones.
 */

/**
 * Trading212 API constants.
 */
const API_CONSTANTS = {
  // API Base URLs
  BASE_URL: {
    LIVE: 'https://live.trading212.com/api/v0',
    DEMO: 'https://demo.trading212.com/api/v0',
  },
  
  // API endpoints
  ENDPOINTS: {
    ACCOUNT_DETAILS: '/equity/account/details',
    ACCOUNT_METADATA: '/equity/account/metadata',
    ACCOUNT_CASH: '/equity/account/cash',
    TRANSACTIONS: '/equity/history/transactions',
    DIVIDENDS: '/history/dividends',
    ORDERS: '/equity/orders',
    PIES: '/equity/pies',
    PIE_ORDERS: '/equity/pies/orders',
    INSTRUMENTS: '/equity/metadata/instruments',
    ACCOUNT_INFO: '/equity/account/info',
    ORDERS_HISTORY: '/equity/history/orders'
  },
  
  // Date formats
  DATE_FORMAT: 'yyyy-MM-dd',
  
  // Maximum items per page
  MAX_ITEMS_PER_PAGE: 100,
  
  // Rate limits (requests per minute, etc.)
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000
  }
};

/**
 * API Resource identifiers used by the HeaderMappingService and Repositories.
 * These identify the resource type for header mapping and storage.
 */
const API_RESOURCES = {
  DIVIDENDS: {
    id: 'DIVIDENDS',
    sheetName: 'Dividends',
    endpoint: API_CONSTANTS.ENDPOINTS.DIVIDENDS
  },
  TRANSACTIONS: {
    id: 'TRANSACTIONS',
    sheetName: 'Transactions',
    endpoint: API_CONSTANTS.ENDPOINTS.TRANSACTIONS
  },
  PIES: {
    id: 'PIES',
    sheetName: 'Pies',
    endpoint: API_CONSTANTS.ENDPOINTS.PIES
  },
  PIE_ITEMS: {
    id: 'PIE_ITEMS',
    sheetName: 'PieItems',
    endpoint: null // Fetched via the PIE endpoint's details
  },
  ACCOUNT_INFO: {
    id: 'ACCOUNT_INFO',
    sheetName: 'AccountInfo',
    endpoint: API_CONSTANTS.ENDPOINTS.ACCOUNT_INFO
  },
  INSTRUMENTS_LIST: {
    id: 'INSTRUMENTS_LIST',
    sheetName: 'InstrumentsList',
    endpoint: API_CONSTANTS.ENDPOINTS.INSTRUMENTS
  },
  ORDER_HISTORY: {
    id: 'ORDER_HISTORY',
    sheetName: 'OrderHistory',
    endpoint: API_CONSTANTS.ENDPOINTS.ORDERS_HISTORY
  },
  ACCOUNT_CASH: {
    id: 'ACCOUNT_CASH',
    sheetName: 'AccountCash',
    endpoint: API_CONSTANTS.ENDPOINTS.ACCOUNT_CASH
  }
};

/**
 * Sheet names for consistency across the application.
 */
const SHEET_NAMES = {
  DIVIDENDS: 'Dividends',
  TRANSACTIONS: 'Transactions',
  PIES: 'Pies',
  PIE_ITEMS: 'PieItems',
  HEADER_MAPPINGS: 'HeaderMappings',
  SETTINGS: 'Settings'
};

// Global availability for GAS V8 runtime
