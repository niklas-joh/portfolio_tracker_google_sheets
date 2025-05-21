/**
 * @fileoverview Defines the DividendModel class, representing a dividend payment.
 */

/**
 * Represents a dividend payment received from an instrument.
 * This class is responsible for parsing raw API data for a dividend,
 * validating it, and providing methods for data transformation.
 */
class DividendModel {
  /**
   * Creates an instance of DividendModel.
   * @param {Object} rawData Raw data object for a dividend.
   * @param {string} rawData.id The unique identifier of the dividend transaction.
   * @param {string} rawData.ticker The stock ticker symbol of the instrument that paid the dividend.
   * @param {string} rawData.timestamp ISO string representing the date and time the dividend was paid.
   * @param {Object} rawData.amount Details of the dividend amount.
   * @param {number} rawData.amount.value The net amount of the dividend received.
   * @param {string} rawData.amount.currency The currency of the dividend amount.
   * @param {number} [rawData.quantity] The number of shares held that generated this dividend.
   * @param {number} [rawData.taxAmount] The amount of tax deducted, if any.
   * @param {string} [rawData.taxCurrency] The currency of the tax amount.
   * @param {string} [rawData.sourceTransactionId] ID of the original transaction that might be related (e.g. a specific buy order).
   */
  constructor(rawData) {
    if (!rawData || !rawData.id || !rawData.ticker || !rawData.timestamp || !rawData.amount || typeof rawData.amount.value === 'undefined' || !rawData.amount.currency) {
      throw new Error('Invalid rawData provided to DividendModel constructor. Required fields: id, ticker, timestamp, amount (with value and currency).');
    }

    /** @type {string} */
    this.id = rawData.id;
    /** @type {string} */
    this.ticker = rawData.ticker;
    /** @type {Date} */
    this.timestamp = new Date(rawData.timestamp);
    /** @type {number} */
    this.amountValue = rawData.amount.value;
    /** @type {string} */
    this.amountCurrency = rawData.amount.currency;
    /** @type {number|null} */
    this.quantity = typeof rawData.quantity === 'number' ? rawData.quantity : null;
    /** @type {number|null} */
    this.taxAmount = typeof rawData.taxAmount === 'number' ? rawData.taxAmount : null;
    /** @type {string|null} */
    this.taxCurrency = rawData.taxCurrency || null;
    /** @type {string|null} */
    this.sourceTransactionId = rawData.sourceTransactionId || null;
    /** @const @type {string} */
    this.type = 'DIVIDEND'; // Dividend transactions have a fixed type

    this.validate();
  }

  /**
   * Validates the dividend data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.id !== 'string' || this.id.trim() === '') {
      throw new Error('Dividend ID cannot be empty.');
    }
    if (typeof this.ticker !== 'string' || this.ticker.trim() === '') {
      throw new Error('Dividend ticker cannot be empty.');
    }
    if (isNaN(this.timestamp.getTime())) {
      throw new Error(`Invalid dividend timestamp: ${this.timestamp}`);
    }
    if (typeof this.amountValue !== 'number' || this.amountValue <= 0) {
      // Dividends should generally be positive
      throw new Error(`Invalid dividend amount value: ${this.amountValue}. Must be positive.`);
    }
    if (typeof this.amountCurrency !== 'string' || this.amountCurrency.trim().length !== 3) {
      throw new Error(`Invalid dividend amount currency: ${this.amountCurrency}`);
    }
    if (this.quantity !== null && (typeof this.quantity !== 'number' || this.quantity <= 0)) {
      throw new Error(`Invalid quantity for dividend: ${this.quantity}. Must be positive if provided.`);
    }
    if (this.taxAmount !== null && typeof this.taxAmount !== 'number') {
      // Tax can be zero
      throw new Error(`Invalid tax amount: ${this.taxAmount}.`);
    }
    if (this.taxCurrency !== null && (typeof this.taxCurrency !== 'string' || this.taxCurrency.trim().length !== 3)) {
      throw new Error(`Invalid tax currency: ${this.taxCurrency}`);
    }
    if (this.taxAmount !== null && this.taxCurrency === null) {
      throw new Error('Tax currency must be provided if tax amount is present.');
    }
  }

  /**
   * Returns a simple object representation of the dividend.
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      type: this.type,
      ticker: this.ticker,
      timestamp: this.timestamp.toISOString(),
      amount: {
        value: this.amountValue,
        currency: this.amountCurrency,
      },
      quantity: this.quantity,
      taxAmount: this.taxAmount,
      taxCurrency: this.taxCurrency,
      sourceTransactionId: this.sourceTransactionId,
    };
  }

  /**
   * Returns a representation of the dividend suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} [headers] Optional array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers) {
      // Fallback to old behavior if no headers provided
      return [
        this.id,
        this.type,
        this.ticker,
        Utilities.formatDate(this.timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
        this.amountValue,
        this.amountCurrency,
        this.quantity,
        this.taxAmount,
        this.taxCurrency,
        this.sourceTransactionId,
      ];
    }
    
    // Create an object structure matching the original API response
    const rawObject = this.toObject();
    
    // Map each header to a value using the originalPath
    return headers.map(header => {
      try {
        return resolveNestedField(rawObject, header.originalPath);
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for DividendModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates a DividendModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {DividendModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    // If headers is an array of strings (old format), convert to expected format
    if (headers && headers.length > 0 && typeof headers[0] === 'string') {
      const headerNames = headers;
      const raw = headerNames.reduce((obj, header, index) => {
        obj[header] = rowData[index];
        return obj;
      }, {});

      // Reconstruct the 'amount' object for the constructor using the old format
      const rawData = {
        id: raw.ID || raw.id,
        ticker: raw.Ticker || raw.ticker,
        timestamp: raw.Timestamp || raw.timestamp ? new Date(raw.Timestamp || raw.timestamp).toISOString() : null,
        amount: {
          value: (raw['Amount Value'] || raw.amountValue) !== '' && (raw['Amount Value'] || raw.amountValue) !== null 
            ? parseFloat(raw['Amount Value'] || raw.amountValue) : null,
          currency: raw['Amount Currency'] || raw.amountCurrency,
        },
        quantity: (raw.Quantity || raw.quantity) !== '' && (raw.Quantity || raw.quantity) !== null 
          ? parseFloat(raw.Quantity || raw.quantity) : null,
        taxAmount: (raw['Tax Amount'] || raw.taxAmount) !== '' && (raw['Tax Amount'] || raw.taxAmount) !== null 
          ? parseFloat(raw['Tax Amount'] || raw.taxAmount) : null,
        taxCurrency: raw['Tax Currency'] || raw.taxCurrency,
        sourceTransactionId: raw['Source Transaction ID'] || raw.sourceTransactionId,
      };
      return new DividendModel(rawData);
    }
    
    // New format with dynamic headers
    const rawData = {};
    
    // Handle nested properties based on header paths
    headers.forEach((header, index) => {
      setNestedProperty(rawData, header.originalPath, rowData[index]);
    });
    
    // Ensure proper types for numeric fields
    if (rawData.amount && rawData.amount.value !== undefined && rawData.amount.value !== null) {
      rawData.amount.value = parseFloat(rawData.amount.value);
    }
    
    if (rawData.quantity !== undefined && rawData.quantity !== null) {
      rawData.quantity = parseFloat(rawData.quantity);
    }
    
    if (rawData.taxAmount !== undefined && rawData.taxAmount !== null) {
      rawData.taxAmount = parseFloat(rawData.taxAmount);
    }
    
    // Note: 'type' is fixed for DividendModel, so not taken from sheet row for constructor logic.
    return new DividendModel(rawData);
  }

  /**
   * Gets the formatted dividend amount string.
   * @returns {string}
   */
  getFormattedAmount() {
    const formatter = new Intl.NumberFormat(Session.getScriptTimeZone().replace('_', '-'), {
      style: 'currency',
      currency: this.amountCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
     try {
      return formatter.format(this.amountValue);
    } catch (e) {
      Logger.log(`Currency formatting error for ${this.amountCurrency}: ${e.message}. Using fallback.`);
      return `${this.amountCurrency} ${this.amountValue.toFixed(2)}`;
    }
  }

  /**
   * Gets the formatted tax amount string, if applicable.
   * @returns {string|null}
   */
  getFormattedTaxAmount() {
    if (this.taxAmount === null || this.taxCurrency === null) {
      return null;
    }
    const formatter = new Intl.NumberFormat(Session.getScriptTimeZone().replace('_', '-'), {
      style: 'currency',
      currency: this.taxCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    try {
      return formatter.format(this.taxAmount);
    } catch (e) {
      Logger.log(`Currency formatting error for ${this.taxCurrency}: ${e.message}. Using fallback.`);
      return `${this.taxCurrency} ${this.taxAmount.toFixed(2)}`;
    }
  }
  
  /**
   * Returns an array of all expected API field paths for this model.
   * Used by HeaderMappingService and BaseRepository as a fallback when API response is not available.
   * @returns {Array<string>} Array of field paths.
   * @static
   */
  static getExpectedApiFieldPaths() {
    return [
      'id',
      'type',
      'ticker',
      'timestamp',
      'amount.value',
      'amount.currency',
      'quantity',
      'taxAmount',
      'taxCurrency',
      'sourceTransactionId'
    ];
  }
}

// Global availability for GAS V8 runtime
