/**
 * @fileoverview Defines the PieRepository class for managing pie data.
 */

// Assuming ApiClient, PieModel, and SheetManager are globally available
// or imported if using a module system.
// For GAS, ensure Trading212ApiClient.js, PieModel.js, and sheetManager.js are loaded.

/**
 * Repository class for fetching and managing Pie data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into PieModel instances. It also handles
 * persisting data to Google Sheets via SheetManager.
 */
class PieRepository {
  /**
   * Creates an instance of PieRepository.
   * @param {Trading212ApiClient} apiClient The API client for fetching data.
   * @param {SheetManager} sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} errorHandler The error handler instance.
   * @param {string} [sheetName=API_RESOURCES.PIES.sheetName] The name of the Google Sheet where pie data is stored.
   */
  constructor(apiClient, sheetManager, errorHandler, sheetName = API_RESOURCES.PIES.sheetName) {
    if (!apiClient) {
      throw new Error('PieRepository: apiClient is required.');
    }
    if (!sheetManager) {
      throw new Error('PieRepository: sheetManager is required.');
    }
    if (!errorHandler) {
      throw new Error('PieRepository: errorHandler is required.');
    }
    /** @private @const {Trading212ApiClient} */
    this.apiClient = apiClient;
    /** @private @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @private @const {ErrorHandler} */
    this.errorHandler = errorHandler;
    /** @private @const {string} */
    this.sheetName = sheetName;
    /** @private @const {Array<string>} */
    this.sheetHeaders = ['ID', 'Name', 'Value', 'Currency', 'Progress', 'Creation Date', 'Last Update Date', 'Instruments Count', 'Icon'];
    
    // Ensure the sheet and headers exist
    this.sheetManager.ensureSheetExists(this.sheetName);
    this.sheetManager.setHeaders(this.sheetName, this.sheetHeaders);
  }

  /**
   * Fetches all pies from the API.
   * @returns {Promise<Array<PieModel>>} A promise that resolves to an array of PieModel instances.
   * @throws {Error} If API request fails or data parsing fails.
   */
  async fetchAllPies() {
    try {
      const rawPiesData = await this.apiClient.getPies(); // Assumes getPies() returns array of raw pie objects
      if (!Array.isArray(rawPiesData)) {
        this.errorHandler.logError(new Error('Invalid data format for pies'), `Expected an array from apiClient.getPies(), but got: ${typeof rawPiesData}`);
        throw new Error('Invalid data format received from API for pies.');
      }
      return rawPiesData.map(rawPie => new PieModel(rawPie));
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to fetch all pies from API.');
      return []; // Return empty array or rethrow as per error handling strategy
    }
  }

  /**
   * Fetches a specific pie by its ID from the API.
   * @param {number} pieId The ID of the pie to fetch.
   * @returns {Promise<PieModel|null>} A promise that resolves to a PieModel instance or null if not found.
   * @throws {Error} If API request fails or data parsing fails.
   */
  async getPieById(pieId) {
    try {
      const rawPieData = await this.apiClient.getPieDetails(pieId); // Assumes getPieDetails(id) returns single raw pie object
      if (!rawPieData) {
        return null; // Pie not found
      }
      return new PieModel(rawPieData);
    } catch (error) {
      this.errorHandler.handleError(error, `Failed to fetch pie with ID ${pieId} from API.`);
      return null; // Return null or rethrow
    }
  }

  /**
   * Saves an array of PieModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<PieModel>} pies An array of PieModel instances to save.
   * @returns {Promise<void>}
   */
  async savePiesToSheet(pies) {
    if (!Array.isArray(pies) || !pies.every(p => p instanceof PieModel)) {
      throw new Error('Invalid input: pies must be an array of PieModel instances.');
    }
    try {
      const dataRows = pies.map(pie => pie.toSheetRow());
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, this.sheetHeaders);
      this.errorHandler.log(`${pies.length} pies saved to sheet '${this.sheetName}'.`);
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to save pies to Google Sheet.');
      // Rethrow or handle as appropriate
    }
  }
  
  /**
   * Fetches all pies from the API and saves them to the Google Sheet.
   * @returns {Promise<Array<PieModel>>} A promise that resolves to an array of PieModel instances that were fetched and saved.
   */
  async fetchAndSaveAllPies() {
    const pies = await this.fetchAllPies();
    if (pies.length > 0) {
      await this.savePiesToSheet(pies);
    } else {
      Logger.log('No pies fetched from API, sheet not updated.');
      // Optionally clear the sheet if no pies are found
      // await this.sheetManager.clearSheetData(this.sheetName, this.sheetHeaders.length);
    }
    return pies;
  }

  /**
   * Retrieves all pies from the Google Sheet.
   * @returns {Promise<Array<PieModel>>} A promise that resolves to an array of PieModel instances.
   */
  async getAllPiesFromSheet() {
    try {
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      // Assuming first row is headers, which sheetManager might handle or we skip here
      // For now, assuming getSheetData returns data rows only (excluding headers)
      return dataRows.map(row => PieModel.fromSheetRow(row, this.sheetHeaders));
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to retrieve pies from Google Sheet.');
      return [];
    }
  }

  /**
   * Retrieves a pie by its ID from the Google Sheet.
   * @param {number} pieId The ID of the pie to retrieve.
   * @returns {Promise<PieModel|null>} A promise that resolves to a PieModel instance or null if not found.
   */
  async getPieByIdFromSheet(pieId) {
    try {
      const pies = await this.getAllPiesFromSheet();
      const foundPie = pies.find(pie => pie.id === pieId);
      return foundPie || null;
    } catch (error) {
      Logger.log(`Error retrieving pie by ID ${pieId} from sheet: ${error.message}`);
      // ErrorHandler.handleError already called in getAllPiesFromSheet if it fails there
      return null;
    }
  }
}

// For Google Apps Script global availability
// Ensure Trading212ApiClient, PieModel, SheetManager, and ErrorHandler are loaded before this script.
