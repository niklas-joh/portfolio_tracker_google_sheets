/**
 * ===================== Configuration Manager ========================
 * 
 * A class for managing application-wide configuration stored in a dedicated
 * configuration sheet. This class handles reading, writing, and validation
 * of configuration values, with support for different configuration types.
 * 
 * Features:
 * - Centralized configuration management
 * - Support for different configuration categories
 * - Validation of configuration values
 * - Default configuration handling
 * - Caching for performance optimization
 */
class ConfigManager {
    /**
     * Creates a new ConfigManager instance.
     * @param {string} configSheetName - The name of the configuration sheet.
     */
    constructor(configSheetName = 'Configuration') {
      this.configSheetName = configSheetName;
      this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      this.configSheet = this.getOrCreateConfigSheet();
      this.cache = {}; // In-memory cache of configuration values
      this.isInitialized = false;
    }
  
    /**
     * Ensures the configuration sheet exists, creating it if necessary.
     * @returns {GoogleAppsScript.Spreadsheet.Sheet} The configuration sheet.
     */
    getOrCreateConfigSheet() {
      let sheet = this.spreadsheet.getSheetByName(this.configSheetName);
      
      if (!sheet) {
        sheet = this.spreadsheet.insertSheet(this.configSheetName);
        this.initializeConfigSheet(sheet);
        Logger.log(`Created new configuration sheet: ${this.configSheetName}`);
      }
      
      return sheet;
    }
  
    /**
     * Sets up the initial structure of the configuration sheet.
     * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to initialize.
     */
    initializeConfigSheet(sheet) {
      // Create tab sections for different configuration categories
      const headers = ['Category', 'Key', 'Value', 'Type', 'Description', 'Last Updated', 'Modified By'];
      
      // Set headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      
      // Add filters
      sheet.getRange(1, 1, 1, headers.length).createFilter();
      
      // Adjust column widths
      sheet.setColumnWidth(1, 120); // Category
      sheet.setColumnWidth(2, 150); // Key
      sheet.setColumnWidth(3, 180); // Value
      sheet.setColumnWidth(4, 80);  // Type
      sheet.setColumnWidth(5, 250); // Description
      sheet.setColumnWidth(6, 150); // Last Updated
      sheet.setColumnWidth(7, 120); // Modified By
      
      // Add data validation for the Type column
      const typeRange = sheet.getRange(2, 4, 100, 1);
      const typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['string', 'number', 'boolean', 'json', 'date', 'array'], true)
        .build();
      typeRange.setDataValidation(typeRule);
      
      // Add initial configuration categories with examples
      this.addInitialConfigurations(sheet);
    }
  
    /**
     * Adds initial configuration entries to the sheet.
     * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The configuration sheet.
     */
    addInitialConfigurations(sheet) {
      const now = new Date().toISOString();
      const user = Session.getActiveUser().getEmail();
      
      // Define initial configurations
      const initialConfigs = [
        // Sheet Management configs
        ['SheetManagement', 'LAST_FULL_UPDATE', now, 'date', 'Timestamp of the last full data update'],
        ['SheetManagement', 'AUTO_REFRESH_ENABLED', 'FALSE', 'boolean', 'Whether automatic refresh is enabled'],
        ['SheetManagement', 'REFRESH_INTERVAL_MINUTES', '60', 'number', 'Interval in minutes for auto-refresh'],
        
        // API configs
        ['API', 'ENVIRONMENT', 'demo', 'string', 'API environment (demo/live)'],
        ['API', 'API_KEY', '', 'string', 'API key for authentication (encrypted)'],
        ['API', 'RATE_LIMIT_STRATEGY', 'conservative', 'string', 'How to handle rate limits (aggressive/conservative)'],
        
        // UI configs
        ['UI', 'DEFAULT_DATE_FORMAT', 'yyyy-MM-dd', 'string', 'Default date format for display'],
        ['UI', 'DEFAULT_NUMBER_FORMAT', '#,##0.00', 'string', 'Default number format for display'],
        ['UI', 'THEME', 'default', 'string', 'UI theme (default/dark/light)'],
        
        // Sheet Mappings
        ['SheetMappings', 'TRANSACTIONS_SHEET', 'Transactions', 'string', 'Sheet name for transaction data'],
        ['SheetMappings', 'ACCOUNT_INFO_SHEET', 'AccountInfo', 'string', 'Sheet name for account information'],
        
        // Column Mappings (stored as JSON)
        ['ColumnMappings', 'TRANSACTIONS_COLUMNS', '{"date":"Date","amount":"Amount","description":"Description"}', 'json', 'Column mappings for transactions sheet'],
        
        // Column Formatting
        ['ColumnFormatting', 'DATE_COLUMNS', '["Date","CreatedAt","UpdatedAt"]', 'array', 'Columns that should be formatted as dates'],
        ['ColumnFormatting', 'CURRENCY_COLUMNS', '["Amount","Balance","Value"]', 'array', 'Columns that should be formatted as currency']
      ];
      
      // Add the last two columns (Last Updated and Modified By) to each row
      const configsWithMetadata = initialConfigs.map(row => [...row, now, user]);
      
      // Write to sheet
      sheet.getRange(2, 1, configsWithMetadata.length, 7).setValues(configsWithMetadata);
    }
  
    /**
     * Initializes the configuration manager by loading all configs into memory.
     * @returns {ConfigManager} The current instance for method chaining.
     */
    initialize() {
      if (this.isInitialized) return this;
      
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      // Skip the header row
      for (let i = 1; i < values.length; i++) {
        const [category, key, value, type] = values[i];
        if (!category || !key) continue;
        
        // Cache the configuration with proper type conversion
        this.cache[`${category}.${key}`] = this.convertValueByType(value, type);
      }
      
      this.isInitialized = true;
      return this;
    }
  
    /**
     * Converts a string value to its appropriate type.
     * @param {string} value - The string value to convert.
     * @param {string} type - The target type ('string', 'number', 'boolean', 'json', 'date', 'array').
     * @returns {*} The converted value.
     */
    convertValueByType(value, type) {
      if (value === null || value === undefined) return null;
      
      // Ensure type is a string before calling toLowerCase()
      const typeStr = String(type || '');
      switch (typeStr.toLowerCase()) {
        case 'number':
          return Number(value);
        case 'boolean':
          return String(value).toLowerCase() === 'true';
        case 'json':
          try {
            return JSON.parse(value);
          } catch (e) {
            Logger.log(`Error parsing JSON value for ${value}: ${e}`);
            return {};
          }
        case 'date':
          try {
            return new Date(value);
          } catch (e) {
            Logger.log(`Error parsing date value for ${value}: ${e}`);
            return new Date();
          }
        case 'array':
          try {
            return JSON.parse(value);
          } catch (e) {
            Logger.log(`Error parsing array value for ${value}: ${e}`);
            return [];
          }
        case 'string':
        default:
          return String(value);
      }
    }
  
    /**
     * Gets a configuration value.
     * @param {string} category - The configuration category.
     * @param {string} key - The configuration key.
     * @param {*} defaultValue - The default value to return if the configuration is not found.
     * @returns {*} The configuration value or the default value.
     */
    get(category, key, defaultValue = null) {
      // Ensure the cache is initialized
      if (!this.isInitialized) this.initialize();
      
      const cacheKey = `${category}.${key}`;
      
      // Return from cache if available
      if (cacheKey in this.cache) {
        return this.cache[cacheKey];
      }
      
      // If not in cache, try to find it in the sheet
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, rowKey, value, type] = values[i];
        if (rowCategory === category && rowKey === key) {
          // Convert and cache the value
          const convertedValue = this.convertValueByType(value, type);
          this.cache[cacheKey] = convertedValue;
          return convertedValue;
        }
      }
      
      // If not found, return the default value
      return defaultValue;
    }
  
    /**
     * Sets a configuration value.
     * @param {string} category - The configuration category.
     * @param {string} key - The configuration key.
     * @param {*} value - The value to set.
     * @param {string} type - The value type.
     * @param {string} description - An optional description of the configuration.
     * @returns {ConfigManager} The current instance for method chaining.
     */
    set(category, key, value, type = 'string', description = '') {
      // Ensure the cache is initialized
      if (!this.isInitialized) this.initialize();
      
      const cacheKey = `${category}.${key}`;
      const now = new Date().toISOString();
      const user = Session.getActiveUser().getEmail();
      
      // Prepare the value for storage based on its type
      let storedValue = value;
      if (type === 'json' || type === 'array') {
        storedValue = JSON.stringify(value);
      } else if (type === 'date' && value instanceof Date) {
        storedValue = value.toISOString();
      } else if (type === 'boolean') {
        storedValue = value ? 'TRUE' : 'FALSE';
      } else {
        storedValue = String(value);
      }
      
      // Try to find the existing row
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, rowKey] = values[i];
        if (rowCategory === category && rowKey === key) {
          // Update existing row
          this.configSheet.getRange(i + 1, 3).setValue(storedValue); // Value
          this.configSheet.getRange(i + 1, 4).setValue(type); // Type
          
          // If description is provided, update it
          if (description) {
            this.configSheet.getRange(i + 1, 5).setValue(description);
          }
          
          // Update metadata
          this.configSheet.getRange(i + 1, 6).setValue(now); // Last Updated
          this.configSheet.getRange(i + 1, 7).setValue(user); // Modified By
          
          // Update cache
          this.cache[cacheKey] = this.convertValueByType(storedValue, type);
          return this;
        }
      }
      
      // If not found, add a new row
      const newRow = [
        category,
        key,
        storedValue,
        type,
        description,
        now,
        user
      ];
      
      const lastRow = this.configSheet.getLastRow();
      this.configSheet.getRange(lastRow + 1, 1, 1, 7).setValues([newRow]);
      
      // Update cache
      this.cache[cacheKey] = this.convertValueByType(storedValue, type);
      
      return this;
    }
  
    /**
     * Gets all configuration entries for a specific category.
     * @param {string} category - The configuration category.
     * @returns {Object} An object containing all key-value pairs for the category.
     */
    getCategory(category) {
      // Ensure the cache is initialized
      if (!this.isInitialized) this.initialize();
      
      const result = {};
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, key, value, type] = values[i];
        if (rowCategory === category) {
          result[key] = this.convertValueByType(value, type);
        }
      }
      
      return result;
    }
  
    /**
     * Gets all configuration categories.
     * @returns {string[]} An array of unique category names.
     */
    getCategories() {
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      const categories = new Set();
      
      // Skip the header row
      for (let i = 1; i < values.length; i++) {
        const category = values[i][0];
        if (category) categories.add(category);
      }
      
      return Array.from(categories);
    }
  
    /**
     * Updates the 'last updated' timestamp for a specific configuration.
     * @param {string} category - The configuration category.
     * @param {string} key - The configuration key.
     */
    updateTimestamp(category, key) {
      const now = new Date().toISOString();
      const user = Session.getActiveUser().getEmail();
      
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, rowKey] = values[i];
        if (rowCategory === category && rowKey === key) {
          this.configSheet.getRange(i + 1, 6).setValue(now); // Last Updated
          this.configSheet.getRange(i + 1, 7).setValue(user); // Modified By
          break;
        }
      }
    }
  
    /**
     * Creates a JSON representation of all configurations.
     * @returns {Object} A nested object with all configurations organized by category.
     */
    exportAsJson() {
      const result = {};
      const dataRange = this.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      // Skip the header row
      for (let i = 1; i < values.length; i++) {
        const [category, key, value, type] = values[i];
        if (!category || !key) continue;
        
        if (!result[category]) {
          result[category] = {};
        }
        
        result[category][key] = this.convertValueByType(value, type);
      }
      
      return result;
    }
  
    /**
     * Imports configurations from a JSON object.
     * @param {Object} json - A nested object with configurations organized by category.
     * @returns {ConfigManager} The current instance for method chaining.
     */
    importFromJson(json) {
      for (const category in json) {
        for (const key in json[category]) {
          const value = json[category][key];
          const type = this.determineType(value);
          this.set(category, key, value, type);
        }
      }
      
      return this;
    }
  
    /**
     * Determines the type of a value.
     * @param {*} value - The value to check.
     * @returns {string} The type as a string ('string', 'number', 'boolean', 'json', 'date', 'array').
     */
    determineType(value) {
      if (value === null || value === undefined) return 'string';
      if (Array.isArray(value)) return 'array';
      if (value instanceof Date) return 'date';
      
      const type = typeof value;
      if (type === 'object') return 'json';
      if (type === 'number' || type === 'boolean') return type;
      
      return 'string';
    }
  
    /**
     * Resets the cache, forcing fresh reads from the config sheet.
     * @returns {ConfigManager} The current instance for method chaining.
     */
    resetCache() {
      this.cache = {};
      this.isInitialized = false;
      return this;
    }
  }