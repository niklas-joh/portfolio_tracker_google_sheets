/**
 * @fileoverview Defines the AccountCashModel class, representing cash balance information.
 */

/**
 * Represents cash balance details for a specific currency from the Trading212 API.
 * This class is responsible for parsing raw API data for cash balance,
 * validating it, and providing methods for data transformation.
 */
class AccountCashModel {
  /**
   * Creates an instance of AccountCashModel.
   * @param {Object} rawData Raw data object for cash balance.
   * @param {string} rawData.currency The currency code (e.g., "EUR", "USD").
   * @param {number} rawData.amount The total cash amount in this currency.
   * @param {number} rawData.blockedAmount The amount of cash blocked in this currency.
   */
  constructor(rawData) {
    if (!rawData || !rawData.currency || typeof rawData.amount === 'undefined' || typeof rawData.blockedAmount === 'undefined') {
      throw new Error('Invalid rawData provided to AccountCashModel constructor. Required fields: currency, amount, blockedAmount.');
    }

    /** @type {string} */
    this.currency = rawData.currency;
    /** @type {number} */
    this.amount = rawData.amount;
    /** @type {number} */
    this.blockedAmount = rawData.blockedAmount;

    this.validate();
  }

  /**
   * Validates the account cash data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.currency !== 'string' || this.currency.trim().length !== 3) {
      throw new Error(`Invalid currency code: ${this.currency}`);
    }
    if (typeof this.amount !== 'number') {
      throw new Error(`Invalid amount value: ${this.amount}`);
    }
    if (typeof this.blockedAmount !== 'number') {
      throw new Error(`Invalid blockedAmount value: ${this.blockedAmount}`);
    }
  }

  /**
   * Returns a simple object representation of the account cash.
   * @returns {Object}
   */
  toObject() {
    return {
      currency: this.currency,
      amount: this.amount,
      blockedAmount: this.blockedAmount,
    };
  }

  /**
   * Returns a representation of the account cash suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers Array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('AccountCashModel.toSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawObject = this.toObject();
    
    return headers.map(header => {
      try {
        return resolveNestedField(rawObject, header.originalPath);
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for AccountCashModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates an AccountCashModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {AccountCashModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('AccountCashModel.fromSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawData = {};
    
    headers.forEach((header, index) => {
      const path = header.originalPath;
      let value = rowData[index];
      if (value === '' || value === null || value === undefined) {
        value = null;
      } else if (['amount', 'blockedAmount'].includes(path)) {
        value = !isNaN(parseFloat(value)) ? parseFloat(value) : null;
      }
      setNestedProperty(rawData, path, value);
    });
    
    return new AccountCashModel(rawData);
  }

  /**
   * Returns an array of all expected API field paths for this model.
   * Used by HeaderMappingService and BaseRepository as a fallback when API response is not available.
   * @returns {Array<string>} Array of field paths.
   * @static
   */
  static getExpectedApiFieldPaths() {
    return [
      'currency',
      'amount',
      'blockedAmount'
    ];
  }
}
