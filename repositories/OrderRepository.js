/**
 * @fileoverview Defines the OrderRepository class for managing order history data.
 * 
 * This repository extends BaseRepository to leverage the dynamic header management system,
 * and handles order history-specific data operations.
 */

/**
 * Repository class for fetching and managing Order History data.
 * It uses the Trading212ApiClient to interact with the API and
 * transforms data into OrderModel instances. It also handles
 * persisting data to Google Sheets via SheetManager and manages
 * headers using HeaderMappingService.
 * @extends BaseRepository
 */
class OrderRepository extends BaseRepository {
  /**
   * Creates an instance of OrderRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} [sheetName='History'] The name of the Google Sheet where order history data is stored.
   */
  constructor(services, sheetName = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ORDER_HISTORY ? API_RESOURCES.ORDER_HISTORY.sheetName : 'History')) {
    if (!services || !services.apiClient || !services.sheetManager || !services.errorHandler || !services.headerMappingService) {
      throw new Error('OrderRepository: All services (apiClient, sheetManager, errorHandler, headerMappingService) are required.');
    }
    
    const resourceIdentifier = (typeof API_RESOURCES !== 'undefined' && API_RESOURCES.ORDER_HISTORY) ? 
      API_RESOURCES.ORDER_HISTORY.sheetName || 'ORDER_HISTORY' : 'ORDER_HISTORY';
      
    super(services, resourceIdentifier, sheetName);
  }

  /**
   * Fetches all order history from the API.
   * @param {Object} [params={}] - Optional query parameters (e.g., limit, cursor, ticker).
   * @returns {Promise<Array<OrderModel>>} A promise that resolves to an array of OrderModel instances.
   */
  async fetchAllOrderHistory(params = {}) {
    try {
      const apiCallFunction = () => this.apiClient.getOrderHistory(params);
      const rawOrderHistoryData = await this._fetchDataAndInitializeHeaders(
        apiCallFunction,
        OrderModel.getExpectedApiFieldPaths
      );

      if (!Array.isArray(rawOrderHistoryData)) {
        this._log(`Expected an array from apiClient.getOrderHistory(), but got: ${typeof rawOrderHistoryData}`, 'ERROR');
        throw new Error('Invalid data format received from API for order history.');
      }
      return rawOrderHistoryData.map(rawOrder => {
        try {
          return new OrderModel(rawOrder);
        } catch (modelError) {
          this._logError(modelError, `Error constructing OrderModel for raw data: ${JSON.stringify(rawOrder)}`);
          return null;
        }
      }).filter(order => order !== null);
    } catch (error) {
      this._logError(error, 'Failed to fetch all order history from API. Error will be re-thrown.');
      throw error;
    }
  }

  /**
   * Saves an array of OrderModel instances to the Google Sheet.
   * This will overwrite all existing data in the sheet.
   * @param {Array<OrderModel>} orders An array of OrderModel instances to save.
   * @returns {Promise<void>}
   */
  async saveOrderHistoryToSheet(orders) {
    if (!Array.isArray(orders) || !orders.every(o => o instanceof OrderModel)) {
      throw new Error('Invalid input: orders must be an array of OrderModel instances.');
    }
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(OrderModel.getExpectedApiFieldPaths);
        if (!success) {
          if (orders.length > 0) {
            await this._initializeHeaders(orders[0].toObject(), OrderModel.getExpectedApiFieldPaths);
          }
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers for order history data. Fetch data or ensure model provides fallbacks.');
          }
        }
      }
      const dataRows = orders.map(order => order.toSheetRow(this.effectiveHeaders));
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      await this.sheetManager.updateSheetData(this.sheetName, dataRows, transformedHeaderNames);
      this._log(`${orders.length} order history entries saved to sheet '${this.sheetName}'.`, 'INFO');
    } catch (error) {
      this._logError(error, 'Failed to save order history to Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
  
  /**
   * Fetches all order history from the API and saves it to the Google Sheet.
   * @param {Object} [params={}] - Optional query parameters.
   * @returns {Promise<Array<OrderModel>>} A promise that resolves to an array of OrderModel instances that were fetched and saved.
   */
  async fetchAndSaveAllOrderHistory(params = {}) {
    const orders = await this.fetchAllOrderHistory(params);
    if (orders.length > 0) {
      await this.saveOrderHistoryToSheet(orders);
    } else {
      this._log('No order history fetched from API, sheet not updated.', 'INFO');
    }
    return orders;
  }

  /**
   * Retrieves all order history from the Google Sheet.
   * @returns {Promise<Array<OrderModel>>} A promise that resolves to an array of OrderModel instances.
   */
  async getAllOrderHistoryFromSheet() {
    try {
      if (!this.effectiveHeaders) {
        const success = await this._tryInitializeHeadersFromStored(OrderModel.getExpectedApiFieldPaths);
        if (!success) {
          this._log('Headers not initialized for getAllOrderHistoryFromSheet. Attempting to fetch to initialize.', 'WARN');
          await this.fetchAllOrderHistory();
          if (!this.effectiveHeaders) {
            throw new Error('Failed to initialize headers even after fetching. Cannot get order history from sheet.');
          }
        }
      }
      const dataRows = await this.sheetManager.getAllData(this.sheetName);
      return this._transformSheetRowsToModels(dataRows, OrderModel);
    } catch (error) {
      this._logError(error, 'Failed to retrieve order history from Google Sheet. Error will be re-thrown.');
      throw error;
    }
  }
}
