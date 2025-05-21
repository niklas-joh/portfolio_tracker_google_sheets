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
      // Step 1: Get all pie summaries (which include IDs)
      const pieSummaries = await this.apiClient.getPies();
      if (!Array.isArray(pieSummaries)) {
        this.errorHandler.logError(new Error('Invalid data format for pie summaries'), `Expected an array from apiClient.getPies(), but got: ${typeof pieSummaries}`);
        return []; // Return empty array on error
      }

      if (pieSummaries.length === 0) {
        Logger.log('No pie summaries found from API.');
        return [];
      }

      // Step 2: For each pie ID, fetch its full details
      const detailedPiesPromises = pieSummaries.map(summary => {
        if (summary && typeof summary.id !== 'undefined') {
          return this.apiClient.getPieDetails(summary.id)
            .then(detail => ({ detail, summary })) // Pass summary along with detail
            .catch(err => {
              this.errorHandler.logError(err, `Failed to fetch details for pie ID ${summary.id}. Skipping this pie.`);
              return null; // Indicate failure for this pie
            });
        }
        this.errorHandler.logError(new Error('Invalid pie summary object'), `Summary: ${JSON.stringify(summary)}`);
        return Promise.resolve(null); // Skip if summary is invalid
      });

      const results = await Promise.all(detailedPiesPromises);

      // Step 3: Create PieModel instances from the detailed data combined with summary data
      return results
        .filter(result => result && result.detail) // Filter out nulls or those where detail fetch failed
        .map(result => {
          const { detail: rawPieDetail, summary: rawPieSummary } = result;
          
          // Construct modelData by combining details and summary
          const modelData = {
            // From pie settings (via rawPieDetail)
            id: rawPieDetail.settings.id,
            name: rawPieDetail.settings.name,
            creationDate: rawPieDetail.settings.creationDate,
            lastUpdateDate: rawPieDetail.settings.endDate, // Assuming endDate from settings is lastUpdateDate
            icon: rawPieDetail.settings.icon,
            currency: rawPieDetail.settings.currencyCode || 'USD', // Defaulting to USD if not present
            dividendCashAction: rawPieDetail.settings.dividendCashAction,
            goal: rawPieDetail.settings.goal,
            initialInvestment: rawPieDetail.settings.initialInvestment,
            instrumentShares: rawPieDetail.settings.instrumentShares,
            publicUrl: rawPieDetail.settings.publicUrl,
            
            // From pie summary (via rawPieSummary)
            cash: rawPieSummary.cash,
            dividendDetails: rawPieSummary.dividendDetails, // { gained, inCash, reinvested }
            progress: rawPieSummary.progress,
            value: rawPieSummary.result ? rawPieSummary.result.priceAvgValue : 0, // This is the main 'value'
            summaryResult: rawPieSummary.result ? { // Store other result fields separately
              priceAvgInvestedValue: rawPieSummary.result.priceAvgInvestedValue,
              priceAvgResult: rawPieSummary.result.priceAvgResult,
              priceAvgResultCoef: rawPieSummary.result.priceAvgResultCoef
            } : null,
            status: rawPieSummary.status,
            
            // Instruments from pie detail
            instruments: rawPieDetail.instruments || []
          };

          if (!rawPieDetail.settings.currencyCode) {
            Logger.log(`PieModel for ID ${modelData.id}: Currency defaulted to USD as 'currencyCode' was not found in pie settings. API detail: ${JSON.stringify(rawPieDetail.settings)}`);
          }
          
          try {
            return new PieModel(modelData);
          } catch (modelError) {
            this.errorHandler.logError(modelError, `Error creating PieModel for ID ${modelData.id}. Raw modelData: ${JSON.stringify(modelData)}`);
            return null; // Skip this pie if model creation fails
          }
        })
        .filter(pieModel => pieModel !== null); // Filter out models that failed instantiation

    } catch (error) {
      // Catch errors from the initial getPies() call or Promise.all() itself
      this.errorHandler.handleError(error, 'Failed to fetch all pies from API.');
      return []; // Return empty array or rethrow as per error handling strategy
    }
  }

  /**
   * Fetches a specific pie by its ID from the API.
   * Note: This method fetches only the pie details. To get a complete PieModel
   * similar to fetchAllPies, you might need to fetch the summary separately or adjust.
   * For now, it constructs a PieModel primarily from detail data.
   * @param {number} pieId The ID of the pie to fetch.
   * @returns {Promise<PieModel|null>} A promise that resolves to a PieModel instance or null if not found.
   * @throws {Error} If API request fails or data parsing fails.
   */
  async getPieById(pieId) {
    try {
      const rawPieDetail = await this.apiClient.getPieDetails(pieId);
      if (!rawPieDetail) {
        return null; // Pie not found
      }
      // To create a full PieModel, we'd ideally also fetch its summary.
      // For now, we'll create a partial model based on details.
      // This might mean some fields (like progress, cash, summary.result) are null/default.
      // Or, we fetch the summary as well:
      const pieSummaries = await this.apiClient.getPies(); // This fetches all summaries
      const rawPieSummary = pieSummaries.find(s => s.id === pieId);

      if (!rawPieSummary) {
        this.errorHandler.logError(new Error(`Summary not found for pie ID ${pieId} when calling getPieById.`), `Pie detail was fetched but summary was not found.`);
        // Construct with what we have
         const modelData = {
            id: rawPieDetail.settings.id,
            name: rawPieDetail.settings.name,
            creationDate: rawPieDetail.settings.creationDate,
            lastUpdateDate: rawPieDetail.settings.endDate,
            icon: rawPieDetail.settings.icon,
            currency: rawPieDetail.settings.currencyCode || 'USD',
            dividendCashAction: rawPieDetail.settings.dividendCashAction,
            goal: rawPieDetail.settings.goal,
            initialInvestment: rawPieDetail.settings.initialInvestment,
            instrumentShares: rawPieDetail.settings.instrumentShares,
            publicUrl: rawPieDetail.settings.publicUrl,
            instruments: rawPieDetail.instruments || [],
            // Summary fields will be missing or default
            cash: null,
            dividendDetails: null,
            progress: null,
            value: 0, // Or perhaps from a detail field if available, but API spec implies summary
            summaryResult: null,
            status: null,
          };
          return new PieModel(modelData);
      }

      const modelData = {
        id: rawPieDetail.settings.id,
        name: rawPieDetail.settings.name,
        creationDate: rawPieDetail.settings.creationDate,
        lastUpdateDate: rawPieDetail.settings.endDate,
        icon: rawPieDetail.settings.icon,
        currency: rawPieDetail.settings.currencyCode || 'USD',
        dividendCashAction: rawPieDetail.settings.dividendCashAction,
        goal: rawPieDetail.settings.goal,
        initialInvestment: rawPieDetail.settings.initialInvestment,
        instrumentShares: rawPieDetail.settings.instrumentShares,
        publicUrl: rawPieDetail.settings.publicUrl,
        cash: rawPieSummary.cash,
        dividendDetails: rawPieSummary.dividendDetails,
        progress: rawPieSummary.progress,
        value: rawPieSummary.result ? rawPieSummary.result.priceAvgValue : 0,
        summaryResult: rawPieSummary.result ? {
          priceAvgInvestedValue: rawPieSummary.result.priceAvgInvestedValue,
          priceAvgResult: rawPieSummary.result.priceAvgResult,
          priceAvgResultCoef: rawPieSummary.result.priceAvgResultCoef
        } : null,
        status: rawPieSummary.status,
        instruments: rawPieDetail.instruments || []
      };
      return new PieModel(modelData);
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
