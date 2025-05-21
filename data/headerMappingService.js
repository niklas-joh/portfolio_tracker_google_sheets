/**
 * @fileoverview Service for managing header mappings between API field paths and displayed sheet headers.
 * This service handles extraction, transformation, storage, and retrieval of headers.
 */

/**
 * Manages the mapping between API field paths and displayed headers.
 * Handles header extraction, transformation, and persistence with support for user overrides.
 */
class HeaderMappingService {
  /**
   * Creates an instance of HeaderMappingService.
   * @param {SheetManager} sheetManager The sheet manager instance.
   * @param {ErrorHandler} errorHandler The error handler instance.
   */
  constructor(sheetManager, errorHandler) {
    if (!sheetManager) {
      throw new Error('HeaderMappingService: sheetManager is required.');
    }
    if (!errorHandler) {
      throw new Error('HeaderMappingService: errorHandler is required.');
    }
    
    /** @private @const {SheetManager} */
    this.sheetManager = sheetManager;
    /** @private @const {ErrorHandler} */
    this.errorHandler = errorHandler;
    /** @private @const {string} */
    this.sheetName = 'HeaderMappings';
    /** @private @const {Array<string>} */
    this.sheetHeaders = ['API Resource Name', 'Original API Field Path', 'Transformed Header Name', 'User Override Flag'];
    
    // Define the available API resources - this could be moved to a constants file
    /** @private @const {Object} */
    this.apiResources = {
      DIVIDENDS: { sheetName: 'Dividends' },
      PIES: { sheetName: 'Pies' },
      PIE_ITEMS: { sheetName: 'PieItems' },
      TRANSACTIONS: { sheetName: 'Transactions' }
    };
    
    // Initialize the sheet if it doesn't exist
    this.sheetManager.ensureSheetExists(this.sheetName);
    this.sheetManager.setHeaders(this.sheetName, this.sheetHeaders);
    
    /** @private @type {Object.<string, Object.<string, {change: string, timestamp: string}>>} */
    this.detectedChanges = {};
  }
  
  /**
   * Gets a list of all available resource identifiers.
   * @returns {Array<string>} Array of resource identifiers.
   */
  getAvailableResources() {
    return Object.keys(this.apiResources);
  }
  
  /**
   * Extracts header paths from an API response object.
   * @param {Object} apiResponseObject The API response object.
   * @param {Function} [fallbackFieldsGetter] Optional function that returns fallback field paths.
   * @returns {Array<string>} Array of field paths.
   */
  generateHeadersFromApiResponse(apiResponseObject, fallbackFieldsGetter) {
    try {
      // If the API response is an array, use the first item
      const sampleObject = Array.isArray(apiResponseObject) && apiResponseObject.length > 0 ? 
        apiResponseObject[0] : apiResponseObject;
      
      if (!sampleObject || typeof sampleObject !== 'object') {
        this._log('Invalid API response object for header extraction.', 'WARN');
        
        // Use fallback field paths if available
        if (typeof fallbackFieldsGetter === 'function') {
          const fallbackPaths = fallbackFieldsGetter();
          this._log(`Using ${fallbackPaths.length} fallback field paths for header extraction.`, 'INFO');
          return fallbackPaths;
        }
        
        return [];
      }
      
      // Extract headers using data processing utility function
      let headerPaths = [];
      if (typeof extractHeaders === 'function') {
        // Use the existing utility function
        headerPaths = extractHeaders(sampleObject);
      } else {
        // Fallback to our own implementation
        headerPaths = this._extractHeadersFromObject(sampleObject);
      }
      
      // Remove any empty paths and sort
      headerPaths = headerPaths.filter(path => path && path.trim() !== '').sort();
      
      // Use fallback field paths to fill any missing expected fields
      if (typeof fallbackFieldsGetter === 'function') {
        const fallbackPaths = fallbackFieldsGetter();
        const missingPaths = fallbackPaths.filter(path => !headerPaths.includes(path));
        
        if (missingPaths.length > 0) {
          this._log(`Adding ${missingPaths.length} expected fields missing from API response.`, 'INFO');
          headerPaths = headerPaths.concat(missingPaths).sort();
        }
      }
      
      return headerPaths;
    } catch (error) {
      this._logError(error, 'Error generating headers from API response.');
      return [];
    }
  }
  
  /**
   * Transforms a dot-notation API field path to a human-readable header name.
   * @param {string} apiFieldPath The API field path (e.g., 'amount.value').
   * @returns {string} The transformed header name (e.g., 'Amount Value').
   */
  transformHeaderName(apiFieldPath) {
    try {
      if (!apiFieldPath) {
        return '';
      }
      
      // Split by dot notation
      const parts = apiFieldPath.split('.');
      
      // Transform each part
      const transformedParts = parts.map(part => {
        // Handle camelCase, snake_case, kebab-case
        return part
          // Add space before uppercase letters
          .replace(/([A-Z])/g, ' $1')
          // Replace underscores and hyphens with spaces
          .replace(/[_-]/g, ' ')
          // Trim any leading/trailing spaces
          .trim()
          // Title case (capitalize first letter of each word)
          .replace(/\w\S*/g, txt => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          });
      });
      
      // Join with spaces
      return transformedParts.join(' ');
    } catch (error) {
      this._logError(error, `Error transforming header name for ${apiFieldPath}.`);
      // Return original as fallback
      return apiFieldPath;
    }
  }
  
  /**
   * Gets the stored headers for a specific resource.
   * @param {string} resourceIdentifier The resource identifier.
   * @returns {Array<{originalPath: string, transformedName: string, isUserOverride: boolean}>} Array of header objects.
   */
  getStoredHeaders(resourceIdentifier) {
    try {
      // Validate resource identifier
      if (!resourceIdentifier || !this.apiResources[resourceIdentifier]) {
        this._log(`Invalid resource identifier: ${resourceIdentifier}`, 'WARN');
        return [];
      }
      
      // Get all sheet data
      const sheetData = this.sheetManager.getSheetDataSync(this.sheetName);
      
      // Filter rows for the specific resource and map to header objects
      const headers = sheetData
        .filter(row => row[0] === resourceIdentifier)
        .map(row => ({
          originalPath: row[1],
          transformedName: row[2],
          isUserOverride: row[3] === 'TRUE'
        }));
      
      return headers;
    } catch (error) {
      this._logError(error, `Error getting stored headers for ${resourceIdentifier}.`);
      return [];
    }
  }
  
  /**
   * Stores headers for a specific resource.
   * @param {string} resourceIdentifier The resource identifier.
   * @param {Array<string>} apiHeaders Array of API field paths.
   * @param {Array<string>} [transformedHeaders] Optional array of pre-transformed header names.
   * @returns {boolean} True if successful, false otherwise.
   */
  storeHeaders(resourceIdentifier, apiHeaders, transformedHeaders) {
    try {
      // Validate inputs
      if (!resourceIdentifier || !this.apiResources[resourceIdentifier]) {
        this._log(`Invalid resource identifier: ${resourceIdentifier}`, 'WARN');
        return false;
      }
      
      if (!Array.isArray(apiHeaders) || apiHeaders.length === 0) {
        this._log(`Invalid or empty apiHeaders array for ${resourceIdentifier}.`, 'WARN');
        return false;
      }
      
      // Get existing headers for this resource
      const existingHeaders = this.getStoredHeaders(resourceIdentifier);
      const existingPathMap = {};
      existingHeaders.forEach(header => {
        existingPathMap[header.originalPath] = header;
      });
      
      // Transform headers if not provided
      const headerMappings = apiHeaders.map((path, index) => {
        const existingHeader = existingPathMap[path];
        
        // If this is an existing header with a user override, preserve it
        if (existingHeader && existingHeader.isUserOverride) {
          return {
            resourceIdentifier,
            originalPath: path,
            transformedName: existingHeader.transformedName,
            isUserOverride: true
          };
        }
        
        // Otherwise, use the provided transformed header or generate a new one
        const transformedName = transformedHeaders && transformedHeaders[index] ?
          transformedHeaders[index] : this.transformHeaderName(path);
        
        return {
          resourceIdentifier,
          originalPath: path,
          transformedName,
          isUserOverride: false
        };
      });
      
      // Convert to sheet rows
      const sheetRows = headerMappings.map(mapping => [
        mapping.resourceIdentifier,
        mapping.originalPath,
        mapping.transformedName,
        mapping.isUserOverride ? 'TRUE' : 'FALSE'
      ]);
      
      // Delete existing rows for this resource
      this._deleteHeadersForResource(resourceIdentifier);
      
      // Append new rows
      this.sheetManager.appendSheetData(this.sheetName, sheetRows);
      
      // Check for and record API changes
      this._detectHeaderChanges(resourceIdentifier, apiHeaders, existingHeaders);
      
      return true;
    } catch (error) {
      this._logError(error, `Error storing headers for ${resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Updates a header name for a specific API field path.
   * @param {string} resourceIdentifier The resource identifier.
   * @param {string} originalPath The original API field path.
   * @param {string} newTransformedName The new transformed header name.
   * @param {boolean} isUserOverride Whether this is a user override.
   * @returns {boolean} True if successful, false otherwise.
   */
  updateHeaderName(resourceIdentifier, originalPath, newTransformedName, isUserOverride = true) {
    try {
      // Get all stored headers for this resource
      const allHeaders = this.getStoredHeaders(resourceIdentifier);
      
      // Find the header to update
      const headerToUpdate = allHeaders.find(h => h.originalPath === originalPath);
      
      if (!headerToUpdate) {
        this._log(`Header not found for path: ${originalPath} in resource: ${resourceIdentifier}`, 'WARN');
        return false;
      }
      
      // Update the header
      headerToUpdate.transformedName = newTransformedName;
      headerToUpdate.isUserOverride = isUserOverride;
      
      // Convert all headers back to sheet rows
      const sheetRows = allHeaders.map(header => [
        resourceIdentifier,
        header.originalPath,
        header.transformedName,
        header.isUserOverride ? 'TRUE' : 'FALSE'
      ]);
      
      // Delete existing rows for this resource
      this._deleteHeadersForResource(resourceIdentifier);
      
      // Append the updated rows
      this.sheetManager.appendSheetData(this.sheetName, sheetRows);
      
      return true;
    } catch (error) {
      this._logError(error, `Error updating header name for ${originalPath} in ${resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Resets a header to its default transformed name.
   * @param {string} resourceIdentifier The resource identifier.
   * @param {string} originalPath The original API field path.
   * @returns {boolean} True if successful, false otherwise.
   */
  resetHeaderToDefault(resourceIdentifier, originalPath) {
    try {
      // Generate the default transformed name
      const defaultName = this.transformHeaderName(originalPath);
      
      // Update the header with the default name and set isUserOverride to false
      return this.updateHeaderName(resourceIdentifier, originalPath, defaultName, false);
    } catch (error) {
      this._logError(error, `Error resetting header for ${originalPath} in ${resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Applies user overrides to a set of headers.
   * @param {string} resourceIdentifier The resource identifier.
   * @param {Array<{originalPath: string, transformedName: string}>} currentHeaders The current headers.
   * @returns {Array<{originalPath: string, transformedName: string}>} Headers with overrides applied.
   */
  applyUserOverrides(resourceIdentifier, currentHeaders) {
    try {
      // Get stored headers with user overrides
      const storedHeaders = this.getStoredHeaders(resourceIdentifier);
      
      // Create a map of stored headers for quick lookup
      const storedHeaderMap = {};
      storedHeaders.forEach(header => {
        storedHeaderMap[header.originalPath] = header;
      });
      
      // Apply overrides to current headers
      return currentHeaders.map(header => {
        const storedHeader = storedHeaderMap[header.originalPath];
        
        // If this header exists in storage and has a user override, use the stored version
        if (storedHeader && storedHeader.isUserOverride) {
          return {
            originalPath: header.originalPath,
            transformedName: storedHeader.transformedName
          };
        }
        
        // Otherwise, keep the current header
        return header;
      });
    } catch (error) {
      this._logError(error, `Error applying user overrides for ${resourceIdentifier}.`);
      return currentHeaders;
    }
  }
  
  /**
   * Detects changes in API headers compared to stored headers.
   * @param {string} resourceIdentifier The resource identifier.
   * @param {Array<string>} newApiHeaders Array of new API field paths.
   * @param {Array<{originalPath: string}>} existingHeaders Array of existing header objects.
   * @private
   */
  _detectHeaderChanges(resourceIdentifier, newApiHeaders, existingHeaders) {
    try {
      if (!this.detectedChanges[resourceIdentifier]) {
        this.detectedChanges[resourceIdentifier] = {};
      }
      
      // Convert existing headers to a set of paths
      const existingPaths = new Set(existingHeaders.map(h => h.originalPath));
      const newPaths = new Set(newApiHeaders);
      
      // Find added fields (in new but not in existing)
      const added = Array.from(newPaths).filter(path => !existingPaths.has(path));
      
      // Find removed fields (in existing but not in new)
      const removed = Array.from(existingPaths).filter(path => !newPaths.has(path));
      
      // If we have changes, record them
      if (added.length > 0 || removed.length > 0) {
        this._log(`Detected header changes for ${resourceIdentifier}: +${added.length}, -${removed.length}`, 'INFO');
        
        // Record each change with a timestamp
        const timestamp = new Date().toISOString();
        
        added.forEach(path => {
          this.detectedChanges[resourceIdentifier][path] = {
            change: 'added',
            timestamp
          };
        });
        
        removed.forEach(path => {
          this.detectedChanges[resourceIdentifier][path] = {
            change: 'removed',
            timestamp
          };
        });
      }
    } catch (error) {
      this._logError(error, `Error detecting header changes for ${resourceIdentifier}.`);
    }
  }
  
  /**
   * Gets the detected header changes for a resource.
   * @param {string} resourceIdentifier The resource identifier.
   * @returns {Object} Object with 'added' and 'removed' arrays of field paths.
   */
  getDetectedChanges(resourceIdentifier) {
    try {
      if (!this.detectedChanges[resourceIdentifier]) {
        return { added: [], removed: [] };
      }
      
      const changes = this.detectedChanges[resourceIdentifier];
      const result = {
        added: [],
        removed: []
      };
      
      // Group changes by type
      Object.keys(changes).forEach(path => {
        if (changes[path].change === 'added') {
          result.added.push(path);
        } else if (changes[path].change === 'removed') {
          result.removed.push(path);
        }
      });
      
      return result;
    } catch (error) {
      this._logError(error, `Error getting detected changes for ${resourceIdentifier}.`);
      return { added: [], removed: [] };
    }
  }
  
  /**
   * Extracts header paths from an object recursively.
   * @param {Object} obj The object to extract headers from.
   * @param {string} [prefix=''] The current path prefix.
   * @param {Set<string>} [result=new Set()] The accumulated result set.
   * @returns {Array<string>} Array of field paths.
   * @private
   */
  _extractHeadersFromObject(obj, prefix = '', result = new Set()) {
    if (!obj || typeof obj !== 'object') {
      return Array.from(result);
    }
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recurse into nested objects
        this._extractHeadersFromObject(value, path, result);
      } else {
        // Add the current path
        result.add(path);
      }
    });
    
    return Array.from(result);
  }
  
  /**
   * Deletes all header rows for a specific resource.
   * @param {string} resourceIdentifier The resource identifier.
   * @returns {boolean} True if successful, false otherwise.
   * @private
   */
  _deleteHeadersForResource(resourceIdentifier) {
    try {
      // Get the sheet
      const sheet = this.sheetManager.getSheet(this.sheetName);
      
      if (!sheet) {
        this._log(`Sheet not found: ${this.sheetName}`, 'WARN');
        return false;
      }
      
      // Get all data
      const data = sheet.getDataRange().getValues();
      
      // Skip the header row
      const rows = data.slice(1);
      
      // Find rows for this resource
      const rowsToDelete = [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === resourceIdentifier) {
          // Add 2 to account for 0-based index and header row
          rowsToDelete.push(i + 2);
        }
      }
      
      // Delete rows from bottom to top to avoid shifting issues
      rowsToDelete.reverse().forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });
      
      return true;
    } catch (error) {
      this._logError(error, `Error deleting headers for ${resourceIdentifier}.`);
      return false;
    }
  }
  
  /**
   * Logs a message using the error handler.
   * @param {string} message The message to log.
   * @param {string} [level='INFO'] The log level.
   * @private
   */
  _log(message, level = 'INFO') {
    if (this.errorHandler && typeof this.errorHandler.log === 'function') {
      this.errorHandler.log(message, level);
    } else {
      Logger.log(`[${level}] ${message}`);
    }
  }
  
  /**
   * Logs an error using the error handler.
   * @param {Error} error The error to log.
   * @param {string} message An additional message.
   * @private
   */
  _logError(error, message) {
    if (this.errorHandler && typeof this.errorHandler.logError === 'function') {
      this.errorHandler.logError(error, message);
    } else {
      Logger.log(`ERROR: ${message} - ${error.message}`);
      Logger.log(error.stack);
    }
  }
}

// Helper function to resolve a nested field from an object using dot notation
function resolveNestedField(obj, path) {
  if (!obj || !path) return '';
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return '';
    }
    current = current[key];
  }
  
  return current !== undefined ? current : '';
}

// Helper function to set a nested property in an object using dot notation
function setNestedProperty(obj, path, value) {
  if (!obj || !path) return;
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Expose helper functions to be used by other modules
if (typeof globalThis !== 'undefined') {
  globalThis.resolveNestedField = resolveNestedField;
  globalThis.setNestedProperty = setNestedProperty;
}

// Global availability for GAS V8 runtime
