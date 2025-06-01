/**
 * @fileoverview Defines the DividendRepository class for managing dividend data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles dividend-specific data operations.
 */

// Assuming ApiClient, DividendModel, SheetManager, and BaseRepository are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Dividend data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into DividendModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class DividendRepository extends BaseRepository {
  /**
   * Creates an instance of DividendRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='Dividends'] The name of the Google Sheet where dividend data is stored.
   */
  constructor(services, sheetName = 'Dividends') {
    if (!services || !services.headerMappingService) {
      throw new Error('DividendRepository: services.headerMappingService is required.');
    }
    
    // Get the resource identifier from API_RESOURCES if available
    // Assuming API_RESOURCES is globally available or passed via services if needed.
    // For now, let's assume API_RESOURCES is global as per original code context.
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.DIVIDENDS) ? 
      API_RESOURCES.DIVIDENDS.sheetName || 'DIVIDENDS' : 'DIVIDENDS';
    
    // Call the parent constructor with all required parameters
    super(services, resourceIdentifier, sheetName);
    
    // Header initialization is now handled by methods like fetchAllDividends or getAllDividendsFromSheet
    // when they are first called, or by BaseRepository's _tryInitializeHeadersFromStored
    // if effectiveHeaders are not yet set.
  }

  /**
   * Transform raw API dividend data to the structure expected by DividendModel.
   * @private
   * @param {Object} rawDividend Raw dividend data from the API.
   * @returns {Object|null} Transformed data suitable for DividendModel constructor, or null if invalid.
   */
  _transformApiDividendData(rawDividend) {
    try {
      // Validate the structure of raw API dividend data before transformation
      const isValidApiData = rawDividend &&
        typeof rawDividend.reference === 'string' && rawDividend.reference.trim() !== '' && // for id
        typeof rawDividend.ticker === 'string' && rawDividend.ticker.trim() !== '' &&
        typeof rawDividend.paidOn === 'string' && // for timestamp (basic check, model validates further)
        typeof rawDividend.amountInEuro === 'number'; // for amount.value

      if (!isValidApiData) {
        const warningMsg = `Skipping invalid or incomplete dividend data structure: ${JSON.stringify(rawDividend)}`;
        this._log(warningMsg, 'WARN');
        return null;
      }

      // Transform raw API data to the structure expected by DividendModel
      return {
        id: rawDividend.reference,
        ticker: rawDividend.ticker,
        timestamp: rawDividend.paidOn,
        amount: {
          value: rawDividend.amountInEuro,
          currency: 'EUR' // Assuming EUR based on 'amountInEuro' field
        },
        quantity: typeof rawDividend.quantity === 'number' ? rawDividend.quantity : null,
        // Map other optional fields if they exist in rawDividend and are expected by DividendModel
        taxAmount: rawDividend.taxAmount,
        taxCurrency: rawDividend.taxCurrency,
        sourceTransactionId: rawDividend.sourceTransactionId
      };
    } catch (error) {
      this._logError(error, `Error transforming API dividend data: ${JSON.stringify(rawDividend)}`);
      return null;
    }
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
      // Set up API parameters
      const apiParams = {};
      if (startDate) apiParams.timeFrom = startDate.toISOString();
      if (endDate) apiParams.timeTo = endDate.toISOString();
      if (limit) apiParams.limit = limit;
      
      // Fetch data and ensure headers are initialized
      const apiCallFunction = () => this.apiClient.getDividends(apiParams);
      const rawDividendsData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction, DividendModel.getExpectedApiFieldPaths);

      if (!Array.isArray(rawDividendsData)) {
        const errorMsg = `Expected an array from apiClient.getDividends(), but got: ${typeof rawDividendsData}`;
        this._log(errorMsg, 'ERROR');
        return []; // Return empty array on format error to prevent downstream issues
      }
      
      // Transform raw API data to model-compatible format and create model instances
      return rawDividendsData
        .map(rawDividend => {
          const transformedData = this._transformApiDividendData(rawDividend);
          if (!transformedData) return null; // Skip invalid data
          
          try {
            return new DividendModel(transformedData);
          } catch (modelError) {
            this._logError(modelError, `Error constructing DividendModel for transformed data: ${JSON.stringify(transformedData)}`);
            return null; // Skip this problematic item
          }
        })
        .filter(dividend => dividend !== null); // Remove any nulls that resulted from invalid data
    } catch (error) {
      this._logError(error, 'Failed to fetch all dividends from API.');
      throw error; // Re-throw to allow calling function to handle
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
      // Ensure headers are initialized
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(DividendModel.getExpectedApiFieldPaths);
        if (!success) {
          throw new Error('Failed to initialize headers for dividend data. Fetch data first.');
        }
      }
      
      // Convert models to rows using our dynamic headers
      const dataRows = dividends.map(dividend => dividend.toSheetRow(this.effectiveHeaders));
      
      // Get the transformed header names for display
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      
      // Update the sheet
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${dividends.length} dividends saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save dividends to Google Sheet.');
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
      this._log('No dividends fetched from API, sheet not updated.', 'INFO');
      // Optionally clear the sheet if no dividends are found
      // if (this.effectiveHeaders) {
      //   const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      //   await this.sheetManager.updateSheetData(this.sheetName, [], transformedHeaderNames);
      // }
    }
    return dividends;
  }

  /**
   * Retrieves all dividends from the Google Sheet.
   * @returns {Promise<Array<DividendModel>>} A promise that resolves to an array of DividendModel instances.
   */
  async getAllDividendsFromSheet() {
    try {
      // Ensure headers are initialized from storage if not already done
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(DividendModel.getExpectedApiFieldPaths);
        if (!success) {
          throw new Error('Failed to initialize headers for dividend data. Fetch data first.');
        }
      }
      
      // Get the sheet data
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      
      // Transform rows to model instances
      return this._transformSheetRowsToModels(dataRows, DividendModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve dividends from Google Sheet.');
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
      this._logError(error, `Error retrieving dividends for ticker ${ticker} from sheet.`);
      throw error; // Re-throw
    }
  }
}

// Global availability for GAS V8 runtime
