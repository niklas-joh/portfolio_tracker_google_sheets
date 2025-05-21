/**
 * @fileoverview Defines the PieItemModel class, representing an instrument within a trading pie.
 */

/**
 * Represents an individual instrument (e.g., stock, ETF) within a trading pie.
 * This class is responsible for parsing raw API data for a pie item,
 * validating it, and providing methods for data transformation.
 */
class PieItemModel {
  /**
   * Creates an instance of PieItemModel.
   * @param {Object} rawData Raw data object for a pie item.
   * @param {string} rawData.ticker The stock ticker symbol for the instrument.
   * @param {number} [rawData.id] The unique identifier of the pie item, if available.
   * @param {number} rawData.expectedShare The target percentage share of this instrument in the pie (e.g., 0.25 for 25%).
   * @param {number} rawData.currentShare The current actual percentage share of this instrument in the pie.
   * @param {number} rawData.currentValue The current monetary value of this instrument holding in the pie.
   * @param {number} rawData.investedValue The total amount invested in this instrument within the pie.
   * @param {number} rawData.quantity The number of shares held for this instrument.
   * @param {number} [rawData.result] The profit or loss for this instrument.
   * @param {string} [rawData.resultCurrency] The currency of the result.
   * @param {number} [rawData.pieId] The ID of the parent pie this item belongs to.
   */
  constructor(rawData) {
    if (!rawData || !rawData.ticker || typeof rawData.expectedShare === 'undefined' || typeof rawData.currentShare === 'undefined' || typeof rawData.currentValue === 'undefined' || typeof rawData.investedValue === 'undefined' || typeof rawData.quantity === 'undefined') {
      throw new Error('Invalid rawData provided to PieItemModel constructor. Required fields: ticker, expectedShare, currentShare, currentValue, investedValue, quantity.');
    }

    /** @type {string} */
    this.ticker = rawData.ticker;
    /** @type {number|null} */
    this.id = typeof rawData.id === 'number' ? rawData.id : null;
    /** @type {number} */
    this.expectedShare = rawData.expectedShare;
    /** @type {number} */
    this.currentShare = rawData.currentShare;
    /** @type {number} */
    this.currentValue = rawData.currentValue;
    /** @type {number} */
    this.investedValue = rawData.investedValue;
    /** @type {number} */
    this.quantity = rawData.quantity;
    /** @type {number|null} */
    this.result = typeof rawData.result === 'number' ? rawData.result : null;
    /** @type {string|null} */
    this.resultCurrency = rawData.resultCurrency || null;
    /** @type {number|null} */
    this.pieId = typeof rawData.pieId === 'number' ? rawData.pieId : null;


    this.validate();
  }

  /**
   * Validates the pie item data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.ticker !== 'string' || this.ticker.trim() === '') {
      throw new Error('Pie item ticker cannot be empty.');
    }
    if (typeof this.expectedShare !== 'number' || this.expectedShare < 0 || this.expectedShare > 1) {
      throw new Error(`Invalid expectedShare: ${this.expectedShare}. Must be between 0 and 1.`);
    }
    if (typeof this.currentShare !== 'number' || this.currentShare < 0 || this.currentShare > 1) {
      throw new Error(`Invalid currentShare: ${this.currentShare}. Must be between 0 and 1.`);
    }
    if (typeof this.currentValue !== 'number' || this.currentValue < 0) {
      throw new Error(`Invalid currentValue: ${this.currentValue}.`);
    }
    if (typeof this.investedValue !== 'number' || this.investedValue < 0) {
      throw new Error(`Invalid investedValue: ${this.investedValue}.`);
    }
    if (typeof this.quantity !== 'number' || this.quantity < 0) {
      throw new Error(`Invalid quantity: ${this.quantity}.`);
    }
    if (this.id !== null && (typeof this.id !== 'number' || this.id <= 0)) {
      throw new Error(`Invalid pie item ID: ${this.id}`);
    }
    if (this.pieId !== null && (typeof this.pieId !== 'number' || this.pieId <= 0)) {
      throw new Error(`Invalid parent pie ID: ${this.pieId}`);
    }
    if (this.result !== null && typeof this.result !== 'number') {
      throw new Error(`Invalid result value: ${this.result}.`);
    }
    if (this.resultCurrency !== null && (typeof this.resultCurrency !== 'string' || this.resultCurrency.trim().length !== 3)) {
      throw new Error(`Invalid result currency code: ${this.resultCurrency}`);
    }
  }

  /**
   * Returns a simple object representation of the pie item.
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      pieId: this.pieId,
      ticker: this.ticker,
      expectedShare: this.expectedShare,
      currentShare: this.currentShare,
      currentValue: this.currentValue,
      investedValue: this.investedValue,
      quantity: this.quantity,
      result: this.result,
      resultCurrency: this.resultCurrency,
    };
  }

  /**
   * Returns a representation of the pie item suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} [headers] Optional array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers) {
      // Fallback to old behavior if no headers provided
      return [
        this.pieId,
        this.id,
        this.ticker,
        (this.expectedShare * 100).toFixed(2) + '%',
        (this.currentShare * 100).toFixed(2) + '%',
        this.currentValue,
        this.investedValue,
        this.quantity,
        this.result,
        this.resultCurrency,
      ];
    }
    
    // Create an object structure matching the original API response
    const rawObject = this.toObject();
    
    // Ensure percentages are correctly formatted
    rawObject.expectedShare = (rawObject.expectedShare * 100).toFixed(2) + '%';
    rawObject.currentShare = (rawObject.currentShare * 100).toFixed(2) + '%';
    
    // Map each header to a value using the originalPath
    return headers.map(header => {
      try {
        return resolveNestedField(rawObject, header.originalPath);
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for PieItemModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates a PieItemModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {PieItemModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    // If headers is an array of strings (old format), convert to expected format
    if (headers && headers.length > 0 && typeof headers[0] === 'string') {
      const headerNames = headers;
      const raw = headerNames.reduce((obj, header, index) => {
        let value = rowData[index];
        // Transformations from sheet format to rawData format
        if (['id', 'pieId', 'currentValue', 'investedValue', 'quantity', 'result'].includes(header)) {
          value = value !== '' && value !== null && !isNaN(parseFloat(value)) ? parseFloat(value) : null;
        } else if (['expectedShare', 'currentShare'].includes(header) && typeof value === 'string' && value.endsWith('%')) {
          value = parseFloat(value.replace('%', '')) / 100;
        } else if (header === 'issues' && typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            Logger.log(`Error parsing issues JSON from sheet for ticker ${obj.ticker || 'unknown'}: ${value}`);
            value = null; // Or an empty array, or keep as string if preferred
          }
        }
        obj[header] = value;
        return obj;
      }, {});
      return new PieItemModel(raw);
    }
    
    // New format with dynamic headers
    const rawData = {};
    
    // Handle each field based on its path
    headers.forEach((header, index) => {
      const path = header.originalPath;
      let value = rowData[index];
      
      // Process specific fields
      if (['id', 'pieId', 'currentValue', 'investedValue', 'quantity', 'result'].includes(path)) {
        value = value !== '' && value !== null && !isNaN(parseFloat(value)) ? parseFloat(value) : null;
      } else if (['expectedShare', 'currentShare'].includes(path) && typeof value === 'string' && value.endsWith('%')) {
        value = parseFloat(value.replace('%', '')) / 100;
      } else if (path === 'issues' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          Logger.log(`Error parsing issues JSON from sheet: ${value}`);
          value = null;
        }
      }
      
      // Set the value in the nested structure
      setNestedProperty(rawData, path, value);
    });
    
    return new PieItemModel(rawData);
  }

  /**
   * Calculates the difference between expected and current share.
   * @returns {number} The difference (e.g., positive if underweight, negative if overweight).
   */
  getShareDifference() {
    return this.expectedShare - this.currentShare;
  }

  /**
   * Gets the formatted current value string.
   * @param {string} [currencySymbol='$'] The currency symbol to use.
   * @returns {string}
   */
  getFormattedCurrentValue(currencySymbol = '$') {
    // This assumes the currency of the item is the same as the pie or a default.
    // For multi-currency pies, this might need adjustment or currency info from parent pie.
    return `${currencySymbol}${this.currentValue.toFixed(2)}`;
  }
  
  /**
   * Returns an array of all expected API field paths for this model.
   * Used by HeaderMappingService and BaseRepository as a fallback when API response is not available.
   * @returns {Array<string>} Array of field paths.
   * @static
   */
  static getExpectedApiFieldPaths() {
    return [
      'pieId',
      'id',
      'ticker',
      'expectedShare',
      'currentShare',
      'currentValue',
      'investedValue',
      'quantity',
      'result',
      'resultCurrency'
    ];
  }
}

// Global availability for GAS V8 runtime
