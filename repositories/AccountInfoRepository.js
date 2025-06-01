/**
 * @fileoverview Defines the AccountInfoRepository class for managing account information data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles account info-specific data operations.
 */

/**
 * Repository class for fetching and managing Account Information data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into AccountInfoModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class AccountInfoRepository extends BaseRepository {
  /**
   * Creates an instance of AccountInfoRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='AccountInfo'] The name of the Google Sheet where account info data is stored.
   */
  constructor(services, sheetName = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ACCOUNT_INFO ? API_RESOURCES.ACCOUNT_INFO.sheetName : 'AccountInfo')) {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('AccountInfoRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ACCOUNT_INFO) ? 
      API_RESOURCES.ACCOUNT_INFO.sheetName || 'ACCOUNT_INFO' : 'ACCOUNT_INFO';
      
    super(services, resourceIdentifier, sheetName);
  }

  /**
   * Fetches account information from the API.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<AccountInfoModel|null>} A promise that resolves to an AccountInfoModel instance or null.
   */
  async fetchAccountInfo(params = {}) {
    try {
      const apiCallFunction = () => this.apiClient.getAccountInfo(params);
      const rawAccountInfoData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction,
        AccountInfoModel.getExpectedApiFieldPaths
      );

      if (!rawAccountInfoData) {
        this._log('No account info data received from API.', 'WARN');
        return null;
      }
      
      try {
        return new AccountInfoModel(rawAccountInfoData);
      } catch (modelError) {
        this._logError(modelError, `Error constructing AccountInfoModel for raw data: ${JSON.stringify(rawAccountInfoData)}`);
        return null;
      }
    } catch (error) {
      this._logError(error, 'Failed to fetch account info from API. Error will be re-thrown.');
      throw error;
    }
  }

  /**
   * Saves an AccountInfoModel instance to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {AccountInfoModel} accountInfo An AccountInfoModel instance to save.
   * @returns {Promise<void>}
   */
  async saveAccountInfoToSheet(accountInfo) {
    if (!(accountInfo instanceof AccountInfoModel)) {
      throw new Error('Invalid input: accountInfo must be an AccountInfoModel instance.');
    }
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(AccountInfoModel.getExpectedApiFieldPaths);
        if (!success) {
          await this._initializeHeaders(accountInfo.toObject(), AccountInfoModel.getExpectedApiFieldPaths);
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers for account info data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = [accountInfo.toSheetRow(this.effectiveHeaders)]; // Single row
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`Account info saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save account info to Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
  
  /**
   * Fetches account information from the API and saves it to the Google Sheet.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<AccountInfoModel|null>} A promise that resolves to the AccountInfoModel instance that was fetched and saved.
   */
  async fetchAndSaveAccountInfo(params = {}) {
    const accountInfo = await this.fetchAccountInfo(params);
    if (accountInfo) {
      await this.saveAccountInfoToSheet(accountInfo);
    } else {
      this._log('No account info fetched from API, sheet not updated.', 'INFO');
    }
    return accountInfo;
  }

  /**
   * Retrieves account information from the Google Sheet.
   * @returns {Promise<AccountInfoModel|null>} A promise that resolves to an AccountInfoModel instance or null.
   */
  async getAccountInfoFromSheet() {
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(AccountInfoModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAccountInfoFromSheet. Attempting to fetch to initialize.', 'WARN');
          await this.fetchAccountInfo(); // This will initialize headers
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers even after fetching. Cannot get account info from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getAllData(this.sheetName);
      if (dataRows.length === 0) {
        return null; // No data in sheet
      }
      // Assuming account info is a single row
      const models = this._transformSheetRowsToModels([dataRows[0]], AccountInfoModel);
      return models.length > 0 ? models[0] : null;
    } catch (error) {
      this._logError(error, 'Failed to retrieve account info from Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
}
