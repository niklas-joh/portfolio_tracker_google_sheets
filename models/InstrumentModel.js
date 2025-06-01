/**
 * @fileoverview Defines the InstrumentModel class, representing a financial instrument.
 */

/**
 * Represents a financial instrument (e.g., stock, ETF, crypto).
 * This class is responsible for parsing raw API data for an instrument,
 * validating it, and providing methods for data transformation.
 */
class InstrumentModel {
  /**
   * Creates an instance of InstrumentModel.
   * @param {Object} rawData Raw data object for an instrument.
   * @param {string} rawData.ticker The ticker symbol of the instrument.
   * @param {string} rawData.name The full name of the instrument.
   * @param {string} rawData.currency The trading currency of the instrument.
   * @param {string} rawData.exchange The exchange where the instrument is traded.
   * @param {string} rawData.type The type of instrument (e.g., 'STOCK', 'ETF', 'CRYPTO').
   * @param {string} [rawData.isin] The ISIN of the instrument.
   * @param {string} [rawData.country] The country of the instrument.
   */
  constructor(rawData) {
    if (!rawData || !rawData.ticker || !rawData.name || !rawData.currency || !rawData.exchange || !rawData.type) {
      throw new Error('Invalid rawData provided to InstrumentModel constructor. Required fields: ticker, name, currency, exchange, type.');
    }

    /** @type {string} */
    this.ticker = rawData.ticker;
    /** @type {string} */
    this.name = rawData.name;
    /** @type {string} */
    this.currency = rawData.currency;
    /** @type {string} */
    this.exchange = rawData.exchange;
    /** @type {string} */
    this.type = rawData.type;
    /** @type {string|null} */
    this.isin = rawData.isin || null;
    /** @type {string|null} */
    this.country = rawData.country || null;

    this.validate();
  }

  /**
   * Validates the instrument data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.ticker !== 'string' || this.ticker.trim() === '') {
      throw new Error('Instrument ticker cannot be empty.');
    }
    if (typeof this.name !== 'string' || this.name.trim() === '') {
      throw new Error('Instrument name cannot be empty.');
    }
    if (typeof this.currency !== 'string' || this.currency.trim().length !== 3) {
      throw new Error(`Invalid instrument currency: ${this.currency}`);
    }
    if (typeof this.exchange !== 'string' || this.exchange.trim() === '') {
      throw new Error('Instrument exchange cannot be empty.');
    }
    if (typeof this.type !== 'string' || this.type.trim() === '') {
      throw new Error('Instrument type cannot be empty.');
    }
  }

  /**
   * Returns a simple object representation of the instrument.
   * @returns {Object}
   */
  toObject() {
    return {
      ticker: this.ticker,
      name: this.name,
      currency: this.currency,
      exchange: this.exchange,
      type: this.type,
      isin: this.isin,
      country: this.country,
    };
  }

  /**
   * Returns a representation of the instrument suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers Array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('InstrumentModel.toSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawObject = this.toObject();
    
    return headers.map(header => {
      try {
        return resolveNestedField(rawObject, header.originalPath);
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for InstrumentModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates an InstrumentModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {InstrumentModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('InstrumentModel.fromSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawData = {};
    
    headers.forEach((header, index) => {
      let value = rowData[index];
      if (value === '' || value === null || value === undefined) {
        value = null;
      }
      setNestedProperty(rawData, header.originalPath, value);
    });
    
    return new InstrumentModel(rawData);
  }

  /**
   * Returns an array of all expected API field paths for this model.
   * Used by HeaderMappingService and BaseRepository as a fallback when API response is not available.
   * @returns {Array<string>} Array of field paths.
   * @static
   */
  static getExpectedApiFieldPaths() {
    return [
      'ticker',
      'name',
      'currency',
      'exchange',
      'type',
      'isin',
      'country'
    ];
  }
}
