/**
 * @fileoverview Defines the DividendRepository class for managing dividend data.
 */

// Assuming ApiClient, DividendModel, and SheetManager are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Dividend data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into DividendModel instances. It also handles
 * persisting data to Google Sheets via SheetManager.
 */
class DividendRepository {
  /**
   * Creates an instance of DividendRepository.
   * @param {Trading212ApiClient} apiClient The API client for fetching data.
   * @param {SheetManager} sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} errorHandler The error handler instance.
   * @param {string} [sheetName='Dividends'] The name of the Google Sheet where dividend data is stored.
   */
  constructor(apiClient, sheetManager, errorHandler, sheetName = 'Dividends') {
    if (!apiClient) {
      throw new Error('DividendRepository: apiClient is required.');
    }
    if (!sheetManager) {
      throw new Error('DividendRepository: sheetManager is required.');
    }
    if (!errorHandler) {
      // Attempt to get a default ErrorHandler if not provided, or throw
      if (typeof ErrorHandler !== 'undefined') {
        this.errorHandler = new ErrorHandler('DividendRepository_Default');
        this.errorHandler.log('ErrorHandler not provided to DividendRepository constructor, using default.', 'WARN');
      } else {
        throw new Error('DividendRepository: errorHandler is required and ErrorHandler class is not available.');
      }
    } else {
      /** @private @const {ErrorHandler} */
      this.errorHandler = errorHandler;
    }
    /** @private @const {Trading212ApiClient} */
    this.apiClient = apiClient;
    /** @private @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @private @const {string} */
    this.sheetName = sheetName;
    /** @private @const {Array<string>} */
    this.sheetHeaders = ['ID', 'Type', 'Ticker', 'Timestamp', 'Amount Value', 'Amount Currency', 'Quantity', 'Tax Amount', 'Tax Currency', 'Source Transaction ID'];
    
    this.sheetManager.ensureSheetExists(this.sheetName);
    this.sheetManager.setHeaders(this.sheetName, this.sheetHeaders);
  }

  /**
   * Fetches all dividends from the API.
   * API client might require date range or pagination. This is a simplified version.
   * @param {Date} [startDate] Optional start date for fetching dividends.
   * @param {Date} [endDate] Optional end date for fetching dividends.
   * @param {number} [limit] Optional limit on the number of dividends to fetch.
   * @returns {Promise<Array<DividendModel>>} A promise that resolves to an array of DividendModel instances.
   */
  async fetchAllDividends(startDate, endDate, limit) {
    try {
      // Assuming apiClient.getDividends can take optional parameters
      // This might be part of getTransactions with type 'DIVIDEND' or a separate endpoint.
      // For this example, let's assume a dedicated getDividends method exists.
      // If not, this method would filter results from getTransactions.
      const rawDividendsData = await this.apiClient.getDividends({ startDate, endDate, limit });
      if (!Array.isArray(rawDividendsData)) {
        Logger.log(`Expected an array from apiClient.getDividends(), but got: ${typeof rawDividendsData}`);
        throw new Error('Invalid data format received from API for dividends.');
      }
      return rawDividendsData.map(rawDividend => new DividendModel(rawDividend));
    } catch (error) {
      this.errorHandler.logError(error, 'Failed to fetch all dividends from API. Error will be re-thrown.');
      throw error; // Re-throw
    }
  }
  
  /**
   * Fetches recent dividends from the API.
   * @param {number} [limit=50] The maximum number of recent dividends to fetch.
   * @returns {Promise<Array<DividendModel>>}
   */
  async getRecentDividends(limit = 50) {
    return this.fetchAllDividends(undefined, undefined, limit);
  }

  /**
   * Saves an array of DividendModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<DividendModel>} dividends An array of DividendModel instances to save.
   * @returns {Promise<void>}
   */
  async saveDividendsToSheet(dividends) {
    if (!Array.isArray(dividends) || !dividends.every(d => d instanceof DividendModel)) {
      throw new Error('Invalid input: dividends must be an array of DividendModel instances.');
    }
    try {
      const dataRows = dividends.map(dividend => dividend.toSheetRow());
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, this.sheetHeaders);
      this.errorHandler.log(`${dividends.length} dividends saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this.errorHandler.logError(error, 'Failed to save dividends to Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
    }
  }
  
  /**
   * Fetches all dividends from the API (optionally filtered) and saves them to the Google Sheet.
   * @param {Date} [startDate] Optional start date.
   * @param {Date} [endDate] Optional end date.
   * @param {number} [limit] Optional limit.
   * @returns {Promise<Array<DividendModel>>}
   */
  async fetchAndSaveAllDividends(startDate, endDate, limit) {
    const dividends = await this.fetchAllDividends(startDate, endDate, limit);
    if (dividends.length > 0) {
      await this.saveDividendsToSheet(dividends);
    } else {
      Logger.log('No dividends fetched from API, sheet not updated.');
      // Optionally clear the sheet if no dividends are found
      // await this.sheetManager.updateSheetData(this.sheetName, [], this.sheetHeaders);
    }
    return dividends;
  }

  /**
   * Retrieves all dividends from the Google Sheet.
   * @returns {Promise<Array<DividendModel>>} A promise that resolves to an array of DividendModel instances.
   */
  async getAllDividendsFromSheet() {
    try {
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return dataRows.map(row => DividendModel.fromSheetRow(row, this.sheetHeaders));
    } catch (error) {
      this.errorHandler.logError(error, 'Failed to retrieve dividends from Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
    }
  }

  /**
   * Retrieves dividends from the sheet for a specific ticker.
   * @param {string} ticker The stock ticker to filter by.
   * @returns {Promise<Array<DividendModel>>}
   */
  async getDividendsByTickerFromSheet(ticker) {
    try {
      const allDividends = await this.getAllDividendsFromSheet();
      return allDividends.filter(div => div.ticker.toUpperCase() === ticker.toUpperCase());
    } catch (error) {
      this.errorHandler.logError(error, `Error retrieving dividends for ticker ${ticker} from sheet. Error will be re-thrown.`);
      throw error; // Re-throw
    }
  }
}

// Global availability for GAS V8 runtime
