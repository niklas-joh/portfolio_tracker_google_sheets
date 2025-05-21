/**
 * @fileoverview Defines the TransactionRepository class for managing transaction data.
 */

// Assuming ApiClient, TransactionModel, and SheetManager are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Transaction data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into TransactionModel instances. It also handles
 * persisting data to Google Sheets via SheetManager.
 */
class TransactionRepository {
  /**
   * Creates an instance of TransactionRepository.
   * @param {Trading212ApiClient} apiClient The API client for fetching data.
   * @param {SheetManager} sheetManager The manager for interacting with Google Sheets.
   * @param {string} sheetName The name of the Google Sheet where transaction data is stored.
   */
  constructor(apiClient, sheetManager, sheetName = 'Transactions') {
    if (!apiClient) {
      throw new Error('TransactionRepository: apiClient is required.');
    }
    if (!sheetManager) {
      throw new Error('TransactionRepository: sheetManager is required.');
    }
    /** @private @const {Trading212ApiClient} */
    this.apiClient = apiClient;
    /** @private @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @private @const {string} */
    this.sheetName = sheetName;
    /** @private @const {Array<string>} */
    this.sheetHeaders = ['ID', 'Type', 'Timestamp', 'Amount Value', 'Amount Currency', 'Ticker', 'Quantity', 'Price Per Share', 'Notes', 'Reference ID', 'Source'];
    
    this.sheetManager.ensureSheetExists(this.sheetName);
    this.sheetManager.setHeaders(this.sheetName, this.sheetHeaders);
  }

  /**
   * Fetches all transactions from the API.
   * API client might require date range or pagination. This is a simplified version.
   * @param {Date} [startDate] Optional start date for fetching transactions.
   * @param {Date} [endDate] Optional end date for fetching transactions.
   * @param {number} [limit] Optional limit on the number of transactions to fetch.
   * @returns {Promise<Array<TransactionModel>>} A promise that resolves to an array of TransactionModel instances.
   */
  async fetchAllTransactions(startDate, endDate, limit) {
    try {
      // Assuming apiClient.getTransactions can take optional parameters
      const rawTransactionsData = await this.apiClient.getTransactions({ startDate, endDate, limit });
      if (!Array.isArray(rawTransactionsData)) {
        Logger.log(`Expected an array from apiClient.getTransactions(), but got: ${typeof rawTransactionsData}`);
        throw new Error('Invalid data format received from API for transactions.');
      }
      return rawTransactionsData.map(rawTx => new TransactionModel(rawTx));
    } catch (error) {
      Logger.log(`Error fetching all transactions: ${error.message}`);
      ErrorHandler.handleError(error, 'Failed to fetch all transactions from API.');
      return [];
    }
  }

  /**
   * Fetches recent transactions from the API.
   * @param {number} [limit=50] The maximum number of recent transactions to fetch.
   * @returns {Promise<Array<TransactionModel>>}
   */
  async getRecentTransactions(limit = 50) {
    // This might be a specific endpoint or a call to fetchAllTransactions with a limit and sorted by date descending.
    // For now, using fetchAllTransactions with a limit.
    // The API client would need to handle sorting or provide a specific method.
    return this.fetchAllTransactions(undefined, undefined, limit);
  }

  /**
   * Saves an array of TransactionModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<TransactionModel>} transactions An array of TransactionModel instances to save.
   * @returns {Promise<void>}
   */
  async saveTransactionsToSheet(transactions) {
    if (!Array.isArray(transactions) || !transactions.every(t => t instanceof TransactionModel)) {
      throw new Error('Invalid input: transactions must be an array of TransactionModel instances.');
    }
    try {
      const dataRows = transactions.map(tx => tx.toSheetRow());
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, this.sheetHeaders);
      Logger.log(`${transactions.length} transactions saved to sheet '${this.sheetName}'.`);
    } catch (error) {
      Logger.log(`Error saving transactions to sheet: ${error.message}`);
      ErrorHandler.handleError(error, 'Failed to save transactions to Google Sheet.');
    }
  }
  
  /**
   * Fetches all transactions from the API (optionally filtered) and saves them to the Google Sheet.
   * @param {Date} [startDate] Optional start date.
   * @param {Date} [endDate] Optional end date.
   * @param {number} [limit] Optional limit.
   * @returns {Promise<Array<TransactionModel>>}
   */
  async fetchAndSaveAllTransactions(startDate, endDate, limit) {
    const transactions = await this.fetchAllTransactions(startDate, endDate, limit);
    if (transactions.length > 0) {
      await this.saveTransactionsToSheet(transactions);
    } else {
      Logger.log('No transactions fetched from API, sheet not updated.');
      // Optionally clear the sheet if no transactions are found
      // await this.sheetManager.updateSheetData(this.sheetName, [], this.sheetHeaders);
    }
    return transactions;
  }

  /**
   * Retrieves all transactions from the Google Sheet.
   * @returns {Promise<Array<TransactionModel>>} A promise that resolves to an array of TransactionModel instances.
   */
  async getAllTransactionsFromSheet() {
    try {
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return dataRows.map(row => TransactionModel.fromSheetRow(row, this.sheetHeaders));
    } catch (error) {
      Logger.log(`Error retrieving transactions from sheet: ${error.message}`);
      ErrorHandler.handleError(error, 'Failed to retrieve transactions from Google Sheet.');
      return [];
    }
  }

  /**
   * Retrieves transactions from the sheet, filtered by type.
   * @param {string} type The transaction type to filter by (e.g., "BUY", "SELL").
   * @returns {Promise<Array<TransactionModel>>}
   */
  async getTransactionsByTypeFromSheet(type) {
    try {
      const allTransactions = await this.getAllTransactionsFromSheet();
      return allTransactions.filter(tx => tx.type.toUpperCase() === type.toUpperCase());
    } catch (error) {
      Logger.log(`Error retrieving transactions of type ${type} from sheet: ${error.message}`);
      return [];
    }
  }
}

// Global availability for GAS V8 runtime
