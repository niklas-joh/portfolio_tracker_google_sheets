/**
 * ===================== Main Application Script ========================
 * 
 * This is the main entry point for the Trading212 Integration application.
 * It handles initialization, setup, and global function exports.
 */

/**
 * The main entry point when the spreadsheet is opened.
 * Sets up the necessary UI elements and initializes the application.
 */
function onOpen() {
    // Initialize the configuration system
    const configManager = new ConfigManager();
    configManager.initialize();
    
    // Set up the UI
    const ui = new UIController();
    ui.createMainMenu();
    
    // Check if this is the first run
    const isInitialized = configManager.get('App', 'IS_INITIALIZED', false);
    if (!isInitialized) {
      // First time initialization
      performFirstTimeSetup();
    }
    
    // Log the open event
    Logger.log('App opened and initialized.');
  }
  
  /**
   * Performs first-time setup when the application is first installed.
   */
  function performFirstTimeSetup() {
    const configManager = new ConfigManager();
    const sheetManager = new SheetManager();
    
    // Initialize sheets
    sheetManager.initializeSheets();
    
    // Mark as initialized
    configManager.set('App', 'IS_INITIALIZED', true, 'boolean', 'Whether the app has been initialized');
    configManager.set('App', 'INSTALL_DATE', new Date(), 'date', 'When the app was first installed');
    
    // Show welcome message
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Welcome to Trading212 Integration',
      'The application has been set up and is ready to use. ' +
      'You can find all functions in the "Trading212 Integration" menu. ' +
      'First, configure your API settings to start fetching data.',
      ui.ButtonSet.OK
    );
  }
  
  /**
   * Saves API settings from the dialog.
   * @param {string} environment - The API environment ('demo' or 'live').
   * @param {string} apiKey - The API key.
   * @param {string} rateLimitStrategy - The rate limit strategy.
   */
  function saveApiSettings(environment, apiKey, rateLimitStrategy) {
    try {
      const configManager = new ConfigManager();
      
      // Ensure values are strings to prevent toLowerCase errors
      const envStr = String(environment || 'demo');
      const apiKeyStr = String(apiKey || '');
      const strategyStr = String(rateLimitStrategy || 'conservative');
      
      // Save the settings
      configManager.set('API', 'ENVIRONMENT', envStr, 'string', 'API environment (demo/live)');
      configManager.set('API', 'API_KEY', apiKeyStr, 'string', 'API key for authentication (encrypted)');
      configManager.set('API', 'RATE_LIMIT_STRATEGY', strategyStr, 'string', 'How to handle rate limits');
      
      // Update last modified
      configManager.set('API', 'LAST_MODIFIED', new Date(), 'date', 'When API settings were last modified');
      
      // Also save to user properties for quick access
      PropertiesService.getUserProperties().setProperty('SELECTED_ENVIRONMENT', envStr);
      
      return {success: true};
    } catch (e) {
      Logger.log(`Error saving API settings: ${e}`);
      throw new Error(`Unable to save settings: ${e.message}`);
    }
  }
  
  /**
   * Saves sheet mappings from the dialog.
   * @param {Object} mappings - The sheet mappings object.
   */
  function saveSheetMappings(mappings) {
    try {
      const configManager = new ConfigManager();
      
      // Save each mapping
      for (const key in mappings) {
        configManager.set('SheetMappings', key, mappings[key], 'string', `Sheet name for ${key.toLowerCase()}`);
      }
      
      return {success: true};
    } catch (e) {
      Logger.log(`Error saving sheet mappings: ${e}`);
      throw new Error(`Unable to save mappings: ${e.message}`);
    }
  }
  
  /**
   * Gets settings for a specific category.
   * @param {string} category - The category name.
   * @returns {Object} The settings for the category.
   */
  function getCategorySettings(category) {
    try {
      const configManager = new ConfigManager();
      const dataRange = configManager.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      const settings = {};
      
      // Skip the header row
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, key, value, type, description] = values[i];
        if (rowCategory === category) {
          settings[key] = {
            value: value,
            type: type,
            description: description
          };
        }
      }
      
      return settings;
    } catch (e) {
      Logger.log(`Error getting category settings: ${e}`);
      throw new Error(`Unable to get settings: ${e.message}`);
    }
  }
  
  /**
   * Saves a setting value.
   * @param {string} category - The category name.
   * @param {string} key - The setting key.
   * @param {string} value - The setting value.
   */
  function saveSettingValue(category, key, value) {
    try {
      const configManager = new ConfigManager();
      const dataRange = configManager.configSheet.getDataRange();
      const values = dataRange.getValues();
      
      // Find the row with the setting
      for (let i = 1; i < values.length; i++) {
        const [rowCategory, rowKey, currentValue, type] = values[i];
        if (rowCategory === category && rowKey === key) {
          // Convert the value based on the type
          let convertedValue = value;
          if (type === 'number') {
            convertedValue = Number(value);
          } else if (type === 'boolean') {
            convertedValue = value.toLowerCase() === 'true';
          } else if (type === 'json' || type === 'array') {
            try {
              convertedValue = JSON.parse(value);
            } catch (e) {
              throw new Error(`Invalid JSON: ${e.message}`);
            }
          } else if (type === 'date') {
            try {
              convertedValue = new Date(value);
            } catch (e) {
              throw new Error(`Invalid date: ${e.message}`);
            }
          }
          
          // Save the value
          configManager.set(category, key, convertedValue, type);
          return;
        }
      }
      
      throw new Error(`Setting "${key}" not found in category "${category}".`);
    } catch (e) {
      Logger.log(`Error saving setting value: ${e}`);
      throw new Error(`Unable to save setting: ${e.message}`);
    }
  }
  
  /**
   * Adds a new setting.
   * @param {string} category - The category name.
   * @param {string} key - The setting key.
   * @param {string} value - The setting value.
   * @param {string} type - The setting type.
   * @param {string} description - The setting description.
   */
  function addNewSetting(category, key, value, type, description) {
    try {
      const configManager = new ConfigManager();
      
      // Convert the value based on the type
      let convertedValue = value;
      if (type === 'number') {
        convertedValue = Number(value);
      } else if (type === 'boolean') {
        convertedValue = value.toLowerCase() === 'true';
      } else if (type === 'json' || type === 'array') {
        try {
          convertedValue = JSON.parse(value);
        } catch (e) {
          throw new Error(`Invalid JSON: ${e.message}`);
        }
      } else if (type === 'date') {
        try {
          convertedValue = new Date(value);
        } catch (e) {
          throw new Error(`Invalid date: ${e.message}`);
        }
      }
      
      // Save the new setting
      configManager.set(category, key, convertedValue, type, description);
    } catch (e) {
      Logger.log(`Error adding new setting: ${e}`);
      throw new Error(`Unable to add setting: ${e.message}`);
    }
  }
  
  /**
   * Exports all configuration as JSON.
   * @returns {string} The configuration as a JSON string.
   */
  function exportAllConfig() {
    try {
      const configManager = new ConfigManager();
      const config = configManager.exportAsJson();
      return JSON.stringify(config, null, 2);
    } catch (e) {
      Logger.log(`Error exporting config: ${e}`);
      throw new Error(`Unable to export config: ${e.message}`);
    }
  }
  
  /**
   * Imports configuration from JSON.
   * @param {string} json - The JSON configuration string.
   */
  function importConfig(json) {
    try {
      const configManager = new ConfigManager();
      const config = JSON.parse(json);
      configManager.importFromJson(config);
    } catch (e) {
      Logger.log(`Error importing config: ${e}`);
      throw new Error(`Unable to import config: ${e.message}`);
    }
  }
  
  /**
   * Tracks the current active sheet.
   */
  function trackCurrentSheet() {
    try {
      const configManager = new ConfigManager();
      const sheetTracker = new SheetTracker(configManager);
      
      const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const sheetName = activeSheet.getName();
      
      // Register or update the sheet
      sheetTracker.updateSheetTracking(sheetName, {
        manuallyTracked: true,
        rowCount: activeSheet.getLastRow(),
        columnCount: activeSheet.getLastColumn()
      });
      
      // Get headers to track columns
      if (activeSheet.getLastRow() > 0) {
        const headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
        headers.forEach((header, index) => {
          if (header) {
            sheetTracker.updateColumnTracking(sheetName, header, {
              index: index + 1,
              manuallyTracked: true
            });
          }
        });
      }
      
      SpreadsheetApp.getUi().alert(`Successfully tracked sheet "${sheetName}".`);
    } catch (e) {
      Logger.log(`Error tracking current sheet: ${e}`);
      SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    }
  }
  
  /**
   * Updates the tracking sheet.
   */
  function updateTrackingSheet() {
    try {
      const configManager = new ConfigManager();
      const sheetTracker = new SheetTracker(configManager);
      
      sheetTracker.createTrackingSheet();
      
      SpreadsheetApp.getUi().alert('Tracking sheet updated.');
    } catch (e) {
      Logger.log(`Error updating tracking sheet: ${e}`);
      SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    }
  }
  
  /**
   * Gets the current environment setting.
   * Called from AboutDialog.html
   * @returns {string} The current environment setting.
   */
  function getEnvironmentSetting() {
    try {
      const configManager = new ConfigManager();
      return configManager.get('API', 'ENVIRONMENT', 'demo');
    } catch (e) {
      Logger.log(`Error getting environment setting: ${e}`);
      return 'demo';
    }
  }
  
  /**
   * Shows the about dialog for testing purposes.
   * This function can be run directly from the Apps Script editor.
   */
  function testAboutDialog() {
    UI.showAboutDialog();
    
    // Log detailed information for debugging
    const configManager = new ConfigManager();
    Logger.log('Testing About Dialog');
    Logger.log('Install Date: ' + configManager.get('App', 'INSTALL_DATE', new Date()));
    Logger.log('Last Modified: ' + configManager.get('API', 'LAST_MODIFIED', new Date()));
    Logger.log('Environment: ' + getEnvironmentSetting());
  }