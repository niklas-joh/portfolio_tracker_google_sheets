/**
 * Manages sheet formatting and named ranges
 */
class SheetFormattingManager {
    constructor() {
      this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      this.defaultCurrency = this.getDefaultCurrency();
    }
  
    /**
     * Gets the default currency from AccountInfo sheet
     * @returns {string} Currency code (e.g., 'USD', 'EUR')
     */
    getDefaultCurrency() {
      try {
        const accountInfoSheet = this.spreadsheet.getSheetByName(API_RESOURCES.ACCOUNT_INFO.sheetName);
        if (!accountInfoSheet) return 'USD'; // Default fallback
        
        // Find currency in AccountInfo sheet
        const currency = accountInfoSheet.getRange(2,2).getValue();
          if (currency !== '') {
            return currency || 'USD';
          }
        return 'USD'; // Fallback if not found
      } catch (error) {
        Logger.log('Error getting default currency: ' + error);
        return 'USD'; // Fallback on error
      }
    }
  
    /**
     * Formats a sheet based on its content
     * @param {string} sheetName - Name of the sheet to format
     */
    formatSheet(sheetName) {
      const sheet = this.spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`Sheet ${sheetName} not found`);
        return;
      }
  
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      if (values.length < 2) return; // Need at least headers and one row
  
      const headers = values[0];
      this.createNamedRanges(sheet, headers);
      this.applyColumnFormatting(sheet, headers, values);
      this.applyHeaderFormatting(sheet, headers.length);
    }
  
    /**
     * Creates named ranges for each column
     * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to create ranges in
     * @param {string[]} headers - Array of header names
     */
    createNamedRanges(sheet, headers) {
      headers.forEach((header, index) => {
        const columnLetter = this.columnToLetter(index + 1);
        const rangeName = this.sanitizeRangeName(`${sheet.getName()}_${header}`);
        
        // Delete existing named range if it exists
        const existingRange = this.spreadsheet.getRangeByName(rangeName);
        if (existingRange) {
          this.spreadsheet.removeNamedRange(rangeName);
        }
  
        // Create new named range
        const range = sheet.getRange(`${columnLetter}2:${columnLetter}`);
        this.spreadsheet.setNamedRange(rangeName, range);
      });
    }
  
    /**
     * Applies appropriate formatting to each column based on content analysis
     * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to format
     * @param {string[]} headers - Array of header names
     * @param {Array<Array>} values - 2D array of sheet values
     */
    applyColumnFormatting(sheet, headers, values) {
      headers.forEach((header, colIndex) => {
        const format = this.detectColumnFormat(values, colIndex, header);
        const range = sheet.getRange(2, colIndex + 1, sheet.getLastRow() - 1, 1);
        
        switch (format) {
          case 'currency':
            range.setNumberFormat(this.getCurrencyFormat());
            break;
          case 'percentage':
            range.setNumberFormat('0.00%');
            break;
          case 'date':
            range.setNumberFormat('yyyy-mm-dd hh:mm:ss');
            break;
          case 'number':
            range.setNumberFormat('#,##0.00');
            break;
          // Add more format cases as needed
        }
      });
    }
  
    /**
     * Applies formatting to the header row
     * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to format
     * @param {number} headerLength - Number of columns
     */
    applyHeaderFormatting(sheet, headerLength) {
      const headerRange = sheet.getRange(1, 1, 1, headerLength);
      headerRange
        .setBackground('#f3f3f3')
        .setFontWeight('bold')
        .setWrap(false);
      
      // Auto-resize columns
      for (let i = 1; i <= headerLength; i++) {
        sheet.autoResizeColumn(i);
      }
    }
  
    /**
     * Detects appropriate format for a column based on its content
     * @param {Array<Array>} values - 2D array of sheet values
     * @param {number} colIndex - Column index
     * @param {string} header - Header name
     * @returns {string} Format type
     */
    detectColumnFormat(values, colIndex, header) {
      // Skip header row
      const columnValues = values.slice(1).map(row => row[colIndex]);
      
      // Check header name patterns
      const headerLower = header.toLowerCase();
      if (headerLower.includes('amount') || 
          headerLower.includes('price') || 
          headerLower.includes('value') ||
          headerLower.includes('cost')) {
        return 'currency';
      }
      
      if (headerLower.includes('percentage') || 
          headerLower.includes('ratio') || 
          headerLower.includes('allocation')) {
        return 'percentage';
      }
  
      // Analyze actual values
      const nonEmptyValues = columnValues.filter(val => val !== null && val !== '');
      if (nonEmptyValues.length === 0) return 'text';
  
      // Check if all values are dates
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{4}\/\d{2}\/\d{2}/;
      if (nonEmptyValues.every(val => datePattern.test(String(val)))) {
        return 'date';
      }
  
      // Check if all values are numbers
      if (nonEmptyValues.every(val => !isNaN(val) && typeof val !== 'string')) {
        return 'currency';
      }
  
      return 'text';
    }
  
    /**
     * Gets appropriate currency format based on the default currency
     * @returns {string} Number format string
     */
    getCurrencyFormat() {
      const currencyFormats = {
        'USD': '"$"#,##0.00',
        'EUR': '€#,##0.00',
        'GBP': '"£"#,##0.00',
        // Add more currencies as needed
      };
      return currencyFormats[this.defaultCurrency] || currencyFormats['USD'];
    }
  
    /**
     * Converts column number to letter
     * @param {number} column - Column number
     * @returns {string} Column letter(s)
     */
    columnToLetter(column) {
      let temp, letter = '';
      while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
      }
      return letter;
    }
  
    /**
     * Sanitizes a string for use as a named range
     * @param {string} name - Original name
     * @returns {string} Sanitized name
     */
    sanitizeRangeName(name) {
      return name
        .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid characters with underscore
        .replace(/^[0-9]/, '_$&')       // Prepend underscore if starts with number
        .substring(0, 250);             // Truncate to valid length
    }
  }