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
   * @returns {Array<any>}
   */
  toSheetRow() {
    // Order should match the sheet columns for dividends
    return [
      this.id,
      this.type, // Including type for consistency with TransactionModel if they share a sheet
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

  /**
   * Creates a DividendModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<string>} headers The array of header names corresponding to rowData.
   * @returns {DividendModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    const raw = headers.reduce((obj, header, index) => {
      obj[header] = rowData[index];
      return obj;
    }, {});

    // Reconstruct the 'amount' object for the constructor
    const rawData = {
      id: raw.id,
      ticker: raw.ticker,
      timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : null,
      amount: {
        value: raw.amountValue !== '' && raw.amountValue !== null ? parseFloat(raw.amountValue) : null,
        currency: raw.amountCurrency,
      },
      quantity: raw.quantity !== '' && raw.quantity !== null ? parseFloat(raw.quantity) : null,
      taxAmount: raw.taxAmount !== '' && raw.taxAmount !== null ? parseFloat(raw.taxAmount) : null,
      taxCurrency: raw.taxCurrency,
      sourceTransactionId: raw.sourceTransactionId,
    };
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
}

// Global availability for GAS V8 runtime
