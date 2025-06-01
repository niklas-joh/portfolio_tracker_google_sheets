/**
 * @fileoverview Defines the OrderModel class, representing a trading order.
 */

/**
 * Represents a trading order (e.g., market, limit, stop).
 * This class is responsible for parsing raw API data for an order,
 * validating it, and providing methods for data transformation.
 */
class OrderModel {
  /**
   * Creates an instance of OrderModel.
   * @param {Object} rawData Raw data object for an order.
   * @param {string} rawData.id The unique identifier of the order.
   * @param {string} rawData.type The type of order (e.g., "MARKET", "LIMIT", "STOP").
   * @param {string} rawData.status The current status of the order (e.g., "FILLED", "PENDING", "CANCELED").
   * @param {string} rawData.ticker The ticker symbol of the instrument.
   * @param {number} rawData.quantity The quantity of shares/units in the order.
   * @param {number} rawData.price The price at which the order was executed or placed.
   * @param {string} rawData.currency The currency of the order.
   * @param {string} rawData.timestamp ISO string representing the creation/execution date and time.
   * @param {string} [rawData.timeInForce] The time in force for the order (e.g., "DAY", "GTC").
   * @param {string} [rawData.parentId] The ID of the parent order, if applicable.
   */
  constructor(rawData) {
    if (!rawData || !rawData.id || !rawData.type || !rawData.status || !rawData.ticker || typeof rawData.quantity === 'undefined' || typeof rawData.price === 'undefined' || !rawData.currency || !rawData.timestamp) {
      throw new Error('Invalid rawData provided to OrderModel constructor. Required fields: id, type, status, ticker, quantity, price, currency, timestamp.');
    }

    /** @type {string} */
    this.id = rawData.id;
    /** @type {string} */
    this.type = rawData.type;
    /** @type {string} */
    this.status = rawData.status;
    /** @type {string} */
    this.ticker = rawData.ticker;
    /** @type {number} */
    this.quantity = rawData.quantity;
    /** @type {number} */
    this.price = rawData.price;
    /** @type {string} */
    this.currency = rawData.currency;
    /** @type {Date} */
    this.timestamp = new Date(rawData.timestamp);
    /** @type {string|null} */
    this.timeInForce = rawData.timeInForce || null;
    /** @type {string|null} */
    this.parentId = rawData.parentId || null;

    this.validate();
  }

  /**
   * Validates the order data.
   * @throws {Error} If validation fails.
   */
  validate() {
    if (typeof this.id !== 'string' || this.id.trim() === '') {
      throw new Error('Order ID cannot be empty.');
    }
    if (typeof this.type !== 'string' || this.type.trim() === '') {
      throw new Error('Order type cannot be empty.');
    }
    if (typeof this.status !== 'string' || this.status.trim() === '') {
      throw new Error('Order status cannot be empty.');
    }
    if (typeof this.ticker !== 'string' || this.ticker.trim() === '') {
      throw new Error('Order ticker cannot be empty.');
    }
    if (typeof this.quantity !== 'number' || this.quantity <= 0) {
      throw new Error(`Invalid quantity: ${this.quantity}. Must be positive.`);
    }
    if (typeof this.price !== 'number' || this.price <= 0) {
      throw new Error(`Invalid price: ${this.price}. Must be positive.`);
    }
    if (typeof this.currency !== 'string' || this.currency.trim().length !== 3) {
      throw new Error(`Invalid order currency: ${this.currency}`);
    }
    if (isNaN(this.timestamp.getTime())) {
      throw new Error(`Invalid order timestamp: ${this.timestamp}`);
    }
  }

  /**
   * Returns a simple object representation of the order.
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      ticker: this.ticker,
      quantity: this.quantity,
      price: this.price,
      currency: this.currency,
      timestamp: this.timestamp.toISOString(),
      timeInForce: this.timeInForce,
      parentId: this.parentId,
    };
  }

  /**
   * Returns a representation of the order suitable for writing to a Google Sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers Array of header definitions.
   * @returns {Array<any>}
   */
  toSheetRow(headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('OrderModel.toSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawObject = this.toObject();
    
    return headers.map(header => {
      try {
        let value = resolveNestedField(rawObject, header.originalPath);
        // Apply special formatting for timestamp field
        if (header.originalPath === 'timestamp' && value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
          }
        }
        return value;
      } catch (e) {
        Logger.log(`Error resolving field ${header.originalPath} for OrderModel: ${e.message}`);
        return '';
      }
    });
  }

  /**
   * Creates an OrderModel instance from a Google Sheet row.
   * @param {Array<any>} rowData The array of data from a sheet row.
   * @param {Array<{originalPath: string, transformedName: string}>} headers The array of header definitions.
   * @returns {OrderModel}
   * @static
   */
  static fromSheetRow(rowData, headers) {
    if (!headers || !Array.isArray(headers)) {
      throw new Error('OrderModel.fromSheetRow requires a valid headers array with originalPath and transformedName properties.');
    }
    
    const rawData = {};
    
    headers.forEach((header, index) => {
      const path = header.originalPath;
      let value = rowData[index];
      if (value === '' || value === null || value === undefined) {
        value = null;
      } else if (['quantity', 'price'].includes(path)) {
        value = !isNaN(parseFloat(value)) ? parseFloat(value) : null;
      } else if (path === 'timestamp' && value) {
        const dateVal = new Date(value);
        value = isNaN(dateVal.getTime()) ? null : dateVal.toISOString();
      }
      setNestedProperty(rawData, path, value);
    });
    
    return new OrderModel(rawData);
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
      'status',
      'ticker',
      'quantity',
      'price',
      'currency',
      'timestamp',
      'timeInForce',
      'parentId'
    ];
  }
}
