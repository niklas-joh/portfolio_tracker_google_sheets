/**
 * @fileoverview Defines the PieItemRepository class for managing pie item data.
 */

// Assuming ApiClient, PieItemModel, PieModel, and SheetManager are globally available.
// For GAS, ensure relevant .js files are loaded.

/**
 * Repository class for fetching and managing Pie Item data.
 * Pie items are typically part of a Pie's details. This repository
 * might fetch them via the PieRepository or directly if an endpoint exists.
 * It transforms data into PieItemModel instances and handles persistence.
 */
class PieItemRepository {
  /**
   * Creates an instance of PieItemRepository.
   * @param {Trading212ApiClient} apiClient The API client for fetching data.
   * @param {SheetManager} sheetManager The manager for interacting with Google Sheets.
   * @param {string} sheetName The name of the Google Sheet where pie item data is stored.
   */
  constructor(apiClient, sheetManager, sheetName = 'PieItems') {
    if (!apiClient) {
      throw new Error('PieItemRepository: apiClient is required.');
    }
    if (!sheetManager) {
      throw new Error('PieItemRepository: sheetManager is required.');
    }
    /** @private @const {Trading212ApiClient} */
    this.apiClient = apiClient; // May not be used directly if items always come via Pie details
    /** @private @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @private @const {string} */
    this.sheetName = sheetName;
    /** @private @const {Array<string>} */
    this.sheetHeaders = ['Pie ID', 'Item ID', 'Ticker', 'Expected Share', 'Current Share', 'Current Value', 'Invested Value', 'Quantity', 'Result', 'Result Currency'];
    
    this.sheetManager.ensureSheetExists(this.sheetName);
    this.sheetManager.setHeaders(this.sheetName, this.sheetHeaders);
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
      const rawPieData = await this.apiClient.getPieDetails(pieId);
      if (!rawPieData || !rawPieData.instruments || !Array.isArray(rawPieData.instruments)) {
        Logger.log(`No instruments data found for pie ID ${pieId} or data is not an array.`);
        return [];
      }

      // Determine the currency of the parent pie
      const pieCurrency = (rawPieData.settings && rawPieData.settings.currencyCode)
                          ? rawPieData.settings.currencyCode
                          : 'USD'; // Default if not found in settings

      return rawPieData.instruments.map(rawItem => {
        // Transform rawItem to match PieItemModel constructor expectations
        const transformedRawItem = {
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
        return new PieItemModel(transformedRawItem);
      });
    } catch (error) {
      Logger.log(`Error fetching pie items for pie ID ${pieId}: ${error.message}`);
      ErrorHandler.handleError(error, `Failed to fetch pie items for pie ID ${pieId}.`);
      return [];
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
        Logger.log('Invalid input: pieItems must be an array.');
        return false;
      }
      
      // Check if all items are PieItemModel instances
      if (!pieItems.every(item => item instanceof PieItemModel)) {
        Logger.log('Invalid input: Not all items in pieItems array are PieItemModel instances.');
        return false;
      }
      
      // Handle empty array case
      if (pieItems.length === 0) {
        Logger.log('No pie items to save to sheet. Sheet will not be updated.');
        return true; // Return true as this is not an error condition
      }
      
      // Log the number of items being saved
      Logger.log(`Preparing to save ${pieItems.length} pie items to sheet '${this.sheetName}'...`);
      
      // Transform items to sheet rows
      const dataRows = pieItems.map(item => {
        try {
          return item.toSheetRow();
        } catch (rowError) {
          Logger.log(`Error converting pie item to sheet row: ${rowError.message}`);
          // Return a row with the pieId and error message, rest empty
          return [
            item.pieId || 'Unknown',
            item.id || 'Unknown',
            item.ticker || 'Error',
            'Error',
            'Error',
            0,
            0,
            0,
            0,
            'Error: ' + rowError.message
          ];
        }
      });
      
      // Save to sheet
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, this.sheetHeaders);
      Logger.log(`Successfully saved ${pieItems.length} pie items to sheet '${this.sheetName}'.`);
      return true;
    } catch (error) {
      Logger.log(`Error saving pie items to sheet: ${error.message}`);
      if (typeof ErrorHandler !== 'undefined' && ErrorHandler.handleError) {
        ErrorHandler.handleError(error, 'Failed to save pie items to Google Sheet.');
      } else {
        // Fallback if ErrorHandler is not available
        Logger.log(`Stack trace: ${error.stack || 'No stack trace available'}`);
      }
      return false;
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
      Logger.log(`No items fetched for pie ID ${pieId}, sheet not updated.`);
      // If this means "clear items for this pie", that logic is more complex with a shared sheet.
      // If the sheet is ONLY for one pie's items at a time, then clearing is fine:
      // await this.sheetManager.updateSheetData(this.sheetName, [], this.sheetHeaders);
    }
    return items;
  }
  
  /**
   * Retrieves all pie items from the Google Sheet.
   * @returns {Promise<Array<PieItemModel>>} A promise that resolves to an array of PieItemModel instances.
   */
  async getAllPieItemsFromSheet() {
    try {
      const dataRows = await this.sheetManager.getSheetData(this.sheetName);
      return dataRows.map(row => PieItemModel.fromSheetRow(row, this.sheetHeaders));
    } catch (error) {
      Logger.log(`Error retrieving pie items from sheet: ${error.message}`);
      ErrorHandler.handleError(error, 'Failed to retrieve pie items from Google Sheet.');
      return [];
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
      Logger.log(`Error retrieving items for pie ID ${pieId} from sheet: ${error.message}`);
      return [];
    }
  }
}

// Global availability for GAS V8 runtime
