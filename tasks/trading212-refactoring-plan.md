# Trading212 Portfolio Tracker - Refactoring Plan

## Overview

This document outlines a comprehensive refactoring plan for the Trading212 Portfolio Tracker Google Sheets add-on. The plan focuses on improving code quality, maintainability, and user experience while adhering to the core development principles of modularity, reusability, scalability, efficiency, user-centric design, separation of concerns, robust error handling, maintainability, consistency, and security.

## Table of Contents

1. [Code Structure Reorganization](#1-code-structure-reorganization)
2. [Implementation of Design Patterns](#2-implementation-of-design-patterns)
3. [API Layer Improvements](#3-api-layer-improvements)
4. [Data Processing Enhancements](#4-data-processing-enhancements)
5. [UI Improvements](#5-ui-improvements)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Testing Framework](#7-testing-framework)
8. [Documentation](#8-documentation)
9. [New Features](#9-new-features)
10. [Implementation Timeline](#10-implementation-timeline)

## 1. Code Structure Reorganization

### Current Issues:
- Inconsistent code organization with mixed styles (classes vs. standalone functions)
- Unclear module boundaries and responsibilities
- Duplicate functionality across files

### Recommended Changes:

#### 1.1 Adopt a Consistent Modular Architecture

Create a clear folder structure with well-defined responsibilities:

```
/
├── api/                  # API interaction
│   ├── client.js         # Core API client functionality
│   ├── endpoints.js      # API endpoint definitions
│   └── rateLimiter.js    # Rate limiting logic
├── data/                 # Data processing
│   ├── processors/       # Data transformation
│   ├── cache.js          # Caching functionality
│   └── sheetManager.js   # Sheet interactions
├── ui/                   # User interface
│   ├── components/       # Reusable UI components
│   ├── modals/           # Modal dialogs
│   └── menu.js           # Menu creation
├── utils/                # Utilities
│   ├── logging.js        # Logging functionality
│   ├── error.js          # Error handling
│   └── config.js         # Configuration management
└── main.js               # Entry point
```

#### 1.2 Convert to Consistent Class-Based Architecture

```javascript
/**
 * ApiClient class to encapsulate all API interactions.
 */
class ApiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.rateLimiter = new RateLimiter(config.rateLimits);
  }

  async request(endpoint, params = {}) {
    const url = this.buildUrl(endpoint, params);
    const canProceed = this.rateLimiter.canProceed(endpoint);
    
    if (!canProceed.proceed) {
      await this.wait(canProceed.waitTime);
    }
    
    return this.makeRequest(url);
  }
  
  // Other methods...
}
```

## 2. Implementation of Design Patterns

### Current Issues:
- Lack of consistent design patterns
- Mixed approach to similar problems

### Recommended Changes:

#### 2.1 Implement Singleton Pattern for Service Classes

```javascript
/**
 * Singleton pattern for ApiClient.
 */
class ApiClient {
  static instance;
  
  static getInstance(config) {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(config);
    }
    return ApiClient.instance;
  }
  
  // Rest of the class implementation...
}
```

#### 2.2 Use Factory Pattern for Sheet Creation

```javascript
/**
 * Factory for creating different types of sheets.
 */
class SheetFactory {
  static createSheet(type, name) {
    switch (type) {
      case 'account':
        return new AccountSheet(name);
      case 'transactions':
        return new TransactionsSheet(name);
      case 'pies':
        return new PiesSheet(name);
      default:
        return new BaseSheet(name);
    }
  }
}
```

#### 2.3 Implement Observer Pattern for UI Updates

```javascript
/**
 * Observer pattern for UI updates.
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(data));
    }
  }
}
```

## 3. API Layer Improvements

### Current Issues:
- Inconsistent API request handling
- Duplicate API call functions
- Limited rate limiting implementation

### Recommended Changes:

#### 3.1 Centralize API Configuration

Create a single config file for all API-related constants:

```javascript
/**
 * Centralized API configuration.
 */
const API_CONFIG = {
  domains: {
    live: 'https://live.trading212.com',
    demo: 'https://demo.trading212.com'
  },
  version: '/api/v0/',
  endpoints: {
    pies: 'equity/pies',
    accountInfo: 'equity/account/info',
    // Other endpoints...
  },
  rateLimits: {
    'equity/pies': { limit: 1, windowMs: 30000 },
    // Other rate limits...
  }
};
```

#### 3.2 Create a Unified API Client

```javascript
/**
 * Unified API client for all Trading212 API interactions.
 */
class Trading212ApiClient {
  constructor(environment = 'demo') {
    this.domain = API_CONFIG.domains[environment];
    this.baseUrl = `${this.domain}${API_CONFIG.version}`;
    this.rateLimiter = new RateLimiter(API_CONFIG.rateLimits);
  }
  
  async get(endpoint, params = {}) {
    const url = this.buildUrl(endpoint, params);
    const rateLimitStatus = this.rateLimiter.canProceed(endpoint);
    
    if (!rateLimitStatus.proceed) {
      await new Promise(resolve => setTimeout(resolve, rateLimitStatus.waitTime));
    }
    
    return this.fetchWithAuth(url);
  }
  
  // Other methods...
}
```

#### 3.3 Implement Robust Rate Limiting

Enhance the RateLimiter class to handle backoff and retry strategies:

```javascript
/**
 * Enhanced rate limiter with backoff and retry strategies.
 */
class RateLimiter {
  constructor(rateLimits) {
    this.rateLimits = rateLimits;
    this.requestLogs = {};
  }
  
  canProceed(endpoint) {
    // Current implementation...
  }
  
  async executeWithRateLimit(endpoint, func) {
    const status = this.canProceed(endpoint);
    
    if (status.proceed) {
      return func();
    } else {
      await new Promise(resolve => setTimeout(resolve, status.waitTime));
      return this.executeWithRateLimit(endpoint, func);
    }
  }
}
```

## 4. Data Processing Enhancements

### Current Issues:
- Complex data transformation logic
- Inconsistent sheet updating approach
- Limited caching strategy

### Recommended Changes:

#### 4.1 Create Data Model Classes

```javascript
/**
 * Base model class for data entities.
 */
class BaseModel {
  constructor(data) {
    this.rawData = data;
    this.processData();
  }
  
  processData() {
    // Default implementation
  }
  
  toSheetRow() {
    // Convert to array for sheet row
  }
}

/**
 * Pie model for investment pies.
 */
class PieModel extends BaseModel {
  processData() {
    this.id = this.rawData.id;
    this.name = this.rawData.name;
    this.value = this.rawData.value;
    this.items = (this.rawData.items || []).map(item => new PieItemModel(item));
  }
  
  toSheetRow() {
    return [
      this.id,
      this.name,
      this.value,
      this.items.map(item => item.name).join(', ')
    ];
  }
}
```

#### 4.2 Implement Repository Pattern for Data Access

```javascript
/**
 * Base repository class for data access.
 */
class BaseRepository {
  constructor(sheetName) {
    this.sheetName = sheetName;
    this.sheet = this.getOrCreateSheet();
  }
  
  getOrCreateSheet() {
    // Implementation...
  }
  
  save(models) {
    // Implementation...
  }
}

/**
 * Pies repository for pie data management.
 */
class PiesRepository extends BaseRepository {
  async fetchAll() {
    const apiClient = ApiClient.getInstance();
    const data = await apiClient.get('equity/pies');
    return data.items.map(item => new PieModel(item));
  }
  
  saveAll(pies) {
    const headers = ['ID', 'Name', 'Value', 'Items'];
    const rows = pies.map(pie => pie.toSheetRow());
    super.writeData(headers, rows);
  }
}
```

#### 4.3 Enhanced Caching Strategy

```javascript
/**
 * Enhanced caching service with TTL and invalidation.
 */
class CacheService {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  get(key) {
    const data = this.cache.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  set(key, data, ttl = 600) { // Default 10 minutes
    this.cache.put(key, JSON.stringify(data), ttl);
  }
  
  invalidate(key) {
    this.cache.remove(key);
  }
  
  invalidateByPrefix(prefix) {
    // Implementation to invalidate keys by prefix
  }
}
```

## 5. UI Improvements

### Current Issues:
- Complex UI initialization
- Limited feedback mechanisms
- Inconsistent UI handling

### Recommended Changes:

#### 5.1 Create a UI Controller

```javascript
/**
 * Controller for UI management.
 */
class UiController {
  constructor() {
    this.eventEmitter = new EventEmitter();
  }
  
  showModal(templateName, title, options = {}) {
    const html = this.createModalHtml(templateName, options);
    SpreadsheetApp.getUi().showModalDialog(html, title);
  }
  
  createModalHtml(templateName, options) {
    // Implementation...
  }
  
  // Other methods...
}
```

#### 5.2 Implement a Loading State Manager

```javascript
/**
 * Loading state manager for UI feedback.
 */
class LoadingManager {
  constructor() {
    this.loadingStates = {};
  }
  
  setLoading(id, isLoading) {
    this.loadingStates[id] = isLoading;
    this.updateUi(id);
  }
  
  updateUi(id) {
    // Implementation to update UI based on loading state
  }
}
```

#### 5.3 Create Reusable UI Components

```javascript
/**
 * Function to create a progress indicator component.
 */
function createProgressIndicator(steps, currentStep) {
  let html = '<div class="step-indicator">';
  
  for (let i = 0; i < steps; i++) {
    html += `<div class="step-dot ${i === currentStep ? 'active' : ''}"></div>`;
  }
  
  html += '</div>';
  return html;
}
```

## 6. Error Handling Strategy

### Current Issues:
- Inconsistent error handling
- Limited user feedback for errors
- Unclear error recovery strategies

### Recommended Changes:

#### 6.1 Create a Centralized Error Handler

```javascript
/**
 * Centralized error handler for consistent error management.
 */
class ErrorHandler {
  static handle(error, context = {}) {
    Logger.log(`Error in ${context.location || 'unknown'}: ${error.message}`);
    
    // Determine error type and action
    if (error.name === 'ApiError') {
      return ErrorHandler.handleApiError(error, context);
    } else if (error.name === 'ValidationError') {
      return ErrorHandler.handleValidationError(error, context);
    } else {
      return ErrorHandler.handleGenericError(error, context);
    }
  }
  
  static handleApiError(error, context) {
    // Handle API-specific errors
  }
  
  static handleValidationError(error, context) {
    // Handle validation errors
  }
  
  static handleGenericError(error, context) {
    // Handle generic errors
  }
}
```

#### 6.2 Implement Custom Error Classes

```javascript
/**
 * Custom error class for API errors.
 */
class ApiError extends Error {
  constructor(message, statusCode, endpoint) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/**
 * Custom error class for validation errors.
 */
class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}
```

#### 6.3 Implement Try-Catch Patterns

```javascript
/**
 * Example of consistent try-catch pattern.
 */
async function safeApiCall(endpoint, params, context) {
  try {
    const apiClient = ApiClient.getInstance();
    return await apiClient.get(endpoint, params);
  } catch (error) {
    return ErrorHandler.handle(error, {
      location: 'apiCall',
      endpoint,
      params,
      ...context
    });
  }
}
```

## 7. Testing Framework

### Current Issues:
- Lack of systematic testing
- Difficulty in validating code changes

### Recommended Changes:

#### 7.1 Implement Unit Testing

Set up a basic unit testing framework for Apps Script:

```javascript
/**
 * Simple unit testing framework.
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }
  
  addTest(name, testFunc) {
    this.tests.push({ name, testFunc });
  }
  
  async runTests() {
    for (const test of this.tests) {
      try {
        await test.testFunc();
        this.results.passed++;
        Logger.log(`✅ Test passed: ${test.name}`);
      } catch (error) {
        this.results.failed++;
        Logger.log(`❌ Test failed: ${test.name}`);
        Logger.log(`   Error: ${error.message}`);
      }
      this.results.total++;
    }
    
    this.logResults();
  }
  
  logResults() {
    Logger.log(`
      Test Results:
      - Total: ${this.results.total}
      - Passed: ${this.results.passed}
      - Failed: ${this.results.failed}
    `);
  }
}
```

#### 7.2 Create Mock Objects for Testing

```javascript
/**
 * Mock API client for testing.
 */
class MockApiClient {
  constructor(mockResponses) {
    this.mockResponses = mockResponses;
  }
  
  async get(endpoint, params = {}) {
    if (this.mockResponses[endpoint]) {
      return this.mockResponses[endpoint];
    }
    throw new Error(`No mock response for endpoint: ${endpoint}`);
  }
}
```

#### 7.3 Set Up Integration Tests

```javascript
/**
 * Integration test for fetching pies.
 */
function testFetchPies() {
  const runner = new TestRunner();
  
  runner.addTest('Should fetch and process pies', async () => {
    // Set up mock API client
    const mockApiClient = new MockApiClient({
      'equity/pies': { items: [{ id: 1, name: 'Test Pie', value: 100 }] }
    });
    
    // Override API client instance
    ApiClient.instance = mockApiClient;
    
    // Execute the function to test
    const result = await fetchPies();
    
    // Assert the results
    if (!result || result.length !== 1 || result[0].name !== 'Test Pie') {
      throw new Error('Unexpected result from fetchPies');
    }
  });
  
  runner.runTests();
}
```

## 8. Documentation

### Current Issues:
- Inconsistent documentation style
- Missing documentation for key functionality
- Limited user guides

### Recommended Changes:

#### 8.1 Standardize Code Documentation

Adopt a consistent JSDoc style for all functions and classes:

```javascript
/**
 * Fetches investment pies from the Trading212 API.
 * 
 * @async
 * @function fetchPies
 * @param {Object} [options] - Optional configuration for the fetch operation.
 * @param {number} [options.limit=20] - Maximum number of pies to fetch.
 * @param {string} [options.cursor] - Cursor for pagination.
 * @returns {Promise<Array<PieModel>>} Array of pie models.
 * @throws {ApiError} When the API request fails.
 * 
 * @example
 * // Fetch pies with default options
 * const pies = await fetchPies();
 * 
 * // Fetch pies with custom options
 * const pies = await fetchPies({ limit: 50 });
 */
async function fetchPies(options = {}) {
  // Implementation...
}
```

#### 8.2 Create Technical Documentation

Create a comprehensive technical documentation file explaining:
- Architecture overview
- Module responsibilities
- API interactions
- Data processing flow
- Error handling strategy
- Configuration options

#### 8.3 Create User Documentation

Create user-friendly guides for:
- Installation and setup
- Connecting to Trading212 API
- Fetching and updating data
- Customizing sheets and reports
- Troubleshooting common issues

## 9. New Features

### 9.1 Enhanced Data Visualization

- Implement automatic chart generation for portfolio performance
- Add dynamic dashboards summarizing portfolio metrics
- Create customizable visualization options

Example implementation for automatic chart generation:

```javascript
/**
 * Creates a portfolio performance chart in the given sheet.
 * 
 * @param {string} sheetName - The name of the sheet to create the chart in.
 * @param {Array<Object>} performanceData - Array of performance data points.
 */
function createPortfolioPerformanceChart(sheetName, performanceData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  // Prepare data for chart
  const headers = ['Date', 'Value'];
  const rows = performanceData.map(item => [item.date, item.value]);
  
  // Write data to sheet
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  
  // Create chart
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange(1, 1, rows.length + 1, 2))
    .setPosition(5, 5, 0, 0)
    .setOption('title', 'Portfolio Performance')
    .setOption('legend', {position: 'none'})
    .setOption('vAxis', {title: 'Value'})
    .setOption('hAxis', {title: 'Date'})
    .build();
  
  sheet.insertChart(chart);
}
```

### 9.2 Scheduled Refreshes

- Add functionality to automatically refresh data on a schedule
- Implement configurable refresh intervals (daily, hourly, etc.)
- Add email notifications for significant portfolio changes

Example implementation for scheduled refreshes:

```javascript
/**
 * Sets up a time-driven trigger to refresh data on a schedule.
 * 
 * @param {string} frequency - The frequency of the refresh ('hourly', 'daily', 'weekly').
 */
function setupScheduledRefresh(frequency) {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'refreshPortfolioData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger based on frequency
  switch (frequency) {
    case 'hourly':
      ScriptApp.newTrigger('refreshPortfolioData')
        .timeBased()
        .everyHours(1)
        .create();
      break;
    case 'daily':
      ScriptApp.newTrigger('refreshPortfolioData')
        .timeBased()
        .everyDays(1)
        .atHour(6) // 6 AM
        .create();
      break;
    case 'weekly':
      ScriptApp.newTrigger('refreshPortfolioData')
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(6) // 6 AM
        .create();
      break;
  }
  
  // Save the configuration
  PropertiesService.getUserProperties().setProperty('REFRESH_FREQUENCY', frequency);
}
```

### 9.3 Portfolio Analysis

- Implement portfolio performance metrics calculation
- Add sector allocation analysis
- Create dividend tracking and forecasting
- Implement risk assessment tools

Example implementation for sector allocation analysis:

```javascript
/**
 * Analyzes sector allocation in the portfolio.
 * 
 * @returns {Object} Sector allocation data.
 */
function analyzeSectorAllocation() {
  const holdings = getPortfolioHoldings();
  const sectors = {};
  
  // Calculate sector totals
  for (const holding of holdings) {
    if (!sectors[holding.sector]) {
      sectors[holding.sector] = 0;
    }
    sectors[holding.sector] += holding.value;
  }
  
  // Calculate percentages
  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const sectorAllocation = Object.entries(sectors).map(([sector, value]) => ({
    sector,
    value,
    percentage: (value / totalValue) * 100
  }));
  
  // Sort by percentage (descending)
  sectorAllocation.sort((a, b) => b.percentage - a.percentage);
  
  return sectorAllocation;
}
```

### 9.4 Mobile Compatibility

- Optimize UI for mobile use
- Create mobile-friendly views for key information
- Implement responsive design principles

Example approach for mobile compatibility:

```html
<!-- Example of responsive CSS for mobile compatibility -->
<style>
  /* Base styles */
  .setup-container {
    padding: 20px;
  }
  
  /* Responsive styles */
  @media screen and (max-width: 600px) {
    .setup-container {
      padding: 10px;
    }
    
    .environment-cards {
      flex-direction: column;
    }
    
    .environment-card {
      width: 100%;
      margin-bottom: 15px;
    }
    
    .button-container {
      flex-direction: column;
      gap: 10px;
    }
    
    .button-container button {
      width: 100%;
    }
  }
</style>
```

### 9.5 Data Export Options

- Add functionality to export portfolio data in various formats (CSV, PDF)
- Create email report delivery options
- Implement custom report templates

Example implementation for CSV export:

```javascript
/**
 * Exports portfolio data to CSV.
 * 
 * @param {string} sheetName - The name of the sheet to export.
 * @returns {string} CSV data as a string.
 */
function exportSheetToCsv(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  // Convert to CSV
  const csv = data.map(row => row.join(',')).join('\n');
  
  return csv;
}

/**
 * Creates and emails a portfolio report.
 * 
 * @param {string} email - The email address to send the report to.
 * @param {string} reportType - The type of report to generate ('summary', 'detailed').
 */
function emailPortfolioReport(email, reportType) {
  // Generate report data
  const reportData = generatePortfolioReport(reportType);
  
  // Export to CSV
  const csv = exportSheetToCsv(reportData.sheetName);
  
  // Create blob
  const blob = Utilities.newBlob(csv, 'text/csv', `Portfolio_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  
  // Send email
  MailApp.sendEmail({
    to: email,
    subject: 'Your Trading212 Portfolio Report',
    body: 'Please find your portfolio report attached.',
    attachments: [blob]
  });
}
```

## 10. Implementation Timeline

### Phase 1: Foundation (1-2 weeks)
- Reorganize code structure
- Implement core design patterns
- Create unified API client
- Enhance error handling

### Phase 2: Core Improvements (2-3 weeks)
- Implement data model classes
- Create repository pattern
- Enhance caching strategy
- Improve UI components

### Phase 3: Quality Assurance (1-2 weeks)
- Implement testing framework
- Create unit and integration tests
- Improve documentation
- Refactor based on test results

### Phase 4: New Features (3-4 weeks)
- Implement data visualization
- Add scheduled refreshes
- Create portfolio analysis tools
- Add export options

### Phase 5: Finalization (1-2 weeks)
- User testing and feedback
- Performance optimization
- Documentation updates
- Final polish and bug fixes

## Conclusion

This refactoring plan addresses the key issues in the current codebase while aligning with the project's core development principles. The recommended changes will improve code quality, maintainability, and user experience, setting a solid foundation for future enhancements.

By implementing these changes in phases, we can ensure a smooth transition while continuing to provide value to users throughout the refactoring process. The resulting application will be more robust, easier to maintain, and deliver an improved user experience for managing Trading212 portfolios in Google Sheets.
