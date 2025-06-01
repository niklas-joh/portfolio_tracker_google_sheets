/**
 * @fileoverview Defines the TransactionRepository class for managing transaction data.
 */

// Assuming ApiClient, TransactionModel, and SheetManager are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Transaction data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into TransactionModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class TransactionRepository extends BaseRepository {
  /**
   * Creates an instance of TransactionRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='Transactions'] The name of the Google Sheet where transaction data is stored.
   */
  constructor(services, sheetName = 'Transactions') {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('TransactionRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    // Assuming API_RESOURCES is globally available or passed via services if needed.
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.TRANSACTIONS) ? 
      API_RESOURCES.TRANSACTIONS.sheetName || 'TRANSACTIONS' : 'TRANSACTIONS';
      
    super(services, resourceIdentifier, sheetName);
    
    // Header initialization is handled by BaseRepository methods when data is fetched or read.
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
      const apiCallFunction = () => this.apiClient.getTransactions({ startDate, endDate, limit });
      const rawTransactionsData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction,
        TransactionModel.getExpectedApiFieldPaths
      );

      if (!Array.isArray(rawTransactionsData)) {
        this._log(`Expected an array from apiClient.getTransactions(), but got: ${typeof rawTransactionsData}`, 'ERROR');
        throw new Error('Invalid data format received from API for transactions.');
      }
      return rawTransactionsData.map(rawTx => {
        try {
          return new TransactionModel(rawTx);
        } catch (modelError) {
          this._logError(modelError, `Error constructing TransactionModel for raw data: ${JSON.stringify(rawTx)}`);
          return null;
        }
      }).filter(tx => tx !== null);
    } catch (error) {
      this._logError(error, 'Failed to fetch all transactions from API. Error will be re-thrown.');
      throw error; // Re-throw
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
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(TransactionModel.getExpectedApiFieldPaths);
        if (!success) {
          if (transactions.length > 0) {
            // Attempt to initialize from the first transaction if available
            await this._initializeHeaders(transactions[0].toObject(), TransactionModel.getExpectedApiFieldPaths);
          }
          if (!this.effectiveHeaders) { // Check again
            throw new Error('Failed to initialize headers for transaction data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = transactions.map(tx => tx.toSheetRow(this.effectiveHeaders));
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${transactions.length} transactions saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save transactions to Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
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
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(TransactionModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAllTransactionsFromSheet. Attempting to fetch to initialize.', 'WARN');
          await this.fetchAllTransactions(); // This will initialize headers via _fetchDataAndInitializeHeaders
           if (!this.effectiveHeaders) { // Check again
            throw new Error('Failed to initialize headers even after fetching. Cannot get transactions from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return this._transformSheetRowsToModels(dataRows, TransactionModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve transactions from Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
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
      this.errorHandler.logError(error, `Error retrieving transactions of type ${type} from sheet. Error will be re-thrown.`);
      throw error; // Re-throw
    }
  }
}

// Global availability for GAS V8 runtime
