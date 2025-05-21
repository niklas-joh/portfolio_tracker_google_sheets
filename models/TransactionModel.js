/**
 * @fileoverview Defines the TransactionModel class, representing a financial transaction.
 */

/**
 * Represents a financial transaction (e.g., buy, sell, deposit, withdrawal).
 * This class is responsible for parsing raw API data for a transaction,
 * validating it, and providing methods for data transformation.
 */
class TransactionModel {
  /**
   * Creates an instance of TransactionModel.
   * @param {Object} rawData Raw data object for a transaction.
   * @param {string} rawData.id The unique identifier of the transaction.
   * @param {string} rawData.type The type of transaction (e.g., "BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND").
   * @param {string} rawData.timestamp ISO string representing the date and time of the transaction.
   * @param {Object} rawData.amount Details of the transaction amount.
   * @param {number} rawData.amount.value The monetary value of the transaction.
   * @param {string} rawData.amount.currency The currency of the transaction amount.
   * @param {string} [rawData.ticker] The stock ticker symbol, if applicable (e.g., for BUY/SELL).
   * @param {number} [rawData.quantity] The number of shares, if applicable.
   * @param {number} [rawData.pricePerShare] The price per share, if applicable.
   * @param {string} [rawData.notes] Additional notes or description for the transaction.
   * @param {string} [rawData.referenceId] A reference ID, e.g., for linking to an order.
   * @param {string} [rawData.source] The source of the transaction, e.g. "PIE_REBALANCE"
   */
  constructor(rawData) {
    if (!rawData || !rawData.id || !rawData.type || !rawData.timestamp || !rawData.amount || typeof rawData.amount.value === 'undefined' || !rawData.amount.currency) {
      throw new Error('Invalid rawData provided to TransactionModel constructor. Required fields: id, type, timestamp, amount (with value and currency).');
    }

    /** @type {string} */
    this.id = rawData.id;
    /** @type {string} */
    this.type = rawData.type.toUpperCase(); // Standardize type to uppercase
    /** @type {Date} */
    this.timestamp = new Date(rawData.timestamp);
    /** @type {number} */
    this.amountValue = rawData.amount.value;
    /** @type {string} */
    this.amountCurrency = rawData.amount.currency;
    /** @type {string|null} */
    this.ticker = rawData.ticker || null;
    /** @type {number|null} */
    this.quantity = typeof rawData.quantity === 'number' ? rawData.quantity : null;
    /** @type {number|null} */
    this.pricePerShare = typeof rawData.pricePerShare === 'number' ? rawData.pricePerShare : null;
    /** @type {string|null} */
    this.notes = rawData.notes || null;
    /** @type {string|null} */
    this.referenceId = rawData.referenceId || null;
    /** @type {string|null} */
    this.source = rawData.source || null;

    this.validate();
  }

  /**
   * Validates the transaction data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.id !== 'string' || this.id.trim() === '') {
      throw new Error('Transaction ID cannot be empty.');
    }
    if (typeof this.type !== 'string' || this.type.trim() === '') {
      throw new Error('Transaction type cannot be empty.');
    }
    if (isNaN(this.timestamp.getTime())) {
      throw new Error(`Invalid transaction timestamp: ${this.timestamp}`);
    }
    if (typeof this.amountValue !== 'number') {
      // Allow zero or negative for certain transaction types (e.g. withdrawal, fees)
      throw new Error(`Invalid transaction amount value: ${this.amountValue}`);
    }
    if (typeof this.amountCurrency !== 'string' || this.amountCurrency.trim().length !== 3) {
      throw new Error(`Invalid transaction amount currency: ${this.amountCurrency}`);
    }

    // Type-specific validations
    if (['BUY', 'SELL'].includes(this.type)) {
      if (!this.ticker || typeof this.ticker !== 'string' || this.ticker.trim() === '') {
        throw new Error(`Ticker is required for ${this.type} transactions.`);
      }
      if (this.quantity === null || typeof this.quantity !== 'number' || this.quantity <= 0) {
        throw new Error(`Valid quantity is required for ${this.type} transactions.`);
      }
      if (this.pricePerShare === null || typeof this.pricePerShare !== 'number' || this.pricePerShare <= 0) {
        throw new Error(`Valid pricePerShare is required for ${this.type} transactions.`);
      }
    }
  }

  /**
   * Returns a simple object representation of the transaction.
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      amount: {
        value: this.amountValue,
        currency: this.amountCurrency,
      },
      ticker: this.ticker,
      quantity: this.quantity,
      pricePerShare: this.pricePerShare,
      notes: this.notes,
      referenceId: this.referenceId,
      source: this.source,
    };
  }

  /**
   * Returns a representation of the transaction suitable for writing to a Google Sheet row.
   * @returns {Array<any>}
   */
  toSheetRow() {
    // Order should match the sheet columns for transactions
    return [
      this.id,
      this.type,
      Utilities.formatDate(this.timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      this.amountValue,
      this.amountCurrency,
      this.ticker,
      this.quantity,
      this.pricePerShare,
      this.notes,
      this.referenceId,
      this.source,
    ];
  }

  /**
   * Creates a TransactionModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<string>} headers The array of header names corresponding to rowData.
   * @returns {TransactionModel}
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
      type: raw.type,
      timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : null, // Ensure ISO string
      amount: {
        value: raw.amountValue !== '' && raw.amountValue !== null ? parseFloat(raw.amountValue) : null,
        currency: raw.amountCurrency,
      },
      ticker: raw.ticker,
      quantity: raw.quantity !== '' && raw.quantity !== null ? parseFloat(raw.quantity) : null,
      pricePerShare: raw.pricePerShare !== '' && raw.pricePerShare !== null ? parseFloat(raw.pricePerShare) : null,
      notes: raw.notes,
      referenceId: raw.referenceId,
      source: raw.source,
    };
    return new TransactionModel(rawData);
  }

  /**
   * Gets the formatted transaction amount string.
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
}

// Global availability for GAS V8 runtime
