# Trading212 Portfolio Tracker Enhancement Plan

## Executive Summary

This document outlines a comprehensive enhancement plan for the Trading212 Portfolio Tracker Google Sheets add-on. The plan focuses on improving user experience, providing valuable visualizations and analytics, and enabling better portfolio management - all while adhering to our core development principles.

The enhancements are prioritized with user experience in mind, with particular focus on data visualization, analytics, and dividend tracking. Each enhancement includes an assessment of complexity, priority, and dependencies to facilitate effective implementation planning.

## Priority Matrix

| Priority Level | Description |
|---------------|-------------|
| P1 | Critical - Must have for core functionality |
| P2 | High - Significant value enhancement |
| P3 | Medium - Important improvement |
| P4 | Low - Nice to have |

## Complexity Scale

| Complexity Level | Description | Estimated Time |
|-----------------|-------------|---------------|
| C1 | Simple - Minor changes | 1-3 days |
| C2 | Moderate - Significant but straightforward changes | 3-7 days |
| C3 | Complex - Substantial development effort | 1-2 weeks |
| C4 | Very Complex - Major development initiative | 2+ weeks |

## 1. Core Infrastructure Improvements

### 1.1 API Client Refactoring

**Description**: Centralize API interactions into a robust client that handles errors, retries, and caching consistently.

**Complexity**: C3  
**Priority**: P1  
**Dependencies**: None  

**Implementation Example**:
```javascript
class Trading212ApiClient {
  constructor(environment = 'demo') {
    this.baseUrl = environment === 'live' ? API_DOMAIN_LIVE : API_DOMAIN_DEMO;
    this.apiVersion = API_VERSION;
    this.cache = CacheService.getScriptCache();
    this.rateLimiter = new RateLimiter(API_RESOURCES);
  }
  
  async get(endpoint, params = {}, cacheOptions = { enabled: true, ttl: 600 }) {
    const cacheKey = this._generateCacheKey(endpoint, params);
    
    // Try cache first if enabled
    if (cacheOptions.enabled) {
      const cachedData = this._getFromCache(cacheKey);
      if (cachedData) return cachedData;
    }
    
    // Check rate limiting
    const canProceed = this.rateLimiter.canProceed(endpoint);
    if (!canProceed.proceed) {
      await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
    }
    
    // Make the actual request with retry logic
    const data = await this._makeRequestWithRetry(endpoint, params);
    
    // Cache the result if enabled
    if (cacheOptions.enabled && data) {
      this._setInCache(cacheKey, data, cacheOptions.ttl);
    }
    
    return data;
  }
  
  _generateCacheKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }
  
  _getFromCache(cacheKey) {
    const cachedData = this.cache.get(cacheKey);
    return cachedData ? JSON.parse(cachedData) : null;
  }
  
  _setInCache(cacheKey, data, ttl) {
    this.cache.put(cacheKey, JSON.stringify(data), ttl);
  }
  
  async _makeRequestWithRetry(endpoint, params, retryCount = 0) {
    try {
      const url = this._buildUrl(endpoint, params);
      const options = this._getRequestOptions();
      
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 200) {
        return JSON.parse(response.getContentText());
      } else if (statusCode === 429 && retryCount < 3) {
        // Rate limit hit, wait and retry
        const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this._makeRequestWithRetry(endpoint, params, retryCount + 1);
      } else {
        throw new Error(`API request failed with status ${statusCode}`);
      }
    } catch (error) {
      if (retryCount < 3 && this._isRetryableError(error)) {
        const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this._makeRequestWithRetry(endpoint, params, retryCount + 1);
      }
      throw error;
    }
  }
  
  _buildUrl(endpoint, params) {
    let url = `${this.baseUrl}${this.apiVersion}${endpoint}`;
    
    if (Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      url += `?${queryString}`;
    }
    
    return url;
  }
  
  _getRequestOptions() {
    return {
      method: 'GET',
      headers: {
        'Authorization': PropertiesService.getUserProperties().getProperty('API_KEY'),
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
  }
  
  _isRetryableError(error) {
    // Network errors or 5xx server errors are typically retryable
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('500') ||
           error.message.includes('503');
  }
}
```

### 1.2 Data Model & Repository Implementation

**Description**: Create proper data models and repository classes for different entity types.

**Complexity**: C3  
**Priority**: P2  
**Dependencies**: 1.1 API Client Refactoring  

**Implementation Example**:
```javascript
class PieModel {
  constructor(rawData) {
    this.id = rawData.id;
    this.name = rawData.name;
    this.value = parseFloat(rawData.value);
    this.items = (rawData.items || []).map(item => new PieItemModel(item));
    this.lastUpdated = new Date();
  }
  
  get totalValue() {
    return this.value;
  }
  
  get itemCount() {
    return this.items.length;
  }
  
  // Methods for data transformation, validation, etc.
}

class PieItemModel {
  constructor(rawData) {
    this.ticker = rawData.ticker;
    this.name = rawData.name;
    this.value = parseFloat(rawData.value);
    this.weight = parseFloat(rawData.weight);
  }
}

class PiesRepository {
  constructor(apiClient, sheetManager) {
    this.apiClient = apiClient;
    this.sheetManager = sheetManager;
    this.sheetName = API_RESOURCES.PIES.sheetName;
  }
  
  async fetchAll() {
    const data = await this.apiClient.get(API_RESOURCES.PIES.endpoint);
    return (data.items || []).map(item => new PieModel(item));
  }
  
  async saveToSheet(pies) {
    // Transform models to sheet data and save
    const headers = ['ID', 'Name', 'Value', 'Items', 'Last Updated'];
    const rows = pies.map(pie => [
      pie.id,
      pie.name,
      pie.value,
      pie.itemCount,
      pie.lastUpdated
    ]);
    
    this.sheetManager.writeData(this.sheetName, headers, rows);
  }
}
```

### 1.3 Enhanced Error Handling & Logging

**Description**: Implement robust error handling with user-friendly messages and comprehensive logging.

**Complexity**: C2  
**Priority**: P2  
**Dependencies**: None  

**Implementation Example**:
```javascript
class ErrorHandler {
  static ERRORS = {
    API_AUTH: { code: 'E001', message: 'Authentication failed. Please check your API key.' },
    API_RATE_LIMIT: { code: 'E002', message: 'Rate limit exceeded. Please try again in a few minutes.' },
    API_TIMEOUT: { code: 'E003', message: 'The request timed out. Please try again.' },
    API_SERVER_ERROR: { code: 'E004', message: 'Trading212 API server error. Please try again later.' },
    DATA_PROCESSING: { code: 'E005', message: 'Error processing data. Please check your sheet formatting.' },
    PERMISSION_DENIED: { code: 'E006', message: 'Permission denied. Please make sure you have access to this sheet.' }
  };
  
  static handle(error, context = {}) {
    // Log the error
    Logger.log(`Error in ${context.location || 'unknown'}: ${error.message}`);
    
    // Add to error log sheet if available
    ErrorHandler.logToSheet(error, context);
    
    // Determine the type of error and return appropriate user message
    return ErrorHandler.getUserMessage(error);
  }
  
  static logToSheet(error, context) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ErrorLog') || 
                    SpreadsheetApp.getActiveSpreadsheet().insertSheet('ErrorLog');
      
      const errorRow = [
        new Date(),
        context.location || 'unknown',
        error.name || 'Error',
        error.message,
        JSON.stringify(context)
      ];
      
      sheet.appendRow(errorRow);
    } catch (e) {
      // Silent fail for logging errors
      Logger.log('Failed to log error to sheet: ' + e.message);
    }
  }
  
  static getUserMessage(error) {
    // Match error to known types or return generic message
    if (error.name === 'ApiError' && error.statusCode === 401) {
      return ErrorHandler.ERRORS.API_AUTH;
    }
    
    if (error.name === 'ApiError' && error.statusCode === 429) {
      return ErrorHandler.ERRORS.API_RATE_LIMIT;
    }
    
    if (error.name === 'ApiError' && error.statusCode >= 500) {
      return ErrorHandler.ERRORS.API_SERVER_ERROR;
    }
    
    if (error.message.includes('timeout')) {
      return ErrorHandler.ERRORS.API_TIMEOUT;
    }
    
    if (error.message.includes('Permission')) {
      return ErrorHandler.ERRORS.PERMISSION_DENIED;
    }
    
    // Default generic error
    return {
      code: 'E999',
      message: 'An unexpected error occurred. Please try again later.'
    };
  }
}
```

## 2. User Experience Improvements

### 2.1 Streamlined Setup Wizard

**Description**: Enhance the setup process with clearer steps, better guidance, and improved error handling.

**Complexity**: C2  
**Priority**: P2  
**Dependencies**: 1.3 Enhanced Error Handling  

**Implementation Example**:
```javascript
function createImprovedSetupWizard() {
  // Create a more guided setup experience
  const template = HtmlService.createTemplateFromFile('html/improvedSetup');
  
  // Add dynamic content to template
  template.setupStatus = getSetupStatus();
  template.environments = [
    { id: 'demo', name: 'Demo Environment (Test with sample data)', icon: 'school' },
    { id: 'live', name: 'Live Environment (Connect to your real account)', icon: 'account_balance' }
  ];
  
  return template.evaluate()
    .setWidth(600)
    .setHeight(500)
    .setTitle('Trading212 Portfolio Setup');
}

// Example HTML template for improved setup
// html/improvedSetup.html
```

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('css/styles'); ?>
</head>
<body>
  <div class="setup-container">
    <div class="step-indicator">
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
    </div>
    
    <div id="step-welcome" class="step active">
      <div class="card-panel">
        <h5><i class="material-icons left">power_settings_new</i> Welcome to Trading212 Portfolio Manager</h5>
        <p>This add-in helps you manage and analyze your Trading212 portfolio directly in Google Sheets.</p>
        <p>Let's get you set up in just a few simple steps.</p>
        
        <div class="button-container">
          <div></div>
          <button class="waves-effect waves-light btn" onclick="nextStep()">
            <i class="material-icons right">arrow_forward</i>Get Started
          </button>
        </div>
      </div>
    </div>

    <div id="step-environment" class="step">
      <div class="card-panel">
        <h5><i class="material-icons left">cloud</i> Choose Your Environment</h5>
        <p>Select whether you want to use the demo environment to test things out, or connect to your live Trading212 account.</p>
        
        <div class="environment-cards">
          <? for (let env of environments) { ?>
            <div class="card environment-card" onclick="selectEnvironment('<?= env.id ?>')">
              <div class="card-content">
                <i class="material-icons medium"><?= env.icon ?></i>
                <span class="card-title"><?= env.name ?></span>
              </div>
            </div>
          <? } ?>
        </div>
        
        <div class="button-container">
          <button class="waves-effect waves-light btn btn-prev" onclick="prevStep()">
            <i class="material-icons left">arrow_back</i>Back
          </button>
          <button class="waves-effect waves-light btn btn-next" onclick="nextStep()">
            <i class="material-icons right">arrow_forward</i>Next
          </button>
        </div>
      </div>
    </div>
    
    <!-- Additional steps would go here -->
  </div>
  
  <?!= include('js/scripts'); ?>
</body>
</html>
```

### 2.2 Data Refresh Dashboard

**Description**: Create a centralized dashboard for refreshing data with status indicators.

**Complexity**: C2  
**Priority**: P3  
**Dependencies**: 1.1 API Client Refactoring  

**Implementation Example**:
```javascript
function showRefreshDashboard() {
  const template = HtmlService.createTemplateFromFile('html/refreshDashboard');
  
  // Get refresh status for each data type
  const refreshStatus = getDataRefreshStatus();
  template.refreshStatus = refreshStatus;
  
  return template.evaluate()
    .setWidth(700)
    .setHeight(500)
    .setTitle('Data Refresh Dashboard');
}

function getDataRefreshStatus() {
  const userProperties = PropertiesService.getUserProperties();
  const dataTypes = [
    { id: 'Pies', name: 'Investment Pies', icon: 'pie_chart' },
    { id: 'Account Info', name: 'Account Information', icon: 'account_balance' },
    { id: 'Cash Balance', name: 'Account Cash', icon: 'attach_money' },
    { id: 'transactions', name: 'Transactions', icon: 'swap_horiz' },
    { id: 'orderHistory', name: 'Order History', icon: 'history' },
    { id: 'dividends', name: 'Dividends', icon: 'trending_up' }
  ];
  
  // Get last refresh time for each data type
  return dataTypes.map(type => {
    const lastRefresh = userProperties.getProperty(`LAST_REFRESH_${type.id}`);
    const lastRefreshDate = lastRefresh ? new Date(lastRefresh) : null;
    
    return {
      ...type,
      lastRefresh: lastRefreshDate,
      isStale: isDataStale(lastRefreshDate),
      formattedLastRefresh: formatLastRefreshTime(lastRefreshDate)
    };
  });
}

function isDataStale(lastRefreshDate) {
  if (!lastRefreshDate) return true;
  
  const now = new Date();
  const diffMs = now - lastRefreshDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Consider data stale if it's more than 24 hours old
  return diffHours > 24;
}

function formatLastRefreshTime(date) {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
}
```

### 2.3 Improved Data Fetch Modal

**Description**: Enhance the data fetch modal with better progress tracking and feedback.

**Complexity**: C2  
**Priority**: P2  
**Dependencies**: 1.1 API Client Refactoring, 1.3 Enhanced Error Handling  

**Implementation Example**:
```javascript
function createEnhancedFetchDataModal() {
  const template = HtmlService.createTemplateFromFile('html/enhancedFetchData');
  
  // Add data options with descriptions
  template.dataOptions = [
    { 
      id: 'Pies', 
      name: 'Investment Pies', 
      description: 'Your custom investment pie configurations and allocations',
      icon: 'pie_chart'
    },
    { 
      id: 'Account Info', 
      name: 'Account Information', 
      description: 'General account details, settings, and preferences',
      icon: 'account_circle'
    },
    { 
      id: 'Cash Balance', 
      name: 'Account Cash', 
      description: 'Current cash balance and currency information',
      icon: 'attach_money'
    },
    { 
      id: 'transactions', 
      name: 'Transactions', 
      description: 'History of buy, sell, and fund transactions',
      icon: 'swap_horiz'
    },
    { 
      id: 'orderHistory', 
      name: 'Order History', 
      description: 'History of executed and pending orders',
      icon: 'history'
    },
    { 
      id: 'dividends', 
      name: 'Dividends', 
      description: 'All dividend payments received',
      icon: 'trending_up'
    }
  ];
  
  return template.evaluate()
    .setWidth(700)
    .setHeight(500)
    .setTitle('Fetch Trading212 Data');
}
```

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('css/styles'); ?>
</head>
<body>
  <div class="setup-container">
    <div class="step-indicator">
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
    </div>
    
    <div id="step-selectData" class="step active">
      <div class="fetch-data-container">
        <h5>Select Data to Fetch</h5>
        <p>Choose the data you'd like to retrieve from your Trading212 account:</p>

        <form id="fetch-data-form">
          <? for (let option of dataOptions) { ?>
            <div class="option-card">
              <label>
                <input type="checkbox" class="filled-in" name="fetchOption" value="<?= option.id ?>" />
                <span>
                  <i class="material-icons left"><?= option.icon ?></i>
                  <span class="option-title"><?= option.name ?></span><br>
                  <span class="option-description"><?= option.description ?></span>
                </span>
              </label>
            </div>
          <? } ?>
        </form>

        <div class="button-container">
          <button class="waves-effect waves-light btn" onclick="closeModal()">
            Cancel
          </button>
          <button class="waves-effect waves-light btn" onclick="fetchSelectedData(); nextStep()">
            <i class="material-icons right">cloud_download</i>Fetch Selected Data
          </button>
        </div>
      </div>
    </div>
    
    <div id="step-fetchingData" class="step">
      <div id="fetch-progress">
        <h5>Fetching Data:</h5>
        <ul id="progress-list" class="collection">
          <!-- Progress items will be dynamically added here -->
        </ul>
      </div>
      
      <div class="button-container">
        <button class="waves-effect waves-light btn" onclick="closeModal()">
          Cancel
        </button>
        <button class="waves-effect waves-light btn" onclick="closeModal()">
          Done
        </button>
      </div>
    </div>
  </div>
  
  <?!= include('js/scripts'); ?>
</body>
</html>
```

## 3. Data Visualization & Analytics

### 3.1 Portfolio Overview Dashboard (HIGH PRIORITY)

**Description**: Create a comprehensive dashboard sheet with key portfolio metrics.

**Complexity**: C3  
**Priority**: P1  
**Dependencies**: 1.2 Data Model & Repository Implementation  

**Implementation Example**:
```javascript
function createPortfolioDashboard() {
  // Get or create dashboard sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let dashboardSheet = spreadsheet.getSheetByName('Portfolio Dashboard');
  
  if (!dashboardSheet) {
    dashboardSheet = spreadsheet.insertSheet('Portfolio Dashboard');
  } else {
    dashboardSheet.clear();
  }
  
  // Add sections to the dashboard
  let nextRow = 1;
  nextRow = addPortfolioSummarySection(dashboardSheet, nextRow);
  nextRow = addWTRChartSection(dashboardSheet, nextRow);
  nextRow = addAllocationChartSection(dashboardSheet, nextRow);
  nextRow = addRecentActivitySection(dashboardSheet, nextRow);
  
  // Format the dashboard
  formatDashboardSheet(dashboardSheet);
  
  // Return to dashboard sheet
  spreadsheet.setActiveSheet(dashboardSheet);
}

function addPortfolioSummarySection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('PORTFOLIO SUMMARY');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Fetch the required data
  const accountRepo = new AccountRepository();
  const accountInfo = accountRepo.getLatest();
  
  // Create summary section with key metrics
  const metrics = [
    ['Total Value', accountInfo.totalValue],
    ['Cash Balance', accountInfo.cashBalance],
    ['Invested Amount', accountInfo.investedAmount],
    ['Total Return', accountInfo.totalReturn],
    ['Return %', accountInfo.returnPercentage]
  ];
  
  sheet.getRange(startRow + 2, 1, metrics.length, 2).setValues(metrics);
  
  // Format values appropriately
  sheet.getRange(startRow + 2, 2, 3, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 5, 2, 1, 1).setNumberFormat('0.00%');
  
  return startRow + metrics.length + 3; // Return next available row
}

function addWTRChartSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('WEIGHTED TOTAL RETURN');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Calculate WTR data
  const wtrData = calculateWTR();
  
  // Write WTR data to sheet
  const wtrHeaders = ['Date', 'Total Value', 'Cumulative Deposits', 'Weighted Total Return'];
  sheet.getRange(startRow + 2, 1, 1, wtrHeaders.length).setValues([wtrHeaders]);
  sheet.getRange(startRow + 3, 1, wtrData.length, wtrHeaders.length).setValues(wtrData);
  
  // Create WTR chart
  const wtrRange = sheet.getRange(startRow + 2, 1, wtrData.length + 1, wtrHeaders.length);
  const wtrChart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(wtrRange)
    .setPosition(startRow + 2, 5, 0, 0)
    .setOption('title', 'Weighted Total Return Over Time')
    .setOption('legend', {position: 'bottom'})
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(wtrChart);
  
  return startRow + wtrData.length + 8; // Return next available row
}

function calculateWTR() {
  // Get transaction history
  const transactionRepo = new TransactionRepository();
  const transactions = transactionRepo.getAll();
  
  // Get historical portfolio values
  const historyRepo = new PortfolioHistoryRepository();
  const history = historyRepo.getAll();
  
  // Calculate daily WTR
  let cumulativeDeposits = 0;
  const wtrData = [];
  
  // Group transactions by date
  const transactionsByDate = {};
  transactions.forEach(tx => {
    const dateStr = tx.date.toISOString().split('T')[0];
    if (!transactionsByDate[dateStr]) {
      transactionsByDate[dateStr] = [];
    }
    transactionsByDate[dateStr].push(tx);
  });
  
  // Calculate WTR for each historical point
  history.forEach(point => {
    const dateStr = point.date.toISOString().split('T')[0];
    
    // Add any deposits/withdrawals on this date
    if (transactionsByDate[dateStr]) {
      transactionsByDate[dateStr].forEach(tx => {
        if (tx.type === 'DEPOSIT') {
          cumulativeDeposits += tx.amount;
        } else if (tx.type === 'WITHDRAWAL') {
          cumulativeDeposits -= tx.amount;
        }
      });
    }
    
    // Calculate WTR
    const wtr = point.totalValue - cumulativeDeposits;
    
    wtrData.push([
      point.date,
      point.totalValue,
      cumulativeDeposits,
      wtr
    ]);
  });
  
  return wtrData;
}

function addAllocationChartSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('PORTFOLIO ALLOCATION');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get portfolio data
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  
  // Group by instrument type
  const typeAllocation = {};
  let totalValue = 0;
  
  holdings.forEach(holding => {
    const type = holding.type || 'Other';
    if (!typeAllocation[type]) {
      typeAllocation[type] = 0;
    }
    typeAllocation[type] += holding.value;
    totalValue += holding.value;
  });
  
  // Write allocation data
  const allocationData = Object.entries(typeAllocation).map(([type, value]) => [
    type,
    value,
    (value / totalValue) * 100
  ]);
  
  const allocationHeaders = ['Type', 'Value', 'Percentage'];
  sheet.getRange(startRow + 2, 1, 1, allocationHeaders.length).setValues([allocationHeaders]);
  sheet.getRange(startRow + 3, 1, allocationData.length, allocationHeaders.length).setValues(allocationData);
  
  // Format the data
  sheet.getRange(startRow + 3, 2, allocationData.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 3, allocationData.length, 1).setNumberFormat('0.00%');
  
  // Create allocation pie chart
  const dataRange = sheet.getRange(startRow + 2, 1, allocationData.length + 1, 2);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dataRange)
    .setPosition(startRow + 2, 5, 0, 0)
    .setOption('title', 'Portfolio Allocation by Type')
    .setOption('pieSliceText', 'percentage')
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + allocationData.length + 8; // Return next available row
}

function addRecentActivitySection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('RECENT ACTIVITY');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get recent transactions
  const transactionRepo = new TransactionRepository();
  const recentTransactions = transactionRepo.getRecent(10);
  
  // Format for display
  const headers = ['Date', 'Type', 'Ticker', 'Description', 'Amount'];
  
  const transactionData = recentTransactions.map(tx => [
    tx.date,
    tx.type,
    tx.ticker || '',
    tx.description,
    tx.amount
  ]);
  
  // Write to sheet
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(startRow + 3, 1, transactionData.length, headers.length).setValues(transactionData);
  
  // Format the data
  sheet.getRange(startRow + 3, 1, transactionData.length, 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(startRow + 3, 5, transactionData.length, 1).setNumberFormat('"$"#,##0.00');
  
  return startRow + transactionData.length + 5; // Return next available row
}

function formatDashboardSheet(sheet) {
  // Format headers
  const headerRanges = sheet.getRange('A1:Z1');
  headerRanges.setBackground('#f3f3f3').setFontWeight('bold');
  
  // Auto-resize columns
  for (let i = 1; i <= 10; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Add borders to sections
  // This would be more complex in real implementation
}
```

### 3.2 Investment Performance Analysis (HIGH PRIORITY)

**Description**: Add tools for analyzing investment performance across different time periods.

**Complexity**: C3  
**Priority**: P1  
**Dependencies**: 1.2 Data Model & Repository Implementation, 3.1 Portfolio Overview Dashboard  

**Implementation Example**:
```javascript
function createPerformanceAnalysisSheet() {
  // Get or create performance sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let perfSheet = spreadsheet.getSheetByName('Performance Analysis');
  
  if (!perfSheet) {
    perfSheet = spreadsheet.insertSheet('Performance Analysis');
  } else {
    perfSheet.clear();
  }
  
  // Add sections
  let nextRow = 1;
  nextRow = addPerformanceOverviewSection(perfSheet, nextRow);
  nextRow = addTimePeriodsSection(perfSheet, nextRow);
  nextRow = addTopPerformersSection(perfSheet, nextRow);
  nextRow = addBottomPerformersSection(perfSheet, nextRow);
  
  // Format the sheet
  formatPerformanceSheet(perfSheet);
  
  // Return to performance sheet
  spreadsheet.setActiveSheet(perfSheet);
}

function addPerformanceOverviewSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('PERFORMANCE OVERVIEW');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics();
  
  // Write overview metrics
  const overviewData = [
    ['Total Return', metrics.totalReturn],
    ['Return %', metrics.returnPercentage],
    ['Annualized Return', metrics.annualizedReturn],
    ['Volatility', metrics.volatility],
    ['Sharpe Ratio', metrics.sharpeRatio]
  ];
  
  sheet.getRange(startRow + 2, 1, overviewData.length, 2).setValues(overviewData);
  
  // Format appropriately
  sheet.getRange(startRow + 2, 2, 1, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 2, 2, 1).setNumberFormat('0.00%');
  sheet.getRange(startRow + 5, 2, 1, 1).setNumberFormat('0.00');
  
  return startRow + overviewData.length + 3;
}

function addTimePeriodsSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('PERFORMANCE BY TIME PERIOD');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Calculate performance for different time periods
  const timeframes = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'All'];
  const performanceByTimeframe = calculatePerformanceByTimeframe(timeframes);
  
  // Write headers
  const headers = ['Time Period', 'Start Value', 'End Value', 'Change', 'Change %'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  
  // Write data
  const rows = timeframes.map(timeframe => {
    const perf = performanceByTimeframe[timeframe];
    return [
      timeframe,
      perf.startValue,
      perf.endValue,
      perf.absoluteChange,
      perf.percentageChange
    ];
  });
  
  sheet.getRange(startRow + 3, 1, rows.length, headers.length).setValues(rows);
  
  // Format appropriately
  sheet.getRange(startRow + 3, 2, rows.length, 2).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 4, rows.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 5, rows.length, 1).setNumberFormat('0.00%');
  
  // Create a bar chart for percentage changes
  const dataRange = sheet.getRange(startRow + 2, 1, rows.length + 1, 5);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange(startRow + 2, 1, rows.length + 1, 1)) // Time periods
    .addRange(sheet.getRange(startRow + 2, 5, rows.length + 1, 1)) // Percentage changes
    .setPosition(startRow + 2, 7, 0, 0)
    .setOption('title', 'Performance by Time Period')
    .setOption('legend', {position: 'none'})
    .setOption('hAxis', {title: 'Time Period'})
    .setOption('vAxis', {title: 'Change %', format: 'percent'})
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + rows.length + 8;
}

function calculatePerformanceMetrics() {
  // Get portfolio history
  const historyRepo = new PortfolioHistoryRepository();
  const history = historyRepo.getAll();
  
  // Default empty metrics
  const metrics = {
    totalReturn: 0,
    returnPercentage: 0,
    annualizedReturn: 0,
    volatility: 0,
    sharpeRatio: 0
  };
  
  if (history.length < 2) return metrics;
  
  // Calculate basic metrics
  const startValue = history[0].totalValue;
  const endValue = history[history.length - 1].totalValue;
  const totalReturn = endValue - startValue;
  const returnPercentage = startValue > 0 ? totalReturn / startValue : 0;
  
  // Calculate annualized return
  const firstDate = history[0].date;
  const lastDate = history[history.length - 1].date;
  const yearFraction = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365);
  const annualizedReturn = yearFraction > 0 ? Math.pow(1 + returnPercentage, 1/yearFraction) - 1 : 0;
  
  // Calculate daily returns for volatility
  const dailyReturns = [];
  for (let i = 1; i < history.length; i++) {
    const prevValue = history[i-1].totalValue;
    const currValue = history[i].totalValue;
    if (prevValue > 0) {
      dailyReturns.push((currValue - prevValue) / prevValue);
    }
  }
  
  // Calculate volatility (standard deviation of returns)
  const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
  const squaredDiffs = dailyReturns.map(ret => Math.pow(ret - avgReturn, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualize
  
  // Calculate Sharpe ratio (assuming risk-free rate of 0.02)
  const riskFreeRate = 0.02;
  const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  
  return {
    totalReturn,
    returnPercentage,
    annualizedReturn,
    volatility,
    sharpeRatio
  };
}

function calculatePerformanceByTimeframe(timeframes) {
  // Get portfolio history
  const historyRepo = new PortfolioHistoryRepository();
  const history = historyRepo.getAll();
  
  // Get current values
  const currentValue = history[history.length - 1].totalValue;
  const currentDate = history[history.length - 1].date;
  
  // Calculate for each timeframe
  const result = {};
  
  timeframes.forEach(timeframe => {
    let startDate;
    const now = new Date();
    
    // Determine start date based on timeframe
    switch (timeframe) {
      case '1D':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '1W':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case '1Y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'All':
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Find closest historical data point to the start date
    let startValue = 0;
    let closestDate = null;
    let minDiff = Number.MAX_VALUE;
    
    for (const point of history) {
      const diff = Math.abs(point.date - startDate);
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = point.date;
        startValue = point.totalValue;
      }
    }
    
    // Calculate performance metrics
    const absoluteChange = currentValue - startValue;
    const percentageChange = startValue > 0 ? absoluteChange / startValue : 0;
    
    result[timeframe] = {
      startDate: closestDate,
      endDate: currentDate,
      startValue,
      endValue: currentValue,
      absoluteChange,
      percentageChange
    };
  });
  
  return result;
}

function addTopPerformersSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('TOP PERFORMERS');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get holdings with performance data
  const holdingsWithPerformance = getHoldingsWithPerformance();
  
  // Sort by performance (descending) and take top 5
  holdingsWithPerformance.sort((a, b) => b.returnPercentage - a.returnPercentage);
  const topPerformers = holdingsWithPerformance.slice(0, 5);
  
  // Write headers
  const headers = ['Ticker', 'Name', 'Value', 'Return', 'Return %'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  
  // Write data
  const rows = topPerformers.map(holding => [
    holding.ticker,
    holding.name,
    holding.value,
    holding.return,
    holding.returnPercentage
  ]);
  
  sheet.getRange(startRow + 3, 1, rows.length, headers.length).setValues(rows);
  
  // Format appropriately
  sheet.getRange(startRow + 3, 3, rows.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 4, rows.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 5, rows.length, 1).setNumberFormat('0.00%');
  
  return startRow + rows.length + 3;
}

function addBottomPerformersSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('BOTTOM PERFORMERS');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get holdings with performance data
  const holdingsWithPerformance = getHoldingsWithPerformance();
  
  // Sort by performance (ascending) and take bottom 5
  holdingsWithPerformance.sort((a, b) => a.returnPercentage - b.returnPercentage);
  const bottomPerformers = holdingsWithPerformance.slice(0, 5);
  
  // Write headers
  const headers = ['Ticker', 'Name', 'Value', 'Return', 'Return %'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  
  // Write data
  const rows = bottomPerformers.map(holding => [
    holding.ticker,
    holding.name,
    holding.value,
    holding.return,
    holding.returnPercentage
  ]);
  
  sheet.getRange(startRow + 3, 1, rows.length, headers.length).setValues(rows);
  
  // Format appropriately
  sheet.getRange(startRow + 3, 3, rows.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 4, rows.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 5, rows.length, 1).setNumberFormat('0.00%');
  
  return startRow + rows.length + 3;
}

function getHoldingsWithPerformance() {
  // Get current holdings
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  
  // Get transactions for cost basis calculation
  const transactionRepo = new TransactionRepository();
  const transactions = transactionRepo.getAll();
  
  // Calculate performance for each holding
  return holdings.map(holding => {
    // Find transactions for this holding
    const holdingTransactions = transactions.filter(tx => 
      tx.ticker === holding.ticker && (tx.type === 'BUY' || tx.type === 'SELL')
    );
    
    // Calculate cost basis and return
    let costBasis = 0;
    let sharesBought = 0;
    let sharesSold = 0;
    
    holdingTransactions.forEach(tx => {
      if (tx.type === 'BUY') {
        costBasis += tx.amount;
        sharesBought += tx.shares;
      } else if (tx.type === 'SELL') {
        // Reduce cost basis proportionally to shares sold
        const soldRatio = tx.shares / (sharesBought - sharesSold);
        costBasis -= costBasis * soldRatio;
        sharesSold += tx.shares;
      }
    });
    
    // Calculate return
    const totalReturn = holding.value - costBasis;
    const returnPercentage = costBasis > 0 ? totalReturn / costBasis : 0;
    
    return {
      ...holding,
      costBasis,
      return: totalReturn,
      returnPercentage
    };
  });
}

function formatPerformanceSheet(sheet) {
  // Format headers
  const headerRanges = sheet.getRange('A1:Z1');
  headerRanges.setBackground('#f3f3f3').setFontWeight('bold');
  
  // Auto-resize columns
  for (let i = 1; i <= 10; i++) {
    sheet.autoResizeColumn(i);
  }
}
```

### 3.3 Portfolio Allocation Analysis (LOW PRIORITY)

**Description**: Provide detailed analysis of portfolio allocation across different dimensions.

**Complexity**: C3  
**Priority**: P4  
**Dependencies**: 1.2 Data Model & Repository Implementation  

**Implementation Example**:
```javascript
function createAllocationAnalysisSheet() {
  // Get or create allocation sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let allocSheet = spreadsheet.getSheetByName('Allocation Analysis');
  
  if (!allocSheet) {
    allocSheet = spreadsheet.insertSheet('Allocation Analysis');
  } else {
    allocSheet.clear();
  }
  
  // Add sections - Note: External data would be needed for complete implementation
  let nextRow = 1;
  nextRow = addTypeAllocationSection(allocSheet, nextRow);
  nextRow = addBasicSectorAllocationSection(allocSheet, nextRow); // Basic implementation without external data
  nextRow = addGeographicAllocationPlaceholder(allocSheet, nextRow); // Placeholder - needs external data
  
  // Format the sheet
  formatAllocationSheet(allocSheet);
  
  // Return to allocation sheet
  spreadsheet.setActiveSheet(allocSheet);
}

function addTypeAllocationSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('ALLOCATION BY TYPE');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get portfolio data
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  
  // Group by instrument type
  const typeAllocation = {};
  let totalValue = 0;
  
  holdings.forEach(holding => {
    const type = holding.type || 'Other';
    if (!typeAllocation[type]) {
      typeAllocation[type] = 0;
    }
    typeAllocation[type] += holding.value;
    totalValue += holding.value;
  });
  
  // Write allocation data
  const allocationData = Object.entries(typeAllocation).map(([type, value]) => [
    type,
    value,
    (value / totalValue) * 100
  ]);
  
  const allocationHeaders = ['Type', 'Value', 'Percentage'];
  sheet.getRange(startRow + 2, 1, 1, allocationHeaders.length).setValues([allocationHeaders]);
  sheet.getRange(startRow + 3, 1, allocationData.length, allocationHeaders.length).setValues(allocationData);
  
  // Format the data
  sheet.getRange(startRow + 3, 2, allocationData.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 3, allocationData.length, 1).setNumberFormat('0.00%');
  
  // Create allocation pie chart
  const dataRange = sheet.getRange(startRow + 2, 1, allocationData.length + 1, 2);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dataRange)
    .setPosition(startRow + 2, 5, 0, 0)
    .setOption('title', 'Allocation by Instrument Type')
    .setOption('pieSliceText', 'percentage')
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + allocationData.length + 8;
}

function addBasicSectorAllocationSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('ALLOCATION BY SECTOR (BASIC)');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Note: This is a simplified version without external data
  // For a complete implementation, we would need to get sector data from an external source
  
  // Write disclaimer
  sheet.getRange(startRow + 2, 1).setValue('Note: This is a simplified sector allocation based on available data. ' + 
                                            'For a complete sector analysis, integration with external data sources is required.');
  sheet.getRange(startRow + 2, 1, 1, 5).merge();
  
  // Create sample data based on instrument names (this would be replaced with real data)
  const sampleSectors = [
    ['Technology', 35, 35],
    ['Healthcare', 20, 20],
    ['Financial Services', 15, 15],
    ['Consumer Cyclical', 10, 10],
    ['Industrials', 8, 8],
    ['Others', 12, 12]
  ];
  
  // Write sample data
  const headers = ['Sector', 'Value (%)', 'Allocation (%)'];
  sheet.getRange(startRow + 4, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(startRow + 5, 1, sampleSectors.length, headers.length).setValues(sampleSectors);
  
  // Create sample chart
  const dataRange = sheet.getRange(startRow + 4, 1, sampleSectors.length + 1, 2);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dataRange)
    .setPosition(startRow + 4, 5, 0, 0)
    .setOption('title', 'Sample Sector Allocation')
    .setOption('pieSliceText', 'percentage')
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + sampleSectors.length + 10;
}

function addGeographicAllocationPlaceholder(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('GEOGRAPHIC ALLOCATION (FUTURE FEATURE)');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Write placeholder message
  sheet.getRange(startRow + 2, 1).setValue('Geographic allocation analysis will be implemented in a future update. ' + 
                                           'This feature requires integration with external data sources to determine ' + 
                                           'the geographic distribution of holdings.');
  sheet.getRange(startRow + 2, 1, 1, 5).merge();
  
  return startRow + 4;
}

function formatAllocationSheet(sheet) {
  // Format headers
  const headerRanges = sheet.getRange('A1:Z1');
  headerRanges.setBackground('#f3f3f3').setFontWeight('bold');
  
  // Auto-resize columns
  for (let i = 1; i <= 10; i++) {
    sheet.autoResizeColumn(i);
  }
}
```

### 3.4 Interactive Charts & Visualizations (LOWER PRIORITY)

**Description**: Add interactive charts and visualizations for better data exploration.

**Complexity**: C3  
**Priority**: P3  
**Dependencies**: 3.1 Portfolio Overview Dashboard, 3.2 Investment Performance Analysis, 3.3 Portfolio Allocation Analysis  

**Implementation Example**:
```javascript
function createInteractiveCharts() {
  // Note: In Google Sheets, chart interactivity is limited
  // This implementation focuses on creating multiple comprehensive charts
  // rather than truly interactive visualizations
  
  // Get the dashboard sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let chartsSheet = spreadsheet.getSheetByName('Portfolio Charts');
  
  if (!chartsSheet) {
    chartsSheet = spreadsheet.insertSheet('Portfolio Charts');
  } else {
    chartsSheet.clear();
  }
  
  // Add various charts
  let nextRow = 1;
  nextRow = addPortfolioValueChart(chartsSheet, nextRow);
  nextRow = addReturnComparisonChart(chartsSheet, nextRow);
  nextRow = addHoldingsComparisonChart(chartsSheet, nextRow);
  
  // Format the sheet
  formatChartsSheet(chartsSheet);
  
  // Return to charts sheet
  spreadsheet.setActiveSheet(chartsSheet);
}

function addPortfolioValueChart(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('PORTFOLIO VALUE OVER TIME');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get portfolio history data
  const historyRepo = new PortfolioHistoryRepository();
  const history = historyRepo.getAll();
  
  // Write data for chart
  const historyData = history.map(point => [
    point.date,
    point.totalValue
  ]);
  
  const headers = ['Date', 'Portfolio Value'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(startRow + 3, 1, historyData.length, headers.length).setValues(historyData);
  
  // Format data
  sheet.getRange(startRow + 3, 1, historyData.length, 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(startRow + 3, 2, historyData.length, 1).setNumberFormat('"$"#,##0.00');
  
  // Create value chart
  const dataRange = sheet.getRange(startRow + 2, 1, historyData.length + 1, headers.length);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dataRange)
    .setPosition(startRow + 2, 4, 0, 0)
    .setOption('title', 'Portfolio Value Over Time')
    .setOption('legend', {position: 'none'})
    .setOption('width', 750)
    .setOption('height', 400)
    .setOption('hAxis', {title: 'Date', gridlines: {count: 6}})
    .setOption('vAxis', {title: 'Value', format: '$#,##0.00'})
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + historyData.length + 10;
}

function addReturnComparisonChart(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('RETURN COMPARISON BY TIME PERIOD');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Calculate performance for different time periods
  const timeframes = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'All'];
  const performanceByTimeframe = calculatePerformanceByTimeframe(timeframes);
  
  // Prepare data for chart
  const comparisonData = timeframes.map(timeframe => {
    const perf = performanceByTimeframe[timeframe];
    return [
      timeframe,
      perf.percentageChange * 100 // Convert to percentage
    ];
  });
  
  // Write data
  const headers = ['Time Period', 'Return (%)'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(startRow + 3, 1, comparisonData.length, headers.length).setValues(comparisonData);
  
  // Format data
  sheet.getRange(startRow + 3, 2, comparisonData.length, 1).setNumberFormat('0.00');
  
  // Create column chart
  const dataRange = sheet.getRange(startRow + 2, 1, comparisonData.length + 1, headers.length);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataRange)
    .setPosition(startRow + 2, 4, 0, 0)
    .setOption('title', 'Return by Time Period')
    .setOption('legend', {position: 'none'})
    .setOption('width', 750)
    .setOption('height', 400)
    .setOption('hAxis', {title: 'Time Period'})
    .setOption('vAxis', {title: 'Return (%)'})
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + comparisonData.length + 10;
}

function addHoldingsComparisonChart(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('TOP HOLDINGS COMPARISON');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get holdings data
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  
  // Sort by value and take top 10
  holdings.sort((a, b) => b.value - a.value);
  const topHoldings = holdings.slice(0, 10);
  
  // Prepare data for chart
  const holdingsData = topHoldings.map(holding => [
    holding.ticker,
    holding.value
  ]);
  
  // Write data
  const headers = ['Ticker', 'Value'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(startRow + 3, 1, holdingsData.length, headers.length).setValues(holdingsData);
  
  // Format data
  sheet.getRange(startRow + 3, 2, holdingsData.length, 1).setNumberFormat('"$"#,##0.00');
  
  // Create bar chart
  const dataRange = sheet.getRange(startRow + 2, 1, holdingsData.length + 1, headers.length);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(dataRange)
    .setPosition(startRow + 2, 4, 0, 0)
    .setOption('title', 'Top 10 Holdings by Value')
    .setOption('legend', {position: 'none'})
    .setOption('width', 750)
    .setOption('height', 400)
    .setOption('hAxis', {title: 'Value', format: '$#,##0.00'})
    .setOption('vAxis', {title: 'Ticker'})
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + holdingsData.length + 10;
}

function formatChartsSheet(sheet) {
  // Format headers
  const headerRanges = sheet.getRange('A1:Z1');
  headerRanges.setBackground('#f3f3f3').setFontWeight('bold');
  
  // Auto-resize columns
  for (let i = 1; i <= 5; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Make the sheet more visually appealing
  sheet.getRange('A:Z').setVerticalAlignment('middle');
}
```

## 4. Advanced Features

### 4.1 Scheduled Data Refreshes

**Description**: Enable automatic data refreshes on a schedule.

**Complexity**: C2  
**Priority**: P2  
**Dependencies**: 1.1 API Client Refactoring  

**Implementation Example**:
```javascript
function setupScheduledRefresh(frequency, dataTypes) {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'refreshScheduledData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger based on frequency
  let newTrigger;
  
  switch (frequency) {
    case 'hourly':
      newTrigger = ScriptApp.newTrigger('refreshScheduledData')
        .timeBased()
        .everyHours(1)
        .create();
      break;
    case 'daily':
      newTrigger = ScriptApp.newTrigger('refreshScheduledData')
        .timeBased()
        .everyDays(1)
        .atHour(6) // 6 AM
        .create();
      break;
    case 'weekly':
      newTrigger = ScriptApp.newTrigger('refreshScheduledData')
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(6) // 6 AM
        .create();
      break;
  }
  
  // Save configuration
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperties({
    'REFRESH_FREQUENCY': frequency,
    'REFRESH_DATA_TYPES': JSON.stringify(dataTypes)
  });
  
  return {
    success: true,
    message: `Scheduled refresh set to ${frequency}`,
    triggerId: newTrigger.getUniqueId()
  };
}

function refreshScheduledData() {
  // Get configuration
  const userProperties = PropertiesService.getUserProperties();
  const dataTypesJson = userProperties.getProperty('REFRESH_DATA_TYPES');
  const dataTypes = dataTypesJson ? JSON.parse(dataTypesJson) : ['Pies', 'Account Info', 'Cash Balance'];
  
  // Refresh each data type
  const results = {};
  dataTypes.forEach(dataType => {
    try {
      fetchSelectedTrading212Data([dataType]);
      results[dataType] = { success: true };
      
      // Update last refresh time
      userProperties.setProperty(`LAST_REFRESH_${dataType}`, new Date().toISOString());
    } catch (error) {
      results[dataType] = { success: false, error: error.message };
      Logger.log(`Error refreshing ${dataType}: ${error.message}`);
    }
  });
  
  // Log refresh attempt
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RefreshLog') || 
                SpreadsheetApp.getActiveSpreadsheet().insertSheet('RefreshLog');
  
  sheet.appendRow([
    new Date(),
    'Scheduled',
    dataTypes.join(', '),
    Object.values(results).every(r => r.success) ? 'Success' : 'Partial Failure'
  ]);
  
  return results;
}

function showScheduleRefreshModal() {
  const template = HtmlService.createTemplateFromFile('html/scheduleRefresh');
  
  // Get current settings
  const userProperties = PropertiesService.getUserProperties();
  template.currentFrequency = userProperties.getProperty('REFRESH_FREQUENCY') || 'daily';
  
  const dataTypesJson = userProperties.getProperty('REFRESH_DATA_TYPES');
  template.selectedDataTypes = dataTypesJson ? JSON.parse(dataTypesJson) : ['Pies', 'Account Info', 'Cash Balance'];
  
  template.dataOptions = [
    { id: 'Pies', name: 'Investment Pies', icon: 'pie_chart' },
    { id: 'Account Info', name: 'Account Information', icon: 'account_circle' },
    { id: 'Cash Balance', name: 'Account Cash', icon: 'attach_money' },
    { id: 'transactions', name: 'Transactions', icon: 'swap_horiz' },
    { id: 'orderHistory', name: 'Order History', icon: 'history' },
    { id: 'dividends', name: 'Dividends', icon: 'trending_up' }
  ];
  
  return template.evaluate()
    .setWidth(600)
    .setHeight(450)
    .setTitle('Schedule Data Refreshes');
}
```

### 4.2 Portfolio Report Generation

**Description**: Create customizable portfolio reports that can be exported or emailed.

**Complexity**: C3  
**Priority**: P3  
**Dependencies**: 3.1 Portfolio Overview Dashboard, 3.2 Investment Performance Analysis  

**Implementation Example**:
```javascript
function generatePortfolioReport(reportType = 'summary', options = {}) {
  // Determine report template and data based on type
  let reportTemplate;
  let reportData = {};
  
  switch (reportType) {
    case 'summary':
      reportTemplate = HtmlService.createTemplateFromFile('html/reports/summary');
      reportData = generateSummaryReportData();
      break;
    case 'detailed':
      reportTemplate = HtmlService.createTemplateFromFile('html/reports/detailed');
      reportData = generateDetailedReportData();
      break;
    case 'tax':
      reportTemplate = HtmlService.createTemplateFromFile('html/reports/tax');
      reportData = generateTaxReportData(options.year || new Date().getFullYear());
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
  
  // Add data to template
  reportTemplate.data = reportData;
  reportTemplate.options = options;
  reportTemplate.generatedDate = new Date();
  
  // Generate HTML
  const htmlOutput = reportTemplate.evaluate().getContent();
  
  // Convert to PDF if needed
  if (options.format === 'pdf') {
    const blob = Utilities.newBlob(htmlOutput, 'text/html', 'report.html');
    const pdf = blob.getAs('application/pdf');
    
    return pdf;
  }
  
  return htmlOutput;
}

function generateSummaryReportData() {
  // Get account info
  const accountRepo = new AccountRepository();
  const accountInfo = accountRepo.getLatest();
  
  // Get performance metrics
  const performanceMetrics = calculatePerformanceMetrics();
  
  // Get top holdings
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  holdings.sort((a, b) => b.value - a.value);
  const topHoldings = holdings.slice(0, 5);
  
  // Get recent transactions
  const transactionRepo = new TransactionRepository();
  const recentTransactions = transactionRepo.getRecent(5);
  
  return {
    accountInfo,
    performanceMetrics,
    topHoldings,
    recentTransactions
  };
}

function generateDetailedReportData() {
  // Get all data needed for a detailed report
  const summaryData = generateSummaryReportData();
  
  // Add additional detailed data
  const holdingsRepo = new HoldingsRepository();
  const allHoldings = holdingsRepo.getAll();
  
  const transactionRepo = new TransactionRepository();
  const allTransactions = transactionRepo.getAll();
  
  const timeframes = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'All'];
  const performanceByTimeframe = calculatePerformanceByTimeframe(timeframes);
  
  return {
    ...summaryData,
    allHoldings,
    allTransactions,
    performanceByTimeframe
  };
}

function generateTaxReportData(year) {
  // Get tax-relevant data for the specified year
  const transactionRepo = new TransactionRepository();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  
  // Get all transactions in the year
  const yearTransactions = transactionRepo.getByDateRange(yearStart, yearEnd);
  
  // Get dividends in the year
  const dividendRepo = new DividendRepository();
  const yearDividends = dividendRepo.getByDateRange(yearStart, yearEnd);
  
  // Calculate realized gains/losses
  const realizedGainsLosses = calculateRealizedGainsLosses(yearTransactions);
  
  // Calculate dividend income
  const dividendIncome = yearDividends.reduce((sum, div) => sum + div.amount, 0);
  
  return {
    year,
    yearTransactions,
    yearDividends,
    realizedGainsLosses,
    dividendIncome
  };
}

function calculateRealizedGainsLosses(transactions) {
  // This is a simplified implementation
  // A full implementation would include proper tax lot handling
  
  const buys = {};
  const realizedGains = [];
  
  // Process transactions chronologically
  transactions.sort((a, b) => a.date - b.date);
  
  transactions.forEach(tx => {
    if (tx.type === 'BUY') {
      // Record buy
      if (!buys[tx.ticker]) {
        buys[tx.ticker] = [];
      }
      
      buys[tx.ticker].push({
        date: tx.date,
        shares: tx.shares,
        pricePerShare: tx.amount / tx.shares,
        amount: tx.amount
      });
    } else if (tx.type === 'SELL') {
      // Calculate gain/loss using FIFO method
      if (buys[tx.ticker] && buys[tx.ticker].length > 0) {
        let remainingShares = tx.shares;
        let costBasis = 0;
        
        while (remainingShares > 0 && buys[tx.ticker].length > 0) {
          const oldestBuy = buys[tx.ticker][0];
          
          if (oldestBuy.shares <= remainingShares) {
            // Use all shares from this buy
            costBasis += oldestBuy.amount;
            remainingShares -= oldestBuy.shares;
            buys[tx.ticker].shift(); // Remove the buy
          } else {
            // Use partial shares from this buy
            const ratio = remainingShares / oldestBuy.shares;
            costBasis += oldestBuy.amount * ratio;
            oldestBuy.shares -= remainingShares;
            oldestBuy.amount -= oldestBuy.amount * ratio;
            remainingShares = 0;
          }
        }
        
        // Calculate gain/loss
        const gain = tx.amount - costBasis;
        
        realizedGains.push({
          date: tx.date,
          ticker: tx.ticker,
          shares: tx.shares,
          proceeds: tx.amount,
          costBasis: costBasis,
          gain: gain,
          isLongTerm: false // Would need to check holding period
        });
      }
    }
  });
  
  return realizedGains;
}

function emailPortfolioReport(email, reportType = 'summary', options = {}) {
  // Generate the report
  const report = generatePortfolioReport(reportType, { ...options, format: 'pdf' });
  
  // Send email
  GmailApp.sendEmail(
    email,
    `Trading212 Portfolio ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    `Please find your portfolio report attached. This report was generated on ${new Date().toLocaleDateString()}.`,
    {
      attachments: [report],
      name: 'Trading212 Portfolio Tracker'
    }
  );
  
  return {
    success: true,
    message: `Report sent to ${email}`
  };
}
```

### 4.4 Dividend & Income Tracker (HIGH PRIORITY)

**Description**: Create specialized tools for tracking and analyzing dividend income.

**Complexity**: C3  
**Priority**: P1  
**Dependencies**: 1.2 Data Model & Repository Implementation  

**Implementation Example**:
```javascript
function createDividendTrackerSheet() {
  // Get or create dividend tracker sheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let dividendSheet = spreadsheet.getSheetByName('Dividend Tracker');
  
  if (!dividendSheet) {
    dividendSheet = spreadsheet.insertSheet('Dividend Tracker');
  } else {
    dividendSheet.clear();
  }
  
  // Add sections
  let nextRow = 1;
  nextRow = addDividendSummarySection(dividendSheet, nextRow);
  nextRow = addMonthlyDividendSection(dividendSheet, nextRow);
  nextRow = addDividendByStockSection(dividendSheet, nextRow);
  nextRow = addDividendCalendarSection(dividendSheet, nextRow);
  nextRow = addDividendForecastSection(dividendSheet, nextRow);
  
  // Format the sheet
  formatDividendSheet(dividendSheet);
  
  // Return to dividend sheet
  spreadsheet.setActiveSheet(dividendSheet);
}

function addDividendSummarySection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('DIVIDEND SUMMARY');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Calculate dividend metrics
  const dividendMetrics = analyzeDividendIncome();
  
  // Write summary metrics
  const summaryData = [
    ['Total Dividend Income (All Time)', dividendMetrics.totalIncome],
    ['Dividend Income (YTD)', dividendMetrics.ytdIncome],
    ['Last 12 Months', dividendMetrics.lastYearIncome],
    ['Monthly Average (Last 12 Months)', dividendMetrics.monthlyAverage],
    ['Dividend Paying Stocks', dividendMetrics.payingStocksCount],
    ['Dividend Yield (Portfolio)', dividendMetrics.portfolioYield]
  ];
  
  sheet.getRange(startRow + 2, 1, summaryData.length, 2).setValues(summaryData);
  
  // Format numbers
  sheet.getRange(startRow + 2, 2, 4, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 6, 2, 1, 1).setNumberFormat('#,##0');
  sheet.getRange(startRow + 7, 2, 1, 1).setNumberFormat('0.00%');
  
  return startRow + summaryData.length + 3;
}

function addMonthlyDividendSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('MONTHLY DIVIDEND INCOME');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get monthly dividend data
  const monthlyData = getMonthlyDividendData();
  
  // Write headers
  const headers = ['Month', 'Income', 'Count', 'Average'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  
  // Write data
  sheet.getRange(startRow + 3, 1, monthlyData.length, headers.length).setValues(monthlyData);
  
  // Format numbers
  sheet.getRange(startRow + 3, 2, monthlyData.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 4, monthlyData.length, 1).setNumberFormat('"$"#,##0.00');
  
  // Create monthly income chart
  const dataRange = sheet.getRange(startRow + 2, 1, monthlyData.length + 1, 2);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataRange)
    .setPosition(startRow + 2, 6, 0, 0)
    .setOption('title', 'Monthly Dividend Income')
    .setOption('legend', {position: 'none'})
    .setOption('hAxis', {title: 'Month'})
    .setOption('vAxis', {title: 'Income', format: '$#,##0.00'})
    .setOption('width', 600)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + monthlyData.length + 10;
}

function addDividendByStockSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('DIVIDEND INCOME BY STOCK');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get data by stock
  const stockData = getDividendsByStock();
  
  // Write headers
  const headers = ['Ticker', 'Stock Name', 'Total Income', 'Payments', 'Average', 'Yield'];
  sheet.getRange(startRow + 2, 1, 1, headers.length).setValues([headers]);
  
  // Write data
  sheet.getRange(startRow + 3, 1, stockData.length, headers.length).setValues(stockData);
  
  // Format numbers
  sheet.getRange(startRow + 3, 3, stockData.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 5, stockData.length, 1).setNumberFormat('"$"#,##0.00');
  sheet.getRange(startRow + 3, 6, stockData.length, 1).setNumberFormat('0.00%');
  
  // Create top dividend payers chart
  // Sort by total income
  stockData.sort((a, b) => b[2] - a[2]);
  const topPayers = stockData.slice(0, 10);
  
  // Create data for chart
  const chartData = [];
  chartData.push(['Ticker', 'Income']);
  topPayers.forEach(row => {
    chartData.push([row[0], row[2]]);
  });
  
  // Write chart data
  sheet.getRange(startRow + stockData.length + 4, 1, chartData.length, 2).setValues(chartData);
  
  // Create chart
  const dataRange = sheet.getRange(startRow + stockData.length + 4, 1, chartData.length, 2);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dataRange)
    .setPosition(startRow + 2, 8, 0, 0)
    .setOption('title', 'Top 10 Dividend Payers')
    .setOption('pieSliceText', 'percentage')
    .setOption('width', 400)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + stockData.length + chartData.length + 6;
}

function addDividendCalendarSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('DIVIDEND CALENDAR');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Create calendar grid
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Write month headers
  sheet.getRange(startRow + 2, 2, 1, 12).setValues([months]);
  
  // Get dividend calendar data
  const calendarData = getDividendCalendarData();
  
  // Write ticker column
  const tickers = calendarData.map(row => [row.ticker]);
  sheet.getRange(startRow + 3, 1, tickers.length, 1).setValues(tickers);
  
  // For each stock and month, indicate dividend payment with X or amount
  for (let i = 0; i < calendarData.length; i++) {
    for (let j = 0; j < 12; j++) {
      if (calendarData[i].months[j]) {
        sheet.getRange(startRow + 3 + i, 2 + j).setValue('X');
      }
    }
  }
  
  // Color the cells with dividends
  const dataRange = sheet.getRange(startRow + 3, 2, tickers.length, 12);
  const rules = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('X')
    .setBackground('#D9EAD3')
    .build();
  
  const rules2 = dataRange.getConditionalFormatRules();
  rules2.push(rules);
  dataRange.setConditionalFormatRules(rules2);
  
  return startRow + tickers.length + 6;
}

function addDividendForecastSection(sheet, startRow) {
  // Create header
  sheet.getRange(startRow, 1).setValue('DIVIDEND FORECAST (NEXT 12 MONTHS)');
  sheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(14);
  
  // Get forecast data
  const forecastData = getDividendForecast();
  
  // Write forecast data
  const forecastRows = [];
  forecastRows.push(['Month', 'Projected Income', 'Confirmed Income', 'Total Expected']);
  
  forecastData.forEach(month => {
    forecastRows.push([
      month.monthName,
      month.projectedIncome,
      month.confirmedIncome,
      month.totalExpected
    ]);
  });
  
  sheet.getRange(startRow + 2, 1, forecastRows.length, 4).setValues(forecastRows);
  
  // Format numbers
  sheet.getRange(startRow + 3, 2, forecastRows.length - 1, 3).setNumberFormat('"$"#,##0.00');
  
  // Create forecast chart
  const dataRange = sheet.getRange(startRow + 2, 1, forecastRows.length, 4);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataRange)
    .setPosition(startRow + 2, 6, 0, 0)
    .setOption('title', 'Dividend Forecast (Next 12 Months)')
    .setOption('isStacked', true)
    .setOption('hAxis', {title: 'Month'})
    .setOption('vAxis', {title: 'Income', format: '$#,##0.00'})
    .setOption('width', 600)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
  
  return startRow + forecastRows.length + 10;
}

function analyzeDividendIncome() {
  // Get dividend history
  const dividendRepo = new DividendRepository();
  const dividends = dividendRepo.getAll();
  
  // Get current date for calculations
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  
  // Calculate metrics
  const totalIncome = dividends.reduce((sum, div) => sum + div.amount, 0);
  
  // YTD income
  const ytdIncome = dividends
    .filter(div => div.paymentDate >= ytdStart)
    .reduce((sum, div) => sum + div.amount, 0);
  
  // Last 12 months income
  const lastYearIncome = dividends
    .filter(div => div.paymentDate >= lastYearStart)
    .reduce((sum, div) => sum + div.amount, 0);
  
  // Monthly average
  const monthlyAverage = lastYearIncome / 12;
  
  // Count dividend paying stocks
  const payingStocks = new Set();
  dividends.forEach(div => payingStocks.add(div.ticker));
  
  // Calculate portfolio dividend yield
  // This requires portfolio value, which might need to be fetched separately
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  const portfolioValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const portfolioYield = portfolioValue > 0 ? lastYearIncome / portfolioValue : 0;
  
  return {
    totalIncome,
    ytdIncome,
    lastYearIncome,
    monthlyAverage,
    payingStocksCount: payingStocks.size,
    portfolioYield
  };
}

function getMonthlyDividendData() {
  // Get dividend history
  const dividendRepo = new DividendRepository();
  const dividends = dividendRepo.getAll();
  
  // Group by month
  const monthlyData = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  dividends.forEach(div => {
    const month = div.paymentDate.getMonth();
    const monthName = monthNames[month];
    
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = {
        income: 0,
        count: 0
      };
    }
    
    monthlyData[monthName].income += div.amount;
    monthlyData[monthName].count++;
  });
  
  // Convert to rows
  const rows = monthNames.map(month => {
    const data = monthlyData[month] || { income: 0, count: 0 };
    const average = data.count > 0 ? data.income / data.count : 0;
    
    return [
      month,
      data.income,
      data.count,
      average
    ];
  });
  
  return rows;
}

function getDividendsByStock() {
  // Get dividend history
  const dividendRepo = new DividendRepository();
  const dividends = dividendRepo.getAll();
  
  // Get holdings for yield calculation
  const holdingsRepo = new HoldingsRepository();
  const holdings = holdingsRepo.getAll();
  const holdingsByTicker = {};
  
  holdings.forEach(holding => {
    holdingsByTicker[holding.ticker] = holding;
  });
  
  // Group by ticker
  const stockData = {};
  
  dividends.forEach(div => {
    if (!stockData[div.ticker]) {
      stockData[div.ticker] = {
        name: div.name || div.ticker,
        totalIncome: 0,
        payments: 0,
        lastPayment: null
      };
    }
    
    stockData[div.ticker].totalIncome += div.amount;
    stockData[div.ticker].payments++;
    
    if (!stockData[div.ticker].lastPayment || div.paymentDate > stockData[div.ticker].lastPayment) {
      stockData[div.ticker].lastPayment = div.paymentDate;
    }
  });
  
  // Convert to rows
  const rows = Object.entries(stockData).map(([ticker, data]) => {
    const average = data.payments > 0 ? data.totalIncome / data.payments : 0;
    
    // Calculate yield if we have holding data
    let yield = 0;
    if (holdingsByTicker[ticker] && holdingsByTicker[ticker].value > 0) {
      // Get payments in last 12 months
      const now = new Date();
      const lastYear = new Date(now);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      
      const recentDividends = dividends.filter(div => 
        div.ticker === ticker && div.paymentDate >= lastYear
      );
      
      const annualIncome = recentDividends.reduce((sum, div) => sum + div.amount, 0);
      yield = annualIncome / holdingsByTicker[ticker].value;
    }
    
    return [
      ticker,
      data.name,
      data.totalIncome,
      data.payments,
      average,
      yield
    ];
  });
  
  return rows;
}

function getDividendCalendarData() {
  // Get dividend history
  const dividendRepo = new DividendRepository();
  const dividends = dividendRepo.getAll();
  
  // Group by ticker and month
  const calendarData = {};
  
  dividends.forEach(div => {
    const month = div.paymentDate.getMonth();
    
    if (!calendarData[div.ticker]) {
      calendarData[div.ticker] = {
        ticker: div.ticker,
        months: Array(12).fill(false)
      };
    }
    
    calendarData[div.ticker].months[month] = true;
  });
  
  // Convert to array
  return Object.values(calendarData);
}

function getDividendForecast() {
  // Get dividend history
  const dividendRepo = new DividendRepository();
  const dividends = dividendRepo.getAll();
  
  // Get current date
  const now = new Date();
  const currentMonth = now.getMonth();
  
  // Get announced future dividends (if any)
  // In a real implementation, this would come from a separate data source
  const announcedDividends = []; // Placeholder for announced dividends
  
  // Create forecast for next 12 months
  const forecast = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    const monthName = monthNames[monthIndex];
    const year = now.getFullYear() + Math.floor((currentMonth + i) / 12);
    
    // Find historical dividends for this month
    const historicalDividends = dividends.filter(div => 
      div.paymentDate.getMonth() === monthIndex
    );
    
    // Calculate projected income based on past payments
    const uniqueTickers = new Set();
    historicalDividends.forEach(div => uniqueTickers.add(div.ticker));
    
    let projectedIncome = 0;
    uniqueTickers.forEach(ticker => {
      // Find the most recent payment for this ticker in this month
      const tickerDividends = historicalDividends
        .filter(div => div.ticker === ticker)
        .sort((a, b) => b.paymentDate - a.paymentDate);
      
      if (tickerDividends.length > 0) {
        projectedIncome += tickerDividends[0].amount;
      }
    });
    
    // Find announced dividends for this month
    const confirmedDividends = announcedDividends.filter(div => 
      div.paymentDate.getMonth() === monthIndex && 
      div.paymentDate.getFullYear() === year
    );
    
    const confirmedIncome = confirmedDividends.reduce((sum, div) => sum + div.amount, 0);
    
    forecast.push({
      monthName,
      monthIndex,
      year,
      projectedIncome,
      confirmedIncome,
      totalExpected: projectedIncome + confirmedIncome
    });
  }
  
  return forecast;
}

function formatDividendSheet(sheet) {
  // Format headers
  const headerRanges = sheet.getRange('A1:Z1');
  headerRanges.setBackground('#f3f3f3').setFontWeight('bold');
  
  // Auto-resize columns
  for (let i = 1; i <= 15; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Add borders and formatting to section headers
  const sections = [
    'DIVIDEND SUMMARY',
    'MONTHLY DIVIDEND INCOME',
    'DIVIDEND INCOME BY STOCK',
    'DIVIDEND CALENDAR',
    'DIVIDEND FORECAST (NEXT 12 MONTHS)'
  ];
  
  // Find and format each section header
  const allValues = sheet.getDataRange().getValues();
  for (let i = 0; i < allValues.length; i++) {
    if (sections.includes(allValues[i][0])) {
      sheet.getRange(i + 1, 1).setBackground('#e6f2ff').setFontWeight('bold');
    }
  }
}
```

### 4.5 Integration with External Data Sources (LOW PRIORITY)

**Description**: Add integration with external data sources for enhanced analysis.

**Complexity**: C4  
**Priority**: P4  
**Dependencies**: 1.1 API Client Refactoring  

**Implementation Example**:
```javascript
class ExternalDataProvider {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  async getStockData(ticker, range = '1m') {
    const cacheKey = `yahoo_${ticker}_${range}`;
    const cachedData = this.cache.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // Fetch data from Yahoo Finance API (example URL, would need proper implementation)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`;
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    // Process the response
    const result = this.processYahooResponse(data);
    
    // Cache the result (1 hour)
    this.cache.put(cacheKey, JSON.stringify(result), 3600);
    
    return result;
  }
  
  processYahooResponse(data) {
    const result = {
      ticker: data.chart.result[0].meta.symbol,
      currency: data.chart.result[0].meta.currency,
      prices: []
    };
    
    const timestamps = data.chart.result[0].timestamp;
    const quotes = data.chart.result[0].indicators.quote[0];
    
    for (let i = 0; i < timestamps.length; i++) {
      result.prices.push({
        date: new Date(timestamps[i] * 1000),
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i]
      });
    }
    
    return result;
  }
  
  async getSectorData(tickers) {
    // This would be implemented to get sector data for a list of tickers
    // For the purpose of this example, we'll simulate the data
    
    const sectorMap = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Cyclical',
      'FB': 'Technology',
      'BRK.B': 'Financial Services',
      'JNJ': 'Healthcare',
      'JPM': 'Financial Services',
      'V': 'Financial Services',
      'PG': 'Consumer Defensive'
      // In a real implementation, this would come from an API
    };
    
    const results = {};
    tickers.forEach(ticker => {
      results[ticker] = sectorMap[ticker] || 'Other';
    });
    
    return results;
  }
  
  async getMarketIndices() {
    const cacheKey = 'market_indices';
    const cachedData = this.cache.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // This would be implemented to get market index data
    // For the purpose of this example, we'll simulate the data
    const indices = [
      { symbol: '^GSPC', name: 'S&P 500', value: 4500.53, change: 0.75, percentChange: 0.0167 },
      { symbol: '^DJI', name: 'Dow Jones', value: 35000.23, change: 125.45, percentChange: 0.0036 },
      { symbol: '^IXIC', name: 'NASDAQ', value: 15000.75, change: -12.34, percentChange: -0.0008 }
      // In a real implementation, this would come from an API
    ];
    
    // Cache for 15 minutes
    this.cache.put(cacheKey, JSON.stringify(indices), 900);
    
    return indices;
  }
}
```

## 5. User Interface Enhancements

### 5.1 Theme Customization

**Description**: Add options for customizing the application theme.

**Complexity**: C2  
**Priority**: P3  
**Dependencies**: None  

**Implementation Example**:
```javascript
function applyTheme(theme = 'light') {
  const themes = {
    light: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
      primaryColor: '#26a69a',
      secondaryColor: '#f3f3f3',
      accentColor: '#ee6e73'
    },
    dark: {
      backgroundColor: '#263238',
      textColor: '#eceff1',
      primaryColor: '#00897b',
      secondaryColor: '#37474f',
      accentColor: '#f06292'
    },
    highContrast: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      primaryColor: '#ffeb3b',
      secondaryColor: '#212121',
      accentColor: '#ff5722'
    }
  };
  
  // Get theme settings
  const themeSettings = themes[theme] || themes.light;
  
  // Generate CSS
  const css = `
    :root {
      --background-color: ${themeSettings.backgroundColor};
      --text-color: ${themeSettings.textColor};
      --primary-color: ${themeSettings.primaryColor};
      --secondary-color: ${themeSettings.secondaryColor};
      --accent-color: ${themeSettings.accentColor};
    }
    
    body {
      background-color: var(--background-color);
      color: var(--text-color);
    }
    
    .btn, .btn-large, .btn-small {
      background-color: var(--primary-color);
    }
    
    /* More style rules... */
  `;
  
  return css;
}

function showThemeSettingsModal() {
  const template = HtmlService.createTemplateFromFile('html/themeSettings');
  
  // Get current theme setting
  const userProperties = PropertiesService.getUserProperties();
  const currentTheme = userProperties.getProperty('THEME') || 'light';
  
  template.currentTheme = currentTheme;
  template.themes = [
    { id: 'light', name: 'Light Theme', description: 'Default light theme with green accents' },
    { id: 'dark', name: 'Dark Theme', description: 'Dark theme with teal accents, easier on the eyes' },
    { id: 'highContrast', name: 'High Contrast', description: 'High contrast theme for better accessibility' }
  ];
  
  return template.evaluate()
    .setWidth(500)
    .setHeight(400)
    .setTitle('Theme Settings');
}

function saveThemeSetting(theme) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('THEME', theme);
  
  return {
    success: true,
    message: `Theme set to ${theme}`
  };
}
```

### 5.2 Mobile-Friendly UI Improvements

**Description**: Enhance the UI to be more usable on mobile devices, within the limitations of Google Sheets.

**Complexity**: C2  
**Priority**: P3  
**Dependencies**: None  

**Implementation Example**:
```javascript
function createMobileFriendlyCSS() {
  // This CSS will be included in all HTML templates
  const css = `
    /* Base styles */
    .setup-container {
      padding: 20px;
    }
    
    .button-container {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .setup-container {
        padding: 10px;
      }
      
      .button-container {
        flex-direction: column-reverse;
        gap: 10px;
      }
      
      .button-container button {
        width: 100%;
        margin: 5px 0;
      }
      
      .step-indicator {
        margin-bottom: 15px;
      }
      
      /* Make form elements larger for touch */
      input[type="text"],
      input[type="password"],
      select {
        height: 48px;
        font-size: 16px; /* Prevents iOS zoom on focus */
      }
      
      /* Larger checkboxes for touch */
      [type="checkbox"] + span:not(.lever) {
        padding-left: 30px;
        line-height: 25px;
      }
      
      /* Simplify cards for mobile */
      .card {
        margin: 0.5rem 0 1rem 0;
      }
      
      /* Stack columns */
      .row .col {
        padding: 0 0.5rem;
      }
      
      /* Improve readability */
      p, li {
        font-size: 16px;
        line-height: 1.6;
      }
    }
  `;
  
  return css;
}

function enhanceMobileUsability() {
  // This function would be called during initialization to apply mobile-friendly enhancements
  
  // 1. Add viewport meta tag to all HTML templates
  const htmlFiles = [
    'setup',
    'fetchData',
    'scheduleRefresh',
    'themeSettings'
  ];
  
  htmlFiles.forEach(file => {
    const html = HtmlService.createHtmlOutputFromFile(`html/${file}`).getContent();
    
    // Ensure viewport meta tag is present
    if (!html.includes('viewport')) {
      const updatedHtml = html.replace('<head>', 
        '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
      
      // Save the updated HTML file
      // Note: In actual Apps Script this would require a different approach
      // as we can't directly write to files
    }
  });
  
  // 2. Update CSS for all templates to include mobile-friendly styles
  // In a real implementation, this would be done by including the mobile CSS file
  
  // 3. Use simpler UI components that work better on mobile
  // For example, using checkboxes instead of buttons for multiple selection
  
  return {
    success: true,
    message: 'Mobile usability enhancements applied'
  };
}

// Example of mobile-friendly HTML structure
// This would be used in all HTML templates
```

### 5.3 Context-Sensitive Help

**Description**: Add in-app help and guidance for users.

**Complexity**: C2  
**Priority**: P3  
**Dependencies**: None  

**Implementation Example**:
```javascript
function createHelpSystem() {
  // Create a help system object that can be used across the application
  const helpSystem = {
    tooltips: {
      'apiKey': 'Your Trading212 API key can be found in your account settings under the API section.',
      'environment': 'Choose "Demo" to test with sample data or "Live" to connect to your real account.',
      'refresh': 'Refresh data from Trading212 to keep your spreadsheet up to date.',
      'dividends': 'View and analyze dividend payments from your investments.',
      'portfolio': 'See an overview of your current portfolio holdings and performance.',
      // More tooltips...
    },
    
    tutorials: {
      'setup': [
        { title: 'Step 1: Choose Environment', content: 'First, select whether you want to use the demo or live environment...' },
        { title: 'Step 2: Enter API Key', content: 'Next, enter your Trading212 API key...' },
        { title: 'Step 3: Test Connection', content: 'Click "Test Connection" to verify your API key works...' },
        { title: 'Step 4: Complete Setup', content: 'Click "Finish" to complete the setup and start using the tracker...' }
      ],
      'refreshData': [
        { title: 'Step 1: Select Data Types', content: 'Choose which types of data you want to refresh...' },
        { title: 'Step 2: Click Refresh', content: 'Click the "Refresh Selected Data" button to start the process...' },
        { title: 'Step 3: Wait for Completion', content: 'The tracker will fetch the latest data from Trading212...' }
      ],
      // More tutorials...
    },
    
    faqs: [
      {
        question: 'How do I get a Trading212 API key?',
        answer: 'To get your API key, log in to your Trading212 account, go to Settings > API, and generate a new key.'
      },
      {
        question: 'How often should I refresh my data?',
        answer: 'For most users, refreshing once per day is sufficient. If you trade frequently, you might want to refresh more often.'
      },
      {
        question: 'What is the difference between Demo and Live environments?',
        answer: 'The Demo environment uses sample data for testing, while the Live environment connects to your actual Trading212 account.'
      },
      // More FAQs...
    ],
    
    showTooltip: function(elementId, element) {
      const tooltipContent = this.tooltips[elementId];
      if (!tooltipContent) return;
      
      // In a real implementation, this would create and show a tooltip
      console.log(`Showing tooltip for ${elementId}: ${tooltipContent}`);
      
      // Example implementation using Materialize tooltips
      // $(element).tooltip({html: tooltipContent});
    },
    
    startTutorial: function(tutorialId) {
      const tutorialSteps = this.tutorials[tutorialId];
      if (!tutorialSteps) return;
      
      // In a real implementation, this would start a step-by-step tutorial
      console.log(`Starting tutorial: ${tutorialId} with ${tutorialSteps.length} steps`);
      
      // Example implementation using a custom tutorial UI
      // showTutorialDialog(tutorialSteps);
    },
    
    showFAQ: function() {
      // In a real implementation, this would show the FAQ dialog
      // showFAQDialog(this.faqs);
    }
  };
  
  return helpSystem;
}

function showHelpModal() {
  const template = HtmlService.createTemplateFromFile('html/help');
  
  // Get help content
  const helpSystem = createHelpSystem();
  template.faqs = helpSystem.faqs;
  template.tutorials = Object.keys(helpSystem.tutorials).map(id => ({
    id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1) + ' Tutorial',
    steps: helpSystem.tutorials[id].length
  }));
  
  return template.evaluate()
    .setWidth(600)
    .setHeight(500)
    .setTitle('Help & Tutorials');
}
```

## Implementation Timeline and Priorities

Based on the complexity and priority assessments, here's a suggested implementation timeline:

### Phase 1: Core Features (1-2 weeks)
- 1.1 API Client Refactoring (C3/P1)
- 3.1 Portfolio Overview Dashboard (C3/P1)
- 4.4 Dividend & Income Tracker (C3/P1)

### Phase 2: Performance Analysis (2-3 weeks)
- 1.2 Data Model & Repository Implementation (C3/P2)
- 3.2 Investment Performance Analysis (C3/P1)
- 1.3 Enhanced Error Handling & Logging (C2/P2)

### Phase 3: User Experience (2-3 weeks)
- 2.1 Streamlined Setup Wizard (C2/P2)
- 2.3 Improved Data Fetch Modal (C2/P2)
- 4.1 Scheduled Data Refreshes (C2/P2)

### Phase 4: Additional Features (3-4 weeks)
- 2.2 Data Refresh Dashboard (C2/P3)
- 3.4 Interactive Charts & Visualizations (C3/P3)
- 4.2 Portfolio Report Generation (C3/P3)
- 5.1 Theme Customization (C2/P3)
- 5.2 Mobile-Friendly UI Improvements (C2/P3)
- 5.3 Context-Sensitive Help (C2/P3)

### Phase 5: Lower Priority Features (as time permits)
- 3.3 Portfolio Allocation Analysis (C3/P4)
- 4.5 Integration with External Data Sources (C4/P4)

## Conclusion

This enhancement plan provides a comprehensive roadmap for transforming the Trading212 Portfolio Tracker into a powerful and user-friendly tool. The prioritization focuses on the core user experience improvements, particularly around portfolio visualization, performance analysis, and dividend tracking.

Each enhancement includes a complexity and priority assessment, along with detailed implementation examples. The modular approach allows for independent implementation of features, with dependencies clearly noted.

By following this plan, we'll create a tool that provides users with deeper insights into their investments, better visualization of performance metrics including the Weighted Total Return (WTR) chart, and comprehensive dividend tracking capabilities.

The timeline and phasing ensure that the highest-value features are implemented first, with a focus on delivering tangible benefits to users at each stage of the project.
