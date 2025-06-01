/**
 * @fileoverview Defines the AccountInfoModel class, representing general account information.
 */

/**
 * Represents general account information from the Trading212 API.
 * This class is responsible for parsing raw API data for account info,
 * validating it, and providing methods for data transformation.
 */
class AccountInfoModel {
  /**
   * Creates an instance of AccountInfoModel.
   * @param {Object} rawData Raw data object for account information.
   * @param {string} rawData.accountId The unique identifier for the account.
   * @param {string} rawData.accountNumber The account number.
   * @param {string} rawData.currency The base currency of the account.
   * @param {number} rawData.balance The total balance of the account.
   * @param {number} rawData.equity The current equity of the account.
   * @param {number} rawData.freeMargin The free margin available in the account.
   * @param {string} [rawData.accountType] The type of account (e.g., 'INVEST', 'ISA', 'CFD').
   * @param {string} [rawData.status] The status of the account (e.g., 'ACTIVE').
   */
  constructor(rawData) {
    if (!rawData || !rawData.accountId || !rawData.accountNumber || !rawData.currency || typeof rawData.balance === 'undefined' || typeof rawData.equity === 'undefined' || typeof rawData.freeMargin === 'undefined') {
      throw new Error('Invalid rawData provided to AccountInfoModel constructor. Required fields: accountId, accountNumber, currency, balance, equity, freeMargin.');
    }

    /** @type {string} */
    this.accountId = rawData.accountId;
    /** @type {string} */
    this.accountNumber = rawData.accountNumber;
    /** @type {string} */
    this.currency = rawData.currency;
    /** @type {number} */
    this.balance = rawData.balance;
    /** @type {number} */
    this.equity = rawData.equity;
    /** @type {number} */
    this.freeMargin = rawData.freeMargin;
    /** @type {string|null} */
    this.accountType = rawData.accountType || null;
    /** @type {string|null} */
    this.status = rawData.status || null;

    this.validate();
  }

  /**
   * Validates the account info data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.accountId !== 'string' || this.accountId.trim() === '') {
      throw new Error('Account ID cannot be empty.');
    }
    if (typeof this.accountNumber !== 'string' || this.accountNumber.trim() === '') {
      throw new Error('Account number cannot be empty.');
    }
    if (typeof this.currency !== 'string' || this.currency.trim().length !== 3) {
      throw new Error(`Invalid account currency: ${this.currency}`);
    }
    if (typeof this.balance !== 'number') {
      throw new Error(`Invalid balance value: ${this.balance}`);
    }
    if (typeof this.equity !== 'number') {
      throw new Error(`Invalid equity value: ${this.equity}`);
    }
    if (typeof this.freeMargin !== 'number') {
      throw new Error(`Invalid free margin value: ${this.freeMargin}`);
    }
  }

  /**
   * Returns a simple object representation of the account info.
   * @returns {Object}
   */
  toObject() {
    return {
      accountId: this.accountId,
      accountNumber: this.accountNumber,
      currency: this.currency,
      balance: this.balance,
      equity: this.equity,
      freeMargin: this.freeMargin,
      accountType: this.accountType,
      status: this.status,
    };
  }

  /**
   * Returns a representation of the account info suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers Array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('AccountInfoModel.toSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawObject = this.toObject();
    
    return headers.map(header => {
      try {
        return resolveNestedField(rawObject, header.originalPath);
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for AccountInfoModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates an AccountInfoModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {AccountInfoModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('AccountInfoModel.fromSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawData = {};
    
    headers.forEach((header, index) => {
      const path = header.originalPath;
      let value = rowData[index];
      if (value === '' || value === null || value === undefined) {
        value = null;
      } else if (['balance', 'equity', 'freeMargin'].includes(path)) {
        value = !isNaN(parseFloat(value)) ? parseFloat(value) : null;
      }
      setNestedProperty(rawData, path, value);
    });
    
    return new AccountInfoModel(rawData);
  }

  /**
   * Returns an array of all expected API field paths for this model.
   * Used by HeaderMappingService and BaseRepository as a fallback when API response is not available.
   * @returns {Array<string>} Array of field paths.
   * @static
   */
  static getExpectedApiFieldPaths() {
    return [
      'accountId',
      'accountNumber',
      'currency',
      'balance',
      'equity',
      'freeMargin',
      'accountType',
      'status'
    ];
  }
}
