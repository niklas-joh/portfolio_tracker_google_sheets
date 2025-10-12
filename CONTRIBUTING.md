# Contributing to Trading212 Portfolio Tracker

Thank you for your interest in contributing to the Trading212 Portfolio Tracker! This document provides guidelines and information for developers who want to contribute to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- [clasp](https://github.com/google/clasp) CLI tool (`npm install -g @google/clasp`)
- A Google account
- A Trading212 account (demo account is sufficient for testing)
- Basic knowledge of:
  - JavaScript
  - Google Apps Script
  - REST APIs
  - Google Sheets

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/portfolio_tracker_google_sheets.git
   cd portfolio_tracker_google_sheets
   ```

## 🛠️ Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs the `@types/google-apps-script` package for TypeScript definitions and autocomplete.

### 2. Configure clasp

```bash
# Login to your Google account
clasp login

# Create a new Apps Script project or link to an existing one
clasp create --type sheets --title "Trading212 Portfolio Tracker Dev"

# Or clone an existing project
clasp clone YOUR_SCRIPT_ID
```

### 3. Configure Your Environment

The `.clasp.json` file contains your script ID:
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "/path/to/project"
}
```

The `.claspignore` file defines which files are pushed to Apps Script:
```
**/**
!appsscript.json
!**/*.gs
!**/*.js
!**/*.ts
!**/*.html
legacy/**
testing/**
node_modules/**
```

### 4. Push Code to Apps Script

```bash
# Push all files to your Apps Script project
clasp push

# Watch for changes and auto-push
clasp push --watch
```

### 5. Open in Browser

```bash
clasp open
```

## 🏗️ Project Architecture

### Overview

This project follows a modular architecture with clear separation of concerns:

```
portfolio_tracker_google_sheets/
├── api/              # API integration layer
├── data/             # Data processing and sheet management
├── html/             # HTML templates for modals
├── css/              # Styling for HTML templates
├── js/               # Client-side JavaScript
├── main/             # Core functionality and entry points
├── ui/               # User interface components
├── tasks/            # Development task tracking
└── testing/          # Test files (not deployed)
```

### Key Components

#### 1. API Layer (`api/`)

**Purpose**: Handle all communication with the Trading212 API

- `constants.js` - API endpoints, rate limits, and configuration
- `apiUtilities.js` - Core API request functions
- `fetchFunctions.js` - High-level data fetching functions
- `rateLimiter.js` - Rate limiting implementation

**Key Classes**:
- `RateLimiter` - Manages API rate limits per endpoint

#### 2. Data Layer (`data/`)

**Purpose**: Process API responses and manage Google Sheets

- `dataProcessing.js` - Transform API data for sheet display
- `sheetManager.js` - Create and manage sheets
- `sheetFormattingManager.js` - Advanced formatting system

**Key Classes**:
- `SheetManager` - Sheet creation and initialization

**Key Functions**:
- `extractHeaders()` - Extract column headers from JSON
- `writeDataToSheet()` - Write data with proper formatting
- `resolveNestedField()` - Handle nested JSON objects

#### 3. UI Layer (`ui/`)

**Purpose**: User interface components and interactions

- `menuBuilder.js` - Create the add-on menu
- `setupHandler.js` - Setup wizard functionality
- `modalManager.js` - Modal dialog management

#### 4. Main Layer (`main/`)

**Purpose**: Core application logic and utilities

- `progressManager.js` - Progress tracking during operations
- `uiFunctions.js` - User interface helper functions
- `errorHandling.js` - Error handling and logging
- `caching.js` - Cache management

**Key Classes**:
- `ProgressManager` - Manage operation progress

#### 5. HTML Templates (`html/`, `css/`, `js/`)

**Purpose**: User interface templates

- `setup.html` - Setup wizard
- `fetchData.html` - Data fetching modal
- `prevNextButtons.html` - Reusable navigation buttons
- `styles.html` - CSS styles
- `scripts.html` - Client-side JavaScript

## 📁 Code Structure

### API Resources Configuration

The `API_RESOURCES` constant in `api/constants.js` is the central configuration for all data types:

```javascript
const API_RESOURCES = {
  PIES: {
    endpoint: 'equity/pies',
    sheetName: '🥧Pies',
    rateLimit: { limit: 1, windowMs: 30 * SECOND }
  },
  // ... more resources
};
```

**Adding a New Data Type**:
1. Add entry to `API_RESOURCES`
2. Create fetch function in `fetchFunctions.js`
3. Add menu item in `menuBuilder.js`
4. Update formatting configuration if needed

### Rate Limiting System

The rate limiter uses a sliding window algorithm:

```javascript
class RateLimiter {
  canProceed(endpoint) {
    // Check if request can proceed
    // Returns { proceed: true } or { proceed: false, waitTime: ms }
  }
}
```

**How it works**:
1. Each endpoint has defined rate limits
2. Request timestamps are stored per endpoint
3. Before each request, old timestamps are filtered out
4. If limit is reached, calculates wait time
5. Automatically sleeps if needed

### Progress Tracking

Progress updates are shown to users during long operations:

```javascript
updateProgress('Fetching data...'); // Update progress message
getProgress(); // Retrieve current progress
clearProgress(); // Clear progress message
```

Progress is stored in `CacheService` with automatic expiration.

### Formatting System

The formatting system consists of two configuration sheets:

1. **FormatConfigurations** - Define format patterns
   - Currency formats (USD, EUR, GBP)
   - Date formats (DD/MM/YYYY, etc.)
   - Number formats (decimals, percentages)

2. **ColumnFormatMapping** - Map columns to formats
   - Auto-detects column types
   - Preserves user preferences
   - Applies formats automatically

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write clean, documented code
- Follow existing patterns and conventions
- Test thoroughly with both demo and live accounts

### 3. Test Locally

```bash
# Push to your Apps Script project
clasp push

# Open and test in Google Sheets
clasp open
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

Use conventional commit messages:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, test the following:

#### Setup & Configuration
- [ ] Fresh installation works
- [ ] Setup wizard completes successfully
- [ ] API key validation works (valid and invalid keys)
- [ ] Demo environment connection works
- [ ] Live environment connection works

#### Data Fetching
- [ ] Each data type fetches correctly
- [ ] Pagination works for large datasets
- [ ] Progress tracking displays correctly
- [ ] Rate limiting prevents errors
- [ ] Error messages are clear

#### Formatting
- [ ] Format system initializes correctly
- [ ] Column mapping works
- [ ] Format changes apply automatically
- [ ] Custom formats persist

#### Edge Cases
- [ ] Empty responses handled gracefully
- [ ] Network errors handled properly
- [ ] Rate limits respected
- [ ] Large datasets don't timeout

### Testing Files

Test files are located in `testing/` and are excluded from deployment:
- `testing.js` - Various test functions
- `testHeaderMapping.js` - Header mapping tests

To run tests:
1. Temporarily remove `testing/**` from `.claspignore`
2. Push test files to your dev project
3. Run test functions from Apps Script editor
4. Review logs for results

## 📝 Coding Standards

### General Principles

1. **Clarity over cleverness** - Write code that's easy to understand
2. **DRY (Don't Repeat Yourself)** - Extract common patterns
3. **Single Responsibility** - Each function does one thing well
4. **Documentation** - Document complex logic and APIs

### JavaScript Style

```javascript
// Use descriptive variable names
const apiEndpoint = 'equity/pies'; // Good
const ep = 'equity/pies'; // Bad

// Use const for immutable values, let for mutable
const MAX_RETRIES = 3;
let currentAttempt = 0;

// Use arrow functions for callbacks
array.map(item => item.value);

// Use template literals for strings
const message = `Fetching ${count} items`;

// Document functions with JSDoc
/**
 * Fetches data from the Trading212 API
 * @param {string} endpoint - The API endpoint
 * @param {Object} params - Query parameters
 * @returns {Object} The API response
 */
function fetchData(endpoint, params) {
  // Implementation
}
```

### Error Handling

```javascript
try {
  // Attempt operation
  const result = riskyOperation();
  return result;
} catch (error) {
  // Log error for debugging
  Logger.log(`Error in functionName: ${error.message}`);
  
  // Show user-friendly message
  SpreadsheetApp.getUi().alert('An error occurred. Please try again.');
  
  // Re-throw if necessary
  throw error;
}
```

### API Request Pattern

```javascript
function fetchSomeData(params = {}) {
  // Define parameters with defaults
  const queryParams = {
    limit: params.limit || 50,
    cursor: params.cursor || '0'
  };
  
  // Use the generic fetch function
  fetchDataAndWriteToSheet(
    API_RESOURCES.SOME_DATA.endpoint,
    API_RESOURCES.SOME_DATA.sheetName,
    queryParams
  );
}
```

### Adding New API Endpoints

1. **Add to constants**:
```javascript
// In api/constants.js
SOME_DATA: {
  endpoint: 'api/endpoint/path',
  sheetName: 'SheetName',
  rateLimit: { limit: 6, windowMs: 1 * MINUTE }
}
```

2. **Create fetch function**:
```javascript
// In api/fetchFunctions.js
function fetchSomeData(params = {}) {
  const queryParams = {
    // Define parameters
  };
  
  fetchDataAndWriteToSheet(
    API_RESOURCES.SOME_DATA.endpoint,
    API_RESOURCES.SOME_DATA.sheetName,
    queryParams
  );
}
```

3. **Add to menu**:
```javascript
// In ui/menuBuilder.js
.addItem('Fetch Some Data', 'fetchSomeData')
```

## 📤 Submitting Changes

### Pull Request Process

1. **Update Documentation**
   - Update README.md if user-facing changes
   - Update CONTRIBUTING.md if developer changes
   - Add inline comments for complex logic

2. **Create Detailed PR Description**
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?
   - Are there any breaking changes?
   - Screenshots (if UI changes)

3. **Link Related Issues**
   - Reference issue numbers (e.g., "Fixes #123")

4. **Request Review**
   - Wait for maintainer feedback
   - Address review comments
   - Be open to suggestions

### PR Title Format

Use clear, descriptive titles:
- `feat: add support for exchange list fetching`
- `fix: resolve rate limiting issue with transactions`
- `docs: improve setup instructions in README`
- `refactor: simplify sheet formatting logic`

## 🐛 Bug Reports

When reporting bugs, include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Exact steps to reproduce the bug
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - Google Sheets, Apps Script version, etc.
6. **Logs** - Relevant error messages or logs
7. **Screenshots** - If applicable

## 💡 Feature Requests

When requesting features, include:

1. **Use Case** - Why is this feature needed?
2. **Proposed Solution** - How should it work?
3. **Alternatives** - Other solutions considered?
4. **Additional Context** - Mockups, examples, etc.

## 🔍 Code Review Guidelines

When reviewing code:

1. **Functionality** - Does it work as intended?
2. **Code Quality** - Is it readable and maintainable?
3. **Performance** - Are there any efficiency concerns?
4. **Security** - Are API keys and data handled securely?
5. **Documentation** - Is it adequately documented?
6. **Testing** - Has it been properly tested?

## 📚 Additional Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Trading212 API Documentation](https://t212public-api-docs.redoc.ly/)
- [clasp Documentation](https://github.com/google/clasp)
- [Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices)

## 📧 Questions?

If you have questions:
- Check existing [issues](https://github.com/niklas-joh/portfolio_tracker_google_sheets/issues)
- Create a new issue with the `question` label
- Review the code documentation

## 🙏 Thank You!

Your contributions make this project better for everyone in the Trading212 community. Thank you for taking the time to contribute!

---

**Happy Coding! 🚀**
