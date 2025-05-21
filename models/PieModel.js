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
      instrumentsCount: this.instruments.length, // Example of a calculated/derived property
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
      // Basic transformations from sheet format to rawData format
      if (header === 'id' || header === 'value' || header === 'instrumentsCount') {
        value = parseFloat(value);
      } else if (header === 'progress' && typeof value === 'string' && value.endsWith('%')) {
        value = parseFloat(value.replace('%', '')) / 100;
      } else if ((header === 'creationDate' || header === 'lastUpdateDate') && value) {
        value = new Date(value).toISOString();
      }
      obj[header] = value;
      return obj;
    }, {});

    // Instruments are not typically stored in a flat sheet row in detail,
    // so we might initialize it as empty or handle it differently.
    // For now, assuming instruments are not directly reconstructed from a simple row.
    rawData.instruments = [];

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
