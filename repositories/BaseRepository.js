/**
 * @fileoverview Defines the BaseRepository class that serves as a foundation for all repositories.
 * Provides common functionality for repository operations including dynamic header management.
 */

/**
 * Base Repository class providing common functionality for all repositories.
 * Handles integration with HeaderMappingService and provides methods for transforming
 * data between API responses, model instances, and sheet rows.
 */
class BaseRepository {
  /**
   * Creates an instance of BaseRepository.
   * @param {Object} services - An object containing necessary service instances.
   * @param {Trading212ApiClient} services.apiClient The API client for fetching data.
   * @param {SheetManager} services.sheetManager The manager for interacting with Google Sheets.
   * @param {ErrorHandler} services.errorHandler The error handler instance.
   * @param {HeaderMappingService} services.headerMappingService The service for managing dynamic headers.
   * @param {string} resourceIdentifier The identifier for this resource in the HeaderMappingService.
   * @param {string} sheetName The name of the Google Sheet where data is stored.
   */
  constructor(services, resourceIdentifier, sheetName) {
    const { apiClient, sheetManager, errorHandler, headerMappingService } = services;

    if (!apiClient) {
      throw new Error('BaseRepository: services.apiClient is required.');
    }
    if (!sheetManager) {
      throw new Error('BaseRepository: services.sheetManager is required.');
    }
    if (!errorHandler) {
      throw new Error('BaseRepository: services.errorHandler is required.');
    }
    if (!headerMappingService) {
      throw new Error('BaseRepository: services.headerMappingService is required.');
    }
    if (!resourceIdentifier) {
      throw new Error('BaseRepository: resourceIdentifier is required.');
    }
    if (!sheetName) {
      throw new Error('BaseRepository: sheetName is required.');
    }
    
    /** @protected @const {Trading212ApiClient} */
    this.apiClient = apiClient;
    /** @protected @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @protected @const {ErrorHandler} */
    this.errorHandler = errorHandler;
    /** @protected @const {HeaderMappingService} */
    this.headerMappingService = headerMappingService;
    /** @protected @const {string} */
    this.resourceIdentifier = resourceIdentifier;
    /** @protected @const {string} */
    this.sheetName = sheetName;
    
    /** @protected {Array<{originalPath: string, transformedName: string, isUserOverride: boolean}>} */
    this.effectiveHeaders = null;
    
    // Initialize the sheet
    this.sheetManager.ensureSheetExists(this.sheetName);
  }
  
  /**
   * Fetches data from the API and initializes headers using the response.
   * @protected
   * @param {Function} apiFetchFunction Function that returns a Promise with API data.
   * @param {Function} fallbackFieldsGetter Function that returns fallback field paths.
   * @returns {Promise<Object>} The API response.
   */
  async _fetchDataAndInitializeHeaders(apiFetchFunction, fallbackFieldsGetter) {
    try {
      // Call the API fetch function
      const apiResponse = await apiFetchFunction();
      
      // Initialize headers using the response
      await this._initializeHeaders(apiResponse, fallbackFieldsGetter);
      
      return apiResponse;
    } catch (error) {
      this._logError(error, `Error fetching data and initializing headers for ${this.resourceIdentifier}.`);
      throw error;
    }
  }
  
  /**
   * Initializes or updates the headers for this repository based on an API response.
   * @protected
   * @param {Object} apiResponse The API response object.
   * @param {Function} fallbackFieldsGetter Function that returns fallback field paths.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async _initializeHeaders(apiResponse, fallbackFieldsGetter) {
    try {
      // Generate headers from the API response
      const apiHeaders = this.headerMappingService.generateHeadersFromApiResponse(
        apiResponse, fallbackFieldsGetter);
      
      if (!apiHeaders || apiHeaders.length === 0) {
        this._log(`No headers generated from API response for ${this.resourceIdentifier}.`, 'WARN');
        return false;
      }
      
      // Transform the headers to user-friendly names
      const transformedHeaders = apiHeaders.map(path => 
        this.headerMappingService.transformHeaderName(path));
      
      // Store the headers in the HeaderMappingService
      const stored = this.headerMappingService.storeHeaders(
        this.resourceIdentifier, apiHeaders, transformedHeaders);
      
      if (!stored) {
        this._log(`Failed to store headers for ${this.resourceIdentifier}.`, 'WARN');
        return false;
      }
      
      // Get the effective headers (with user overrides applied)
      this.effectiveHeaders = this.headerMappingService.getStoredHeaders(this.resourceIdentifier);
      
      // Set the headers in the sheet
      const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
      this.sheetManager.setHeaders(this.sheetName, transformedHeaderNames);
      
      return true;
    } catch (error) {
      this._logError(error, `Error initializing headers for ${this.resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Attempts to initialize headers from already stored headers.
   * @protected
   * @param {Function} fallbackFieldsGetter Function that returns fallback field paths.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async _tryInitializeHeadersFromStored(fallbackFieldsGetter) {
    try {
      // Check if we already have stored headers
      const storedHeaders = this.headerMappingService.getStoredHeaders(this.resourceIdentifier);
      
      if (storedHeaders && storedHeaders.length > 0) {
        // We have stored headers, use them
        this.effectiveHeaders = storedHeaders;
        
        // Set the headers in the sheet
        const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
        this.sheetManager.setHeaders(this.sheetName, transformedHeaderNames);
        
        return true;
      }
      
      // No stored headers, but we can generate some from fallback fields
      if (typeof fallbackFieldsGetter === 'function') {
        const fallbackPaths = fallbackFieldsGetter();
        
        if (fallbackPaths && fallbackPaths.length > 0) {
          // Transform the headers to user-friendly names
          const transformedHeaders = fallbackPaths.map(path => 
            this.headerMappingService.transformHeaderName(path));
          
          // Store the headers in the HeaderMappingService
          const stored = this.headerMappingService.storeHeaders(
            this.resourceIdentifier, fallbackPaths, transformedHeaders);
          
          if (stored) {
            // Get the effective headers
            this.effectiveHeaders = this.headerMappingService.getStoredHeaders(this.resourceIdentifier);
            
            // Set the headers in the sheet
            const transformedHeaderNames = this.effectiveHeaders.map(h => h.transformedName);
            this.sheetManager.setHeaders(this.sheetName, transformedHeaderNames);
            
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      this._logError(error, `Error initializing headers from stored values for ${this.resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Transforms an array of API response objects to sheet rows using dynamic headers.
   * @protected
   * @param {Array<Object>} dataArray Array of API response objects or model instances.
   * @returns {Array<Array<any>>} Array of sheet rows.
   */
  _transformDataToSheetRows(dataArray) {
    try {
      // Ensure we have headers
      if (!this.effectiveHeaders || this.effectiveHeaders.length === 0) {
        throw new Error(`No headers initialized for ${this.resourceIdentifier}.`);
      }
      
      // Handle empty array
      if (!dataArray || dataArray.length === 0) {
        return [];
      }
      
      // Transform each item to a sheet row
      return dataArray.map(item => {
        // Check if this is a model instance with a toSheetRow method
        if (item && typeof item.toSheetRow === 'function') {
          return item.toSheetRow(this.effectiveHeaders);
        }
        
        // Otherwise, map each header to a value using dot notation
        return this.effectiveHeaders.map(header => {
          try {
            return resolveNestedField(item, header.originalPath);
          } catch (e) {
            this._log(`Error resolving field ${header.originalPath}: ${e.message}`, 'WARN');
            return '';
          }
        });
      });
    } catch (error) {
      this._logError(error, `Error transforming data to sheet rows for ${this.resourceIdentifier}.`);
      throw error;
    }
  }
  
  /**
   * Transforms sheet rows to model instances using dynamic headers.
   * @protected
   * @param {Array<Array<any>>} sheetRows Array of sheet rows.
   * @param {Function} ModelClass The model class constructor.
   * @returns {Array<any>} Array of model instances.
   */
  _transformSheetRowsToModels(sheetRows, ModelClass) {
    try {
      // Ensure we have headers
      if (!this.effectiveHeaders || this.effectiveHeaders.length === 0) {
        throw new Error(`No headers initialized for ${this.resourceIdentifier}.`);
      }
      
      // Handle empty array
      if (!sheetRows || sheetRows.length === 0) {
        return [];
      }
      
      // Check if ModelClass has a fromSheetRow method
      if (typeof ModelClass !== 'function' || typeof ModelClass.fromSheetRow !== 'function') {
        throw new Error(`ModelClass must have a static fromSheetRow method.`);
      }
      
      // Transform each row to a model instance
      return sheetRows.map(row => {
        try {
          return ModelClass.fromSheetRow(row, this.effectiveHeaders);
        } catch (e) {
          this._log(`Error creating model instance from row: ${e.message}`, 'WARN');
          return null;
        }
      }).filter(model => model !== null); // Filter out null models
    } catch (error) {
      this._logError(error, `Error transforming sheet rows to models for ${this.resourceIdentifier}.`);
      throw error;
    }
  }
  
  /**
   * Logs a message using the error handler.
   * @protected
   * @param {string} message The message to log.
   * @param {string} [level='INFO'] The log level.
   */
  _log(message, level = 'INFO') {
    if (this.errorHandler && typeof this.errorHandler.log === 'function') {
      this.errorHandler.log(`[${this.constructor.name}] ${message}`, level);
    } else {
      Logger.log(`[${level}][${this.constructor.name}] ${message}`);
    }
  }
  
  /**
   * Logs an error using the error handler.
   * @protected
   * @param {Error} error The error to log.
   * @param {string} message An additional message.
   */
  _logError(error, message) {
    if (this.errorHandler && typeof this.errorHandler.logError === 'function') {
      this.errorHandler.logError(error, `[${this.constructor.name}] ${message}`);
    } else {
      Logger.log(`ERROR: [${this.constructor.name}] ${message} - ${error.message}`);
      Logger.log(error.stack);
    }
  }
  
  /**
   * Fetches data from API, initializes headers, transforms data, and writes to sheet.
   * @public
   * @param {Function} apiFetchFunction Function that returns a Promise with API data.
   * @param {Function} dataExtractorFunction Function that extracts data array from API response.
   * @param {Function} fallbackFieldsGetter Function that returns fallback field paths.
   * @returns {Promise<Object>} Object containing the API response and write results.
   */
  async fetchAndPersistData(apiFetchFunction, dataExtractorFunction, fallbackFieldsGetter) {
    try {
      // Fetch data and initialize headers
      const apiResponse = await this._fetchDataAndInitializeHeaders(apiFetchFunction, fallbackFieldsGetter);
      
      // Extract the data array from the response
      const dataArray = dataExtractorFunction(apiResponse);
      
      if (!Array.isArray(dataArray)) {
        throw new Error('dataExtractorFunction must return an array.');
      }
      
      // Transform data to sheet rows
      const sheetRows = this._transformDataToSheetRows(dataArray);
      
      // Write data to sheet
      const writeResult = this.sheetManager.clearAndWriteData(this.sheetName, sheetRows);
      
      this._log(`Successfully fetched and persisted ${dataArray.length} records for ${this.resourceIdentifier}.`);
      
      return {
        apiResponse,
        recordCount: dataArray.length,
        writeResult
      };
    } catch (error) {
      this._logError(error, `Error in fetchAndPersistData for ${this.resourceIdentifier}.`);
      throw error;
    }
  }
  
  /**
   * Reads all data from the sheet and transforms it into model instances.
   * @public
   * @param {Function} ModelClass The model class constructor with static fromSheetRow method.
   * @param {Function} [fallbackFieldsGetter] Function that returns fallback field paths.
   * @returns {Promise<Array<any>>} Array of model instances.
   */
  async getAllModels(ModelClass, fallbackFieldsGetter) {
    try {
      // Ensure headers are initialized
      if (!this.effectiveHeaders || this.effectiveHeaders.length === 0) {
        const headersInitialized = await this._tryInitializeHeadersFromStored(fallbackFieldsGetter);
        
        if (!headersInitialized) {
          this._log(`Cannot retrieve models for ${this.resourceIdentifier}: headers not initialized and no fallback available.`, 'WARN');
          return [];
        }
      }
      
      // Get all data from the sheet
      const sheetRows = this.sheetManager.getAllData(this.sheetName);
      
      // Transform sheet rows to model instances
      const models = this._transformSheetRowsToModels(sheetRows, ModelClass);
      
      this._log(`Successfully retrieved ${models.length} model instances for ${this.resourceIdentifier}.`);
      
      return models;
    } catch (error) {
      this._logError(error, `Error in getAllModels for ${this.resourceIdentifier}.`);
      throw error;
    }
  }
}

// Global availability for GAS V8 runtime
