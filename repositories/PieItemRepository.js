/**
 * @fileoverview Defines the PieItemRepository class for managing pie item data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles pie item-specific data operations.
 */

// Assuming ApiClient, PieItemModel, PieModel, SheetManager, and BaseRepository are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Pie Item data.
 * Pie items are typically part of a Pie's details. This repository
 * might fetch them via the PieRepository or directly if an endpoint exists.
 * It transforms data into PieItemModel instances and handles persistence.
 * @extends BaseRepository
 */
class PieItemRepository extends BaseRepository {
  /**
   * Creates an instance of PieItemRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='PieItems'] The name of the Google Sheet where pie item data is stored.
   */
  constructor(services, sheetName = 'PieItems') {
    if (!services || !services.headerMappingService) {
      throw new Error('PieItemRepository: services.headerMappingService is required.');
    }
    
    // Get the resource identifier from API_RESOURCES if available
    // Assuming API_RESOURCES is globally available or passed via services if needed.
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.PIE_ITEMS) ? 
      API_RESOURCES.PIE_ITEMS.sheetName || 'PIE_ITEMS' : 'PIE_ITEMS';
    
    // Call the parent constructor with all required parameters
    super(services, resourceIdentifier, sheetName);
    
    // Header initialization is now handled by methods like fetchPieItemsForPie or getAllPieItemsFromSheet
    // when they are first called, or by BaseRepository's _tryInitializeHeadersFromStored
    // if effectiveHeaders are not yet set.
  }

  /**
   * Transform raw API pie item data to the structure expected by PieItemModel.
   * @private
   * @param {Object} rawItem Raw pie item data from the API.
   * @param {number} pieId The ID of the parent pie.
   * @param {string} pieCurrency The currency of the parent pie.
   * @returns {Object} Transformed data suitable for PieItemModel constructor.
   */
  _transformApiPieItemData(rawItem, pieId, pieCurrency) {
    return {
      pieId: pieId,
      ticker: rawItem.ticker,
      expectedShare: rawItem.expectedShare,
      currentShare: rawItem.currentShare,
      // Map from nested API 'result' object and 'ownedQuantity'
      currentValue: rawItem.result ? rawItem.result.priceAvgValue : 0,
      investedValue: rawItem.result ? rawItem.result.priceAvgInvestedValue : 0,
      result: rawItem.result ? rawItem.result.priceAvgResult : 0,
      quantity: typeof rawItem.ownedQuantity === 'number' ? rawItem.ownedQuantity : 0,
      // 'id' (item id) is not in API instrument data, PieItemModel handles it as potentially null.
      resultCurrency: pieCurrency, // Set based on parent pie's currency
      issues: rawItem.issues // Pass along issues
    };
  }

  /**
   * Fetches all pie items for a specific pie from the API.
   * This typically involves fetching the pie details and extracting items.
   * @param {number} pieId The ID of the pie whose items are to be fetched.
   * @returns {Promise<Array<PieItemModel>>} A promise that resolves to an array of PieItemModel instances.
   */
  async fetchPieItemsForPie(pieId) {
    try {
      // Assumes pie details from API client include instrument data
      const apiCallFunction = () => this.apiClient.getPieDetails(pieId);
      const rawPieData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction, PieItemModel.getExpectedApiFieldPaths);
      
      if (!rawPieData || !rawPieData.instruments || !Array.isArray(rawPieData.instruments)) {
        this._log(`No instruments data found for pie ID ${pieId} or data is not an array.`, 'WARN');
        return [];
      }

      // Determine the currency of the parent pie
      const pieCurrency = (rawPieData.settings && rawPieData.settings.currencyCode)
                          ? rawPieData.settings.currencyCode
                          : 'USD'; // Default if not found in settings

      return rawPieData.instruments.map(rawItem => {
        // Transform rawItem to match PieItemModel constructor expectations
        const transformedRawItem = this._transformApiPieItemData(rawItem, pieId, pieCurrency);
        
        try {
          return new PieItemModel(transformedRawItem);
        } catch (error) {
          this._logError(error, `Error creating PieItemModel for ${transformedRawItem.ticker}`);
          return null;
        }
      }).filter(model => model !== null); // Filter out null items
    } catch (error) {
      this._logError(error, `Failed to fetch pie items for pie ID ${pieId}.`);
      throw error; // Re-throw
    }
  }

  /**
   * Saves an array of PieItemModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet with the provided items.
   * All pie items from all pies should be passed together when using this method.
   * @param {Array<PieItemModel>} pieItems An array of PieItemModel instances to save.
   * @returns {Promise<boolean>} A promise that resolves to true if the save was successful, false otherwise.
   */
  async savePieItemsToSheet(pieItems) {
    try {
      // Validate input
      if (!Array.isArray(pieItems)) {
        this._log('Invalid input: pieItems must be an array.', 'WARN');
        return false;
      }
      
      // Check if all items are PieItemModel instances
      if (!pieItems.every(item => item instanceof PieItemModel)) {
        this._log('Invalid input: Not all items in pieItems array are PieItemModel instances.', 'WARN');
        return false;
      }
      
      // Handle empty array case
      if (pieItems.length === 0) {
        this._log('No pie items to save to sheet. Sheet will not be updated.', 'INFO');
        return true; // Return true as this is not an error condition
      }
      
      // Ensure headers are initialized
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(PieItemModel.getExpectedApiFieldPaths);
        if (!success) {
          throw new Error('Failed to initialize headers for pie item data. Fetch data first.');
        }
      }
      
      // Log the number of items being saved
      this._log(`Preparing to save ${pieItems.length} pie items to sheet '${this.sheetName}'...`, 'INFO');
      
      // Transform items to sheet rows using our dynamic headers
      const dataRows = pieItems.map(item => {
        try {
          return item.toSheetRow(this.effectiveHeaders);
        } catch (rowError) {
          this._log(`Error converting pie item to sheet row: ${rowError.message}`, 'WARN');
          
          // Create a row with all empty values except for basic identification
          const emptyRow = Array(this.effectiveHeaders.length).fill('');
          
          // Try to add some basic identification to the empty row
          const pieIdIndex = this.effectiveHeaders.findIndex(h => h.originalPath === 'pieId');
          const tickerIndex = this.effectiveHeaders.findIndex(h => h.originalPath === 'ticker');
          
          if (pieIdIndex !== -1) emptyRow[pieIdIndex] = item.pieId || 'Unknown';
          if (tickerIndex !== -1) emptyRow[tickerIndex] = item.ticker || 'Error';
          
          return emptyRow;
        }
      });
      
      // Get the transformed header names for display
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      
      // Save to sheet
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`Successfully saved ${pieItems.length} pie items to sheet '${this.sheetName}'.`, 'INFO');
      return true;
    } catch (error) {
      this._logError(error, 'Failed to save pie items to Google Sheet.');
      throw error; 
    }
  }

  /**
   * Fetches pie items for a given pie ID and saves them to the sheet.
   * Note: This will overwrite the entire sheet with items for THIS pie only.
   * Consider if this is the desired behavior or if items should be appended/merged.
   * @param {number} pieId The ID of the pie.
   * @returns {Promise<Array<PieItemModel>>}
   */
  async fetchAndSaveItemsForPie(pieId) {
    const items = await this.fetchPieItemsForPie(pieId);
    if (items.length > 0) {
      // This replaces the entire sheet. If you want to manage items for multiple pies
      // in one sheet, you'd need to fetch all items for all pies and save them together,
      // or implement a more complex update logic in sheetManager.
      await this.savePieItemsToSheet(items);
    } else {
      this._log(`No items fetched for pie ID ${pieId}, sheet not updated.`, 'INFO');
      // If this means "clear items for this pie", that logic is more complex with a shared sheet.
      // If the sheet is ONLY for one pie's items at a time, then clearing is fine:
      // if (this.effectiveHeaders) {
      //   const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      //   await this.sheetManager.updateSheetData(this.sheetName, [], transformedHeaderNames);
      // }
    }
    return items;
  }
  
  /**
   * Retrieves all pie items from the Google Sheet.
   * @returns {Promise<Array<PieItemModel>>} A promise that resolves to an array of PieItemModel instances.
   */
  async getAllPieItemsFromSheet() {
    try {
      // Ensure headers are initialized from storage if not already done
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(PieItemModel.getExpectedApiFieldPaths);
        if (!success) {
          throw new Error('Failed to initialize headers for pie item data. Fetch data first.');
        }
      }
      
      // Get the sheet data
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      
      // Transform rows to model instances
      return this._transformSheetRowsToModels(dataRows, PieItemModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve pie items from Google Sheet.');
      throw error; // Re-throw
    }
  }

  /**
   * Retrieves all pie items for a specific pie ID from the Google Sheet.
   * @param {number} pieId The ID of the pie.
   * @returns {Promise<Array<PieItemModel>>}
   */
  async getPieItemsForPieFromSheet(pieId) {
    try {
      const allItems = await this.getAllPieItemsFromSheet();
      return allItems.filter(item => item.pieId === pieId);
    } catch (error) {
      this._logError(error, `Error filtering pie items for pie ID ${pieId} from sheet.`);
      throw error; // Re-throw
    }
  }
}

// Global availability for GAS V8 runtime
