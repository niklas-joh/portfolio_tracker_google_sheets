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
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class PieRepository extends BaseRepository {
  /**
   * Creates an instance of PieRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName=(API_RESOURCES.PIES.sheetName || 'Pies')] The name of the Google Sheet where pie data is stored.
   */
  constructor(services, sheetName = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.PIES ? API_RESOURCES.PIES.sheetName : 'Pies')) {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('PieRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.PIES) ? 
      API_RESOURCES.PIES.sheetName || 'PIES_SUMMARY' : 'PIES_SUMMARY'; // Or a more generic PIES identifier
    
    super(services, resourceIdentifier, sheetName);
    
    // Header initialization is handled by BaseRepository methods when data is fetched or read.
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
              this._logError(err, `Failed to fetch details for pie ID ${summary.id}. Skipping this pie.`);
              return null; // Indicate failure for this pie
            });
        }
        this._logError(new Error('Invalid pie summary object'), `Summary: ${JSON.stringify(summary)}`);
        return Promise.resolve(null); // Skip if summary is invalid
      });

      const results = await Promise.all(detailedPiesPromises);
      
      // Initialize headers using the first valid result as a sample
      const firstValidResult = results.find(r => r && r.detail && r.summary);
      if (firstValidResult) {
        // Construct a sample data object similar to what PieModel expects for header generation
        const sampleDataForHeaders = {
            id: firstValidResult.detail.settings.id,
            name: firstValidResult.detail.settings.name,
            creationDate: firstValidResult.detail.settings.creationDate,
            lastUpdateDate: firstValidResult.detail.settings.endDate,
            icon: firstValidResult.detail.settings.icon,
            currency: firstValidResult.detail.settings.currencyCode || 'USD',
            progress: firstValidResult.summary.progress,
            value: firstValidResult.summary.result ? firstValidResult.summary.result.priceAvgValue : 0,
            instrumentsCount: (firstValidResult.detail.instruments || []).length, // Added for completeness
            cash: firstValidResult.summary.cash,
            dividendGained: firstValidResult.summary.dividendDetails ? firstValidResult.summary.dividendDetails.gained : null,
            dividendInCash: firstValidResult.summary.dividendDetails ? firstValidResult.summary.dividendDetails.inCash : null,
            dividendReinvested: firstValidResult.summary.dividendDetails ? firstValidResult.summary.dividendDetails.reinvested : null,
            totalInvested: firstValidResult.summary.result ? firstValidResult.summary.result.priceAvgInvestedValue : null,
            totalResult: firstValidResult.summary.result ? firstValidResult.summary.result.priceAvgResult : null,
            totalResultCoef: firstValidResult.summary.result ? firstValidResult.summary.result.priceAvgResultCoef : null,
            status: firstValidResult.summary.status,
        };
        await this._initializeHeaders(sampleDataForHeaders, PieModel.getExpectedApiFieldPaths);
      } else {
        // Fallback if no valid results, try to initialize from stored or model defaults
        await this._tryInitializeHeadersFromStored(PieModel.getExpectedApiFieldPaths);
      }

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
            // dividendDetails: rawPieSummary.dividendDetails, // { gained, inCash, reinvested } - will be flattened
            progress: rawPieSummary.progress,
            value: rawPieSummary.result ? rawPieSummary.result.priceAvgValue : 0, // This is the main 'value'
            status: rawPieSummary.status,

            // New flattened fields from summary
            dividendGained: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.gained : null,
            dividendInCash: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.inCash : null,
            dividendReinvested: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.reinvested : null,
            totalInvested: rawPieSummary.result ? rawPieSummary.result.priceAvgInvestedValue : null,
            totalResult: rawPieSummary.result ? rawPieSummary.result.priceAvgResult : null,
            totalResultCoef: rawPieSummary.result ? rawPieSummary.result.priceAvgResultCoef : null,
            instrumentsCount: (rawPieDetail.instruments || []).length, // Ensure this is part of modelData if used by headers
            
            // Instruments from pie detail
            instruments: rawPieDetail.instruments || []
          };

          if (!rawPieDetail.settings.currencyCode) {
            this._log(`PieModel for ID ${modelData.id}: Currency defaulted to USD as 'currencyCode' was not found in pie settings. API detail: ${JSON.stringify(rawPieDetail.settings)}`, 'WARN');
          }
          
          try {
            return new PieModel(modelData);
          } catch (modelError) {
            this._logError(modelError, `Error creating PieModel for ID ${modelData.id}. Raw modelData: ${JSON.stringify(modelData)}`);
            return null; // Skip this pie if model creation fails
          }
        })
        .filter(pieModel => pieModel !== null); // Filter out models that failed instantiation

    } catch (error) {
      // Catch errors from the initial getPies() call or Promise.all() itself
      this._logError(error, 'Failed to fetch all pies from API. Error will be re-thrown.');
      // No longer use handleError here for UI, let it bubble up.
      throw error; // Re-throw to be caught by uiFunctions.js
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
        this._logError(new Error(`Summary not found for pie ID ${pieId} when calling getPieById.`), `Pie detail was fetched but summary was not found.`);
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
            // dividendDetails: null, // Will be flattened
            progress: null,
            value: 0, // Or perhaps from a detail field if available, but API spec implies summary
            status: null,
            // New flattened fields
            dividendGained: null,
            dividendInCash: null,
            dividendReinvested: null,
            totalInvested: null,
            totalResult: null,
            totalResultCoef: null,
            instrumentsCount: (rawPieDetail.instruments || []).length,
          };
          // Attempt to initialize headers if this is the first data point
          if (!this.effectiveHeaders) {
            await this._initializeHeaders(modelData, PieModel.getExpectedApiFieldPaths);
          }
          return new PieModel(modelData);
      }

      const modelData = {
        // From pie settings (via rawPieDetail)
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
        
        // From pie summary (via rawPieSummary)
        cash: rawPieSummary.cash,
        progress: rawPieSummary.progress,
        value: rawPieSummary.result ? rawPieSummary.result.priceAvgValue : 0,
        status: rawPieSummary.status,

        // New flattened fields from summary
        dividendGained: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.gained : null,
        dividendInCash: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.inCash : null,
        dividendReinvested: rawPieSummary.dividendDetails ? rawPieSummary.dividendDetails.reinvested : null,
        totalInvested: rawPieSummary.result ? rawPieSummary.result.priceAvgInvestedValue : null,
        totalResult: rawPieSummary.result ? rawPieSummary.result.priceAvgResult : null,
        totalResultCoef: rawPieSummary.result ? rawPieSummary.result.priceAvgResultCoef : null,
        instrumentsCount: (rawPieDetail.instruments || []).length,
        
        // Instruments from pie detail
        instruments: rawPieDetail.instruments || []
      };
      // Attempt to initialize headers if this is the first data point
      if (!this.effectiveHeaders) {
         await this._initializeHeaders(modelData, PieModel.getExpectedApiFieldPaths);
      }
      return new PieModel(modelData);
    } catch (error) {
      this._logError(error, `Failed to fetch pie with ID ${pieId} from API. Error will be re-thrown.`);
      throw error; // Re-throw
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
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(PieModel.getExpectedApiFieldPaths);
        if (!success) {
          // If still no headers, try to generate from the first pie if available
          if (pies.length > 0) {
            await this._initializeHeaders(pies[0].toObject(), PieModel.getExpectedApiFieldPaths); // Use toObject() for sample
          }
          if (!this.effectiveHeaders) { // Check again
             throw new Error('Failed to initialize headers for pie data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = pies.map(pie => pie.toSheetRow(this.effectiveHeaders));
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${pies.length} pies saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save pies to Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
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
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(PieModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAllPiesFromSheet. Attempting to fetch to initialize.', 'WARN');
          // As a last resort, try fetching all pies to initialize headers, then get from sheet.
          // This could be inefficient if the sheet is the intended source of truth.
          // Consider if this behavior is desired or if an error should be thrown.
          await this.fetchAllPies(); // This will initialize headers
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers even after fetching. Cannot get pies from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return this._transformSheetRowsToModels(dataRows, PieModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve pies from Google Sheet. Error will be re-thrown.');
      throw error; // Re-throw
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
