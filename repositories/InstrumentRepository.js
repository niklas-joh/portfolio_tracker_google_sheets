/**
 * @fileoverview Defines the InstrumentRepository class for managing instrument data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles instrument-specific data operations.
 */

/**
 * Repository class for fetching and managing Instrument data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into InstrumentModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class InstrumentRepository extends BaseRepository {
  /**
   * Creates an instance of InstrumentRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='InstrumentsList'] The name of the Google Sheet where instrument data is stored.
   */
  constructor(services, sheetName = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.INSTRUMENTS_LIST ? API_RESOURCES.INSTRUMENTS_LIST.sheetName : 'InstrumentsList')) {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('InstrumentRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.INSTRUMENTS_LIST) ? 
      API_RESOURCES.INSTRUMENTS_LIST.sheetName || 'INSTRUMENTS_LIST' : 'INSTRUMENTS_LIST';
      
    super(services, resourceIdentifier, sheetName);
  }

  /**
   * Fetches all instruments from the API.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<Array<InstrumentModel>>} A promise that resolves to an array of InstrumentModel instances.
   */
  async fetchAllInstruments(params = {}) {
    try {
      const apiCallFunction = () => this.apiClient.getInstrumentsList(params);
      const rawInstrumentsData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction,
        InstrumentModel.getExpectedApiFieldPaths
      );

      if (!Array.isArray(rawInstrumentsData)) {
        this._log(`Expected an array from apiClient.getInstrumentsList(), but got: ${typeof rawInstrumentsData}`, 'ERROR');
        throw new Error('Invalid data format received from API for instruments.');
      }
      return rawInstrumentsData.map(rawInstrument => {
        try {
          return new InstrumentModel(rawInstrument);
        } catch (modelError) {
          this._logError(modelError, `Error constructing InstrumentModel for raw data: ${JSON.stringify(rawInstrument)}`);
          return null;
        }
      }).filter(instrument => instrument !== null);
    } catch (error) {
      this._logError(error, 'Failed to fetch all instruments from API. Error will be re-thrown.');
      throw error;
    }
  }

  /**
   * Saves an array of InstrumentModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<InstrumentModel>} instruments An array of InstrumentModel instances to save.
   * @returns {Promise<void>}
   */
  async saveInstrumentsToSheet(instruments) {
    if (!Array.isArray(instruments) || !instruments.every(i => i instanceof InstrumentModel)) {
      throw new Error('Invalid input: instruments must be an array of InstrumentModel instances.');
    }
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(InstrumentModel.getExpectedApiFieldPaths);
        if (!success) {
          if (instruments.length > 0) {
            await this._initializeHeaders(instruments[0].toObject(), InstrumentModel.getExpectedApiFieldPaths);
          }
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers for instrument data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = instruments.map(instrument => instrument.toSheetRow(this.effectiveHeaders));
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${instruments.length} instruments saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save instruments to Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
  
  /**
   * Fetches all instruments from the API and saves them to the Google Sheet.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<Array<InstrumentModel>>} A promise that resolves to an array of InstrumentModel instances that were fetched and saved.
   */
  async fetchAndSaveAllInstruments(params = {}) {
    const instruments = await this.fetchAllInstruments(params);
    if (instruments.length > 0) {
      await this.saveInstrumentsToSheet(instruments);
    } else {
      this._log('No instruments fetched from API, sheet not updated.', 'INFO');
    }
    return instruments;
  }

  /**
   * Retrieves all instruments from the Google Sheet.
   * @returns {Promise<Array<InstrumentModel>>} A promise that resolves to an array of InstrumentModel instances.
   */
  async getAllInstrumentsFromSheet() {
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(InstrumentModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAllInstrumentsFromSheet. Attempting to fetch to initialize.', 'WARN');
          await this.fetchAllInstruments();
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers even after fetching. Cannot get instruments from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return this._transformSheetRowsToModels(dataRows, InstrumentModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve instruments from Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
}
