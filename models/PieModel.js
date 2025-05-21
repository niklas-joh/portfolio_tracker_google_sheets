/**
 * @fileoverview Defines the PieModel class, representing a trading pie.
 */

/**
 * Represents a trading pie with its associated data.
 * This class is responsible for parsing raw API data for a pie,
 * validating it, and providing methods for data transformation or accessing calculated properties.
 */
class PieModel {
  /**
   * Creates an instance of PieModel.
   * @param {Object} rawData Raw data object for a pie, typically from the API.
   * @param {number} rawData.id The unique identifier of the pie.
   * @param {string} rawData.name The name of the pie.
   * @param {string} rawData.creationDate ISO string representing the creation date.
   * @param {string} rawData.lastUpdateDate ISO string representing the last update date.
   * @param {string} [rawData.icon] The icon associated with the pie.
   * @param {number} [rawData.progress] The completion progress of the pie (e.g., 0.75 for 75%).
   * @param {number} rawData.value The current monetary value of the pie.
   * @param {string} rawData.currency The currency of the pie's value (e.g., "USD", "EUR").
   * @param {Array<Object>} [rawData.instruments] Array of instruments or their identifiers within the pie.
   */
  constructor(rawData) {
    if (!rawData || typeof rawData.id === 'undefined' || !rawData.name || typeof rawData.value === 'undefined' || !rawData.currency) {
      throw new Error('Invalid rawData provided to PieModel constructor. Required fields: id, name, value, currency.');
    }

    /** @type {number} */
    this.id = rawData.id;
    /** @type {string} */
    this.name = rawData.name;
    /** @type {Date} */
    this.creationDate = rawData.creationDate ? new Date(rawData.creationDate) : null;
    /** @type {Date} */
    this.lastUpdateDate = rawData.lastUpdateDate ? new Date(rawData.lastUpdateDate) : null;
    /** @type {string|null} */
    this.icon = rawData.icon || null;
    /** @type {number|null} */
    this.progress = typeof rawData.progress === 'number' ? rawData.progress : null;
    /** @type {number} */
    this.value = rawData.value;
    /** @type {string} */
    this.currency = rawData.currency;
    /** @type {Array<Object>} */
    this.instruments = rawData.instruments || []; // Assuming instruments is an array of objects

    // New properties from flattened summary data
    /** @type {number|null} */
    this.cash = typeof rawData.cash === 'number' ? rawData.cash : null;
    /** @type {number|null} */
    this.dividendGained = typeof rawData.dividendGained === 'number' ? rawData.dividendGained : null;
    /** @type {number|null} */
    this.dividendInCash = typeof rawData.dividendInCash === 'number' ? rawData.dividendInCash : null;
    /** @type {number|null} */
    this.dividendReinvested = typeof rawData.dividendReinvested === 'number' ? rawData.dividendReinvested : null;
    /** @type {number|null} */
    this.totalInvested = typeof rawData.totalInvested === 'number' ? rawData.totalInvested : null;
    /** @type {number|null} */
    this.totalResult = typeof rawData.totalResult === 'number' ? rawData.totalResult : null;
    /** @type {number|null} */
    this.totalResultCoef = typeof rawData.totalResultCoef === 'number' ? rawData.totalResultCoef : null;
    /** @type {string|null} */
    this.status = typeof rawData.status === 'string' ? rawData.status : null;

    // Perform basic validation
    this.validate();
  }

  /**
   * Validates the pie data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.id !== 'number' || this.id <= 0) {
      throw new Error(`Invalid pie ID: ${this.id}`);
    }
    if (typeof this.name !== 'string' || this.name.trim() === '') {
      throw new Error('Pie name cannot be empty.');
    }
    if (typeof this.value !== 'number' || this.value < 0) {
      throw new Error(`Invalid pie value: ${this.value}`);
    }
    if (typeof this.currency !== 'string' || this.currency.trim().length !== 3) {
      // Basic check for 3-letter currency code
      throw new Error(`Invalid currency code: ${this.currency}`);
    }
    if (this.progress !== null && (typeof this.progress !== 'number' || this.progress < 0 || this.progress > 1)) {
      throw new Error(`Invalid progress value: ${this.progress}. Must be between 0 and 1.`);
    }
    if (this.creationDate && isNaN(this.creationDate.getTime())) {
        throw new Error(`Invalid creation date: ${this.creationDate}`);
    }
    if (this.lastUpdateDate && isNaN(this.lastUpdateDate.getTime())) {
        throw new Error(`Invalid last update date: ${this.lastUpdateDate}`);
    }
    // Add validation for new numeric fields if necessary, e.g. ensuring they are numbers if not null
    if (this.cash !== null && typeof this.cash !== 'number') throw new Error(`Invalid cash value: ${this.cash}`);
    if (this.dividendGained !== null && typeof this.dividendGained !== 'number') throw new Error(`Invalid dividendGained value: ${this.dividendGained}`);
    if (this.dividendInCash !== null && typeof this.dividendInCash !== 'number') throw new Error(`Invalid dividendInCash value: ${this.dividendInCash}`);
    if (this.dividendReinvested !== null && typeof this.dividendReinvested !== 'number') throw new Error(`Invalid dividendReinvested value: ${this.dividendReinvested}`);
    if (this.totalInvested !== null && typeof this.totalInvested !== 'number') throw new Error(`Invalid totalInvested value: ${this.totalInvested}`);
    if (this.totalResult !== null && typeof this.totalResult !== 'number') throw new Error(`Invalid totalResult value: ${this.totalResult}`);
    if (this.totalResultCoef !== null && typeof this.totalResultCoef !== 'number') throw new Error(`Invalid totalResultCoef value: ${this.totalResultCoef}`);
    if (this.status !== null && typeof this.status !== 'string') throw new Error(`Invalid status value: ${this.status}`);
  }

  /**
   * Returns a simple object representation of the pie, suitable for display or storage.
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      creationDate: this.creationDate ? this.creationDate.toISOString() : null,
      lastUpdateDate: this.lastUpdateDate ? this.lastUpdateDate.toISOString() : null,
      icon: this.icon,
      progress: this.progress,
      value: this.value,
      currency: this.currency,
      instrumentsCount: this.instruments.length,
      // Add new properties
      cash: this.cash,
      dividendGained: this.dividendGained,
      dividendInCash: this.dividendInCash,
      dividendReinvested: this.dividendReinvested,
      totalInvested: this.totalInvested,
      totalResult: this.totalResult,
      totalResultCoef: this.totalResultCoef,
      status: this.status,
    };
  }

  /**
   * Returns a representation of the pie suitable for writing to a Google Sheet row.
   * Order of properties should match the sheet columns.
   * @returns {Array<any>}
   */
  toSheetRow() {
    // This order is an example and should be defined by the actual sheet structure
    return [
      this.id,
      this.name,
      this.value,
      this.currency,
      this.progress !== null ? (this.progress * 100).toFixed(2) + '%' : '', // Formatted progress
      this.creationDate ? Utilities.formatDate(this.creationDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : '',
      this.lastUpdateDate ? Utilities.formatDate(this.lastUpdateDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : '',
      this.instruments.length,
      this.icon,
      // Add new properties for sheet row
      this.cash,
      this.dividendGained,
      this.dividendInCash,
      this.dividendReinvested,
      this.totalInvested,
      this.totalResult,
      this.totalResultCoef,
      this.status,
    ];
  }

  /**
   * Creates a PieModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<string>} headers The array of header names corresponding to rowData.
   * @returns {PieModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    const rawData = headers.reduce((obj, header, index) => {
      let value = rowData[index];
      let key = header; // Use header directly as key unless specific transformation is needed

      // Transformations from sheet format to rawData format
      // Standardize header keys to match model properties (e.g., 'Creation Date' -> 'creationDate')
      if (header === 'ID') key = 'id';
      else if (header === 'Name') key = 'name';
      else if (header === 'Value') key = 'value';
      else if (header === 'Currency') key = 'currency';
      else if (header === 'Progress') key = 'progress';
      else if (header === 'Creation Date') key = 'creationDate';
      else if (header === 'Last Update Date') key = 'lastUpdateDate';
      else if (header === 'Instruments Count') key = 'instrumentsCount'; // This is derived, might not be directly set
      else if (header === 'Icon') key = 'icon';
      else if (header === 'Cash') key = 'cash';
      else if (header === 'Dividend Gained') key = 'dividendGained';
      else if (header === 'Dividend In Cash') key = 'dividendInCash';
      else if (header === 'Dividend Reinvested') key = 'dividendReinvested';
      else if (header === 'Total Invested') key = 'totalInvested';
      else if (header === 'Total Result') key = 'totalResult';
      else if (header === 'Total Result Coef') key = 'totalResultCoef';
      else if (header === 'Status') key = 'status';
      // Add other direct mappings if any

      // Type conversions
      if (['id', 'value', 'instrumentsCount', 'cash', 'goal', 'initialInvestment', 
           'dividendGained', 'dividendInCash', 'dividendReinvested', 
           'totalInvested', 'totalResult', 'totalResultCoef'].includes(key)) {
        value = (value === '' || value === null || isNaN(parseFloat(value))) ? null : parseFloat(value);
      } else if (key === 'progress' && typeof value === 'string' && value.endsWith('%')) {
        value = parseFloat(value.replace('%', '')) / 100;
      } else if ((key === 'creationDate' || key === 'lastUpdateDate') && value) {
        const dateVal = new Date(value);
        value = isNaN(dateVal.getTime()) ? null : dateVal.toISOString();
      }
      
      obj[key] = value;
      return obj;
    }, {});

    // Instruments are not typically stored in a flat sheet row in detail.
    // PieModel constructor initializes instruments to [] if not provided.
    // rawData.instrumentsCount is read but rawData.instruments itself is not reconstructed here.
    
    return new PieModel(rawData);
  }

  /**
   * Gets the formatted progress string (e.g., "75.00%").
   * @returns {string} Formatted progress or empty string if not available.
   */
  getFormattedProgress() {
    if (this.progress === null) {
      return '';
    }
    return (this.progress * 100).toFixed(2) + '%';
  }

  /**
   * Gets the formatted value string (e.g., "$1,500.50").
   * This is a basic example; localization and currency symbols might need more robust handling.
   * @returns {string}
   */
  getFormattedValue() {
    // Basic currency formatting, might need a library for proper localization
    const formatter = new Intl.NumberFormat(Session.getScriptTimeZone().replace('_', '-'), { // Or a fixed locale like 'en-US'
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    try {
        return formatter.format(this.value);
    } catch (e) {
        // Fallback if currency code is not supported by Intl.NumberFormat in this environment
        Logger.log(`Currency formatting error for ${this.currency}: ${e.message}. Using fallback.`);
        return `${this.currency} ${this.value.toFixed(2)}`;
    }
  }
}

// For Google Apps Script, if you want to use this class in other .gs files
// without bundling, you might not need explicit exports if it's in the global scope.
// However, if using a bundler or specific module system, you'd export it:
// export { PieModel }; // Example for ES modules
// Or for CommonJS (less common in GAS directly):
// module.exports = PieModel;

// To make it available globally in GAS V8 runtime (if not using modules explicitly)
// this class definition is enough.
// If this file were named PieModel.gs, the class PieModel would be globally available.
// Since it's .js, it depends on how it's included/evaluated.
// For now, assuming it will be made available.
