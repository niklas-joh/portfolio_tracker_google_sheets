/**
 * @fileoverview Defines the AccountCashRepository class for managing account cash data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles account cash-specific data operations.
 */

/**
 * Repository class for fetching and managing Account Cash data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into AccountCashModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class AccountCashRepository extends BaseRepository {
  /**
   * Creates an instance of AccountCashRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='Cash'] The name of the Google Sheet where account cash data is stored.
   */
  constructor(services, sheetName = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ACCOUNT_CASH ? API_RESOURCES.ACCOUNT_CASH.sheetName : 'Cash')) {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('AccountCashRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ACCOUNT_CASH) ? 
      API_RESOURCES.ACCOUNT_CASH.sheetName || 'ACCOUNT_CASH' : 'ACCOUNT_CASH';
      
    super(services, resourceIdentifier, sheetName);
  }

  /**
   * Fetches account cash data from the API.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<Array<AccountCashModel>>} A promise that resolves to an array of AccountCashModel instances.
   */
  async fetchAccountCash(params = {}) {
    try {
      const apiCallFunction = () => this.apiClient.getAccountCash(params);
      const rawAccountCashData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction,
        AccountCashModel.getExpectedApiFieldPaths
      );

      if (!Array.isArray(rawAccountCashData)) {
        this._log(`Expected an array from apiClient.getAccountCash(), but got: ${typeof rawAccountCashData}`, 'ERROR');
        // If it's a single object, wrap it in an array for consistency
        if (typeof rawAccountCashData === 'object' && rawAccountCashData !== null) {
          this._log('Wrapping single account cash object in array.', 'INFO');
          return [new AccountCashModel(rawAccountCashData)];
        }
        throw new Error('Invalid data format received from API for account cash.');
      }
      return rawAccountCashData.map(rawCash => {
        try {
          return new AccountCashModel(rawCash);
        } catch (modelError) {
          this._logError(modelError, `Error constructing AccountCashModel for raw data: ${JSON.stringify(rawCash)}`);
          return null;
        }
      }).filter(cash => cash !== null);
    } catch (error) {
      this._logError(error, 'Failed to fetch account cash from API. Error will be re-thrown.');
      throw error;
    }
  }

  /**
   * Saves an array of AccountCashModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<AccountCashModel>} accountCash An array of AccountCashModel instances to save.
   * @returns {Promise<void>}
   */
  async saveAccountCashToSheet(accountCash) {
    if (!Array.isArray(accountCash) || !accountCash.every(c => c instanceof AccountCashModel)) {
      throw new Error('Invalid input: accountCash must be an array of AccountCashModel instances.');
    }
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(AccountCashModel.getExpectedApiFieldPaths);
        if (!success) {
          if (accountCash.length > 0) {
            await this._initializeHeaders(accountCash[0].toObject(), AccountCashModel.getExpectedApiFieldPaths);
          }
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers for account cash data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = accountCash.map(cash => cash.toSheetRow(this.effectiveHeaders));
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${accountCash.length} cash entries saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save account cash to Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
  
  /**
   * Fetches account cash from the API and saves it to the Google Sheet.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<Array<AccountCashModel>>} A promise that resolves to an array of AccountCashModel instances that were fetched and saved.
   */
  async fetchAndSaveAccountCash(params = {}) {
    const accountCash = await this.fetchAccountCash(params);
    if (accountCash.length > 0) {
      await this.saveAccountCashToSheet(accountCash);
    } else {
      this._log('No account cash fetched from API, sheet not updated.', 'INFO');
    }
    return accountCash;
  }

  /**
   * Retrieves account cash from the Google Sheet.
   * @returns {Promise<Array<AccountCashModel>>} A promise that resolves to an array of AccountCashModel instances.
   */
  async getAllAccountCashFromSheet() {
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(AccountCashModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAllAccountCashFromSheet. Attempting to fetch to initialize.', 'WARN');
          await this.fetchAccountCash();
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers even after fetching. Cannot get account cash from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getAllData(this.sheetName);
      return this._transformSheetRowsToModels(dataRows, AccountCashModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve account cash from Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
}
