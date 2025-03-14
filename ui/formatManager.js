/**
 * ===================== Format Manager ========================
 * 
 * A class for managing column formatting based on configuration settings
 * with support for user overrides and dynamic formatting.
 * 
 * This class works in conjunction with ConfigManager to apply formatting
 * rules to sheets based on column types and user preferences.
 */
class FormatManager {
    /**
     * Creates a new FormatManager instance.
     * @param {ConfigManager} configManager - The configuration manager instance.
     */
    constructor(configManager) {
      this.configManager = configManager;
      this.userOverrides = this.loadUserOverrides();
    }
  
    /**
     * Loads user formatting overrides from the config.
     * @returns {Object} User formatting overrides.
     */
    loadUserOverrides() {
      return this.configManager.get('ColumnFormatting', 'USER_OVERRIDES', {});
    }
  
    /**
     * Saves user formatting overrides to the config.
     * @param {Object} overrides - The formatting overrides to save.
     */
    saveUserOverrides(overrides) {
      this.configManager.set(
        'ColumnFormatting', 
        'USER_OVERRIDES', 
        overrides, 
        'json', 
        'User-defined formatting overrides'
      );
      this.userOverrides = overrides;
    }
  
    /**
     * Gets the default format for a specific column type.
     * @param {string} columnType - The type of column ('date', 'currency', 'number', etc.).
     * @returns {string} The format string for the column type.
     */
    getDefaultFormat(columnType) {
      const defaults = {
        date: this.configManager.get('UI', 'DEFAULT_DATE_FORMAT', 'yyyy-MM-dd'),
        currency: this.configManager.get('UI', 'DEFAULT_CURRENCY_FORMAT', '"$"#,##0.00'),
        number: this.configManager.get('UI', 'DEFAULT_NUMBER_FORMAT', '#,##0.00'),
        percentage: this.configManager.get('UI', 'DEFAULT_PERCENTAGE_FORMAT', '0.00%'),
        text: '@'
      };
      
      return defaults[columnType.toLowerCase()] || '@';
    }
  
    /**
     * Gets the format for a specific column, considering user overrides.
     * @param {string} sheetName - The sheet name.
     * @param {string} columnName - The column name.
     * @param {string} defaultType - The default column type if not specified.
     * @returns {string} The format string for the column.
     */
    getColumnFormat(sheetName, columnName, defaultType = 'text') {
      // Check for user override
      const overrideKey = `${sheetName}.${columnName}`;
      if (this.userOverrides[overrideKey]) {
        return this.userOverrides[overrideKey];
      }
      
      // Get column type mappings from config
      const dateColumns = this.configManager.get('ColumnFormatting', 'DATE_COLUMNS', []);
      const currencyColumns = this.configManager.get('ColumnFormatting', 'CURRENCY_COLUMNS', []);
      const numberColumns = this.configManager.get('ColumnFormatting', 'NUMBER_COLUMNS', []);
      const percentageColumns = this.configManager.get('ColumnFormatting', 'PERCENTAGE_COLUMNS', []);
      
      // Determine column type
      let columnType = defaultType;
      if (dateColumns.includes(columnName)) {
        columnType = 'date';
      } else if (currencyColumns.includes(columnName)) {
        columnType = 'currency';
      } else if (numberColumns.includes(columnName)) {
        columnType = 'number';
      } else if (percentageColumns.includes(columnName)) {
        columnType = 'percentage';
      }
      
      // Return default format for the determined type
      return this.getDefaultFormat(columnType);
    }
  
    /**
     * Sets a user override for a specific column's format.
     * @param {string} sheetName - The sheet name.
     * @param {string} columnName - The column name.
     * @param {string} format - The format string to apply.
     */
    setUserOverride(sheetName, columnName, format) {
      const overrideKey = `${sheetName}.${columnName}`;
      const overrides = {...this.userOverrides};
      overrides[overrideKey] = format;
      this.saveUserOverrides(overrides);
    }
  
    /**
     * Removes a user override for a specific column's format.
     * @param {string} sheetName - The sheet name.
     * @param {string} columnName - The column name.
     */
    removeUserOverride(sheetName, columnName) {
      const overrideKey = `${sheetName}.${columnName}`;
      const overrides = {...this.userOverrides};
      delete overrides[overrideKey];
      this.saveUserOverrides(overrides);
    }
  
    /**
     * Applies formatting to a specific sheet based on column types and user overrides.
     * @param {string} sheetName - The name of the sheet to format.
     */
    applyFormattingToSheet(sheetName) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`Sheet "${sheetName}" not found.`);
        return;
      }
      
      // Get the header row to identify columns
      const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Apply formatting to each column
      headerRow.forEach((columnName, index) => {
        if (!columnName) return;
        
        const format = this.getColumnFormat(sheetName, columnName);
        const columnRange = sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1);
        
        try {
          // Apply the format
          if (format.startsWith('yyyy') || format.includes('MM') || format.includes('dd')) {
            // Date format
            columnRange.setNumberFormat(format);
          } else if (format.includes('#') || format.includes('0')) {
            // Number format
            columnRange.setNumberFormat(format);
          } else {
            // Text format
            columnRange.setNumberFormat(format);
          }
          
          Logger.log(`Applied format "${format}" to column "${columnName}" in sheet "${sheetName}"`);
        } catch (e) {
          Logger.log(`Error applying format "${format}" to column "${columnName}": ${e}`);
        }
      });
      
      // Log the formatting operation
      this.logFormattingOperation(sheetName);
    }
  
    /**
     * Logs a formatting operation to the config.
     * @param {string} sheetName - The name of the sheet that was formatted.
     */
    logFormattingOperation(sheetName) {
      const now = new Date();
      this.configManager.set(
        'ColumnFormatting', 
        `LAST_FORMAT_${sheetName}`, 
        now, 
        'date', 
        `Last time formatting was applied to ${sheetName}`
      );
    }
  
    /**
     * Registers a column as having a specific type.
     * @param {string} columnName - The column name.
     * @param {string} columnType - The column type ('date', 'currency', 'number', 'percentage', 'text').
     */
    registerColumnType(columnName, columnType) {
      const types = ['date', 'currency', 'number', 'percentage', 'text'];
      if (!types.includes(columnType.toLowerCase())) {
        Logger.log(`Invalid column type: ${columnType}. Must be one of: ${types.join(', ')}`);
        return;
      }
      
      // Get the current list for this type
      const configKey = `${columnType.toUpperCase()}_COLUMNS`;
      const currentColumns = this.configManager.get('ColumnFormatting', configKey, []);
      
      // Add the column if it's not already in the list
      if (!currentColumns.includes(columnName)) {
        currentColumns.push(columnName);
        this.configManager.set(
          'ColumnFormatting', 
          configKey, 
          currentColumns, 
          'array', 
          `Columns that should be formatted as ${columnType}`
        );
      }
    }
  
    /**
     * Creates a user interface for managing column formatting.
     */
    showFormattingUI() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const activeSheet = spreadsheet.getActiveSheet();
      const sheetName = activeSheet.getName();
      
      // Get the header row to identify columns
      let columns = [];
      let selectedColumn = null;
      
      try {
        if (activeSheet.getLastColumn() > 0) {
          columns = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
          
          // Filter out empty cells and convert to strings
          columns = columns.filter(column => column).map(column => String(column));
          
          // Get the selected column if a cell is selected
          const activeRange = activeSheet.getActiveRange();
          if (activeRange) {
            const columnIndex = activeRange.getColumn() - 1;
            if (columnIndex >= 0 && columnIndex < columns.length) {
              selectedColumn = columns[columnIndex];
            }
          }
        }
      } catch (e) {
        Logger.log(`Error getting columns: ${e}`);
      }
      
      // If no columns found, add a placeholder
      if (columns.length === 0) {
        columns = ['No columns found'];
      }
      
      // Create the template with data
      const template = HtmlService.createTemplateFromFile('html/ColumnFormattingDialog');
      template.sheetName = sheetName;
      template.columns = columns;
      template.selectedColumn = selectedColumn || columns[0];
      
      // Evaluate the template and set properties
      const htmlOutput = template.evaluate()
        .setWidth(500)
        .setHeight(600)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
      
      // Display the dialog
      SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Column Formatting');
    }
  }
  
  /**
   * Server-side function to apply column formatting from the UI.
   * @param {string} columnName - The column name.
   * @param {string} formatType - The format type or 'custom'.
   * @param {string} formatValue - The format value (either a predefined format or custom format).
   */
  function applyColumnFormat(columnName, formatType, formatValue) {
    try {
      if (!columnName) {
        throw new Error('Column name is required');
      }
      
      const configManager = new ConfigManager();
      const formatManager = new FormatManager(configManager);
      const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const sheetName = activeSheet.getName();
      
      Logger.log(`Applying format to column "${columnName}" in sheet "${sheetName}"`);
      Logger.log(`Format type: ${formatType}, Format value: ${formatValue}`);
      
      // Find the column index
      let columnIndex = -1;
      const headerRow = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
      for (let i = 0; i < headerRow.length; i++) {
        if (headerRow[i] === columnName) {
          columnIndex = i + 1;
          break;
        }
      }
      
      if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in sheet "${sheetName}"`);
      }
      
      // Register the column as having the specified type
      if (formatType !== 'custom') {
        formatManager.registerColumnType(columnName, formatType);
      }
      
      // Apply the format directly to the column range if data exists
      if (activeSheet.getLastRow() > 1) {
        const columnRange = activeSheet.getRange(2, columnIndex, activeSheet.getLastRow() - 1, 1);
        columnRange.setNumberFormat(formatValue);
        Logger.log(`Applied format directly to column range: ${formatValue}`);
      }
      
      // Also save the format as a user override for future use
      formatManager.setUserOverride(sheetName, columnName, formatValue);
      
      return {success: true, message: 'Format applied successfully'};
    } catch (e) {
      Logger.log(`Error applying column format: ${e}`);
      throw new Error(`Unable to apply format: ${e.message}`);
    }
  }
  
  /**
   * Server-side function to reset column formatting to default.
   * @param {string} columnName - The column name.
   */
  function resetColumnFormat(columnName) {
    try {
      if (!columnName) {
        throw new Error('Column name is required');
      }
      
      const configManager = new ConfigManager();
      const formatManager = new FormatManager(configManager);
      const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const sheetName = activeSheet.getName();
      
      Logger.log(`Resetting format for column "${columnName}" in sheet "${sheetName}"`);
      
      // Find the column index
      let columnIndex = -1;
      const headerRow = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
      for (let i = 0; i < headerRow.length; i++) {
        if (headerRow[i] === columnName) {
          columnIndex = i + 1;
          break;
        }
      }
      
      if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in sheet "${sheetName}"`);
      }
      
      // Remove user override
      formatManager.removeUserOverride(sheetName, columnName);
      
      // Apply the default formatting based on registered type
      const dateColumns = configManager.get('ColumnFormatting', 'DATE_COLUMNS', []);
      const currencyColumns = configManager.get('ColumnFormatting', 'CURRENCY_COLUMNS', []);
      const numberColumns = configManager.get('ColumnFormatting', 'NUMBER_COLUMNS', []);
      const percentageColumns = configManager.get('ColumnFormatting', 'PERCENTAGE_COLUMNS', []);
      
      let defaultFormat = '@'; // Default to text format
      
      if (dateColumns.includes(columnName)) {
        defaultFormat = formatManager.getDefaultFormat('date');
      } else if (currencyColumns.includes(columnName)) {
        defaultFormat = formatManager.getDefaultFormat('currency');
      } else if (numberColumns.includes(columnName)) {
        defaultFormat = formatManager.getDefaultFormat('number');
      } else if (percentageColumns.includes(columnName)) {
        defaultFormat = formatManager.getDefaultFormat('percentage');
      }
      
      // Apply the format directly to the column range if data exists
      if (activeSheet.getLastRow() > 1) {
        const columnRange = activeSheet.getRange(2, columnIndex, activeSheet.getLastRow() - 1, 1);
        columnRange.setNumberFormat(defaultFormat);
        Logger.log(`Reset column format to default: ${defaultFormat}`);
      }
      
      return {success: true, message: 'Format reset successfully'};
    } catch (e) {
      Logger.log(`Error resetting column format: ${e}`);
      throw new Error(`Unable to reset format: ${e.message}`);
    }
  }