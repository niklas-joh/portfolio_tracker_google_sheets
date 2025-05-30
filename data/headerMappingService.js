/**
 * @fileoverview Service for managing header mappings between API responses and Google Sheets.
 * This service handles the generation, transformation, storage, and retrieval of header
 * configurations, allowing for dynamic header management and user overrides.
 */

// For Apps Script, SheetManager would typically be a global object or accessed via a services object.
// The extractHeaders function is available from data/dataProcessing.js

const HEADER_MAPPINGS_SHEET_NAME = 'HeaderMappings';
const API_RESOURCE_NAME_COLUMN_INDEX = 0; // Column A
const ORIGINAL_API_FIELD_PATH_COLUMN_INDEX = 1; // Column B
const AUTO_TRANSFORMED_HEADER_NAME_COLUMN_INDEX = 2; // Column C (System Generated)
const USER_DEFINED_HEADER_NAME_COLUMN_INDEX = 3;   // Column D (User's Custom Name)

/**
 * The HeaderMappingService class.
 */
class HeaderMappingService {
  /**
   * Constructor for HeaderMappingService.
   * @param {SheetManager} sheetManager - An instance of SheetManager to interact with Google Sheets.
   */
  constructor(sheetManager) {
    this.sheetManager = sheetManager;
  }

  /**
   * Generates an array of unique API field paths (dot-notation) from a sample API response object or array.
   * @param {Object|Array<Object>} apiResponseObject - A sample object or array of objects from an API response.
   * @return {Array<string>} An array of unique API field paths (e.g., ['id', 'user.name', 'order.details.price']).
   *                         Returns an empty array if the input is invalid or contains no processable data.
   */
  generateApiFieldPaths(apiResponseObject) {
    if (!apiResponseObject) {
      Logger.log('HeaderMappingService.generateApiFieldPaths: apiResponseObject is null or undefined.');
      return [];
    }
    // Use the extractHeaders utility from data/dataProcessing.js
    const sample = Array.isArray(apiResponseObject) ? (apiResponseObject[0] || {}) : apiResponseObject;
     if (Object.keys(sample).length === 0) {
        Logger.log('HeaderMappingService.generateApiFieldPaths: Sample object is empty after processing input.');
        return [];
    }
    return extractHeaders(sample);
  }

  /**
   * Transforms a raw API field path (dot-notation) into a more readable, Title Case header name.
   * Example: 'amount.value' becomes 'Amount Value', 'dividend_gained' becomes 'Dividend Gained'.
   * @param {string} apiFieldPath - The raw API field path (e.g., 'some_field.nestedValue').
   * @return {string} The transformed, user-friendly header name. Returns an empty string for invalid input.
   */
  transformHeaderName(apiFieldPath) {
    if (!apiFieldPath || typeof apiFieldPath !== 'string') {
      Logger.log(`HeaderMappingService.transformHeaderName: Invalid apiFieldPath: ${apiFieldPath}`);
      return '';
    }
    return apiFieldPath
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\./g, ' ') // Replace dots with spaces
      .trim() // Remove leading/trailing spaces that might result from replacements
      .split(' ')
      .filter(word => word.length > 0) // Remove empty strings if multiple spaces occurred
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Retrieves all stored header mappings for a given API resource from the 'HeaderMappings' sheet.
   * @param {string} resourceIdentifier - A unique name for the API resource (e.g., 'DIVIDENDS_API').
   * @return {Array<Object>} An array of mapping objects, e.g.,
   *                         [{ apiFieldPath: 'id', autoTransformedHeader: 'ID', userDefinedHeader: '' }, ...].
   *                         Returns an empty array if no mappings are found or an error occurs.
   */
  getStoredHeaders(resourceIdentifier) {
    const allMappingsData = this.sheetManager.getSheetData(HEADER_MAPPINGS_SHEET_NAME);
    if (!allMappingsData || allMappingsData.length === 0) {
      Logger.log(`HeaderMappingService.getStoredHeaders: No data found in '${HEADER_MAPPINGS_SHEET_NAME}'.`);
      return [];
    }

    const resourceMappings = [];
    for (let i = 0; i < allMappingsData.length; i++) {
      const row = allMappingsData[i];
      // Ensure row is not empty and has enough columns
      if (row && row.length > USER_DEFINED_HEADER_NAME_COLUMN_INDEX && row[API_RESOURCE_NAME_COLUMN_INDEX] === resourceIdentifier) {
        resourceMappings.push({
          apiFieldPath: row[ORIGINAL_API_FIELD_PATH_COLUMN_INDEX],
          autoTransformedHeader: row[AUTO_TRANSFORMED_HEADER_NAME_COLUMN_INDEX],
          userDefinedHeader: row[USER_DEFINED_HEADER_NAME_COLUMN_INDEX] || '', // Default to empty string if undefined/null
        });
      }
    }
    return resourceMappings;
  }

  /**
   * Stores new or updated header mappings for a given API resource in the 'HeaderMappings' sheet.
   * It merges new API field paths with existing stored mappings, preserving user-defined header names.
   * @param {string} resourceIdentifier - A unique name for the API resource.
   * @param {Array<string>} newApiFieldPaths - An array of current API field paths from the latest API response.
   */
  storeHeaders(resourceIdentifier, newApiFieldPaths) {
    // Get all data from the sheet ONCE.
    const allSheetDataIncludingCurrentResource = this.sheetManager.getSheetData(HEADER_MAPPINGS_SHEET_NAME) || [];
    const headers = ['API Resource Name', 'Original API Field Path', 'Auto Transformed Header Name', 'User Defined Header Name'];

    // Build the map of existing user-defined names for the CURRENT resource from this single read.
    const currentUserMappings = new Map();
    allSheetDataIncludingCurrentResource.forEach(row => {
      if (row[API_RESOURCE_NAME_COLUMN_INDEX] === resourceIdentifier && row.length > USER_DEFINED_HEADER_NAME_COLUMN_INDEX) {
        currentUserMappings.set(row[ORIGINAL_API_FIELD_PATH_COLUMN_INDEX], row[USER_DEFINED_HEADER_NAME_COLUMN_INDEX] || '');
      }
    });
    
    // Filter out rows for OTHER resources to preserve them.
    const otherResourceRows = allSheetDataIncludingCurrentResource.filter(
      row => row[API_RESOURCE_NAME_COLUMN_INDEX] !== resourceIdentifier
    );
    
    let updatedDataRows = [...otherResourceRows]; // Start with other resources' mappings

    // Process new API field paths for the current resource
    newApiFieldPaths.forEach(apiFieldPath => {
      const autoTransformedName = this.transformHeaderName(apiFieldPath);
      // Get the preserved user-defined name, if any, from our map.
      const userDefinedName = currentUserMappings.get(apiFieldPath) || ''; 

      updatedDataRows.push([
        resourceIdentifier,
        apiFieldPath,
        autoTransformedName,
        userDefinedName
      ]);
    });
    
    this.sheetManager.setHeaders(HEADER_MAPPINGS_SHEET_NAME, headers);
    this.sheetManager.updateSheetData(HEADER_MAPPINGS_SHEET_NAME, updatedDataRows, headers);
    Logger.log(`HeaderMappingService.storeHeaders: Stored/Updated headers for resource: ${resourceIdentifier}.`);
  }

  /**
   * Gets the effective header name for a given API field path.
   * Uses the user-defined name if available, otherwise the auto-transformed name.
   * @param {Object} mapping - A mapping object { apiFieldPath, autoTransformedHeader, userDefinedHeader }.
   * @return {string} The effective header name.
   */
  _getEffectiveHeaderFromMapping(mapping) {
    if (mapping.userDefinedHeader && mapping.userDefinedHeader.trim() !== '') {
      return mapping.userDefinedHeader;
    }
    return mapping.autoTransformedHeader;
  }

  /**
   * Applies user overrides to a set of API field paths, returning their effective header names.
   * @param {string} resourceIdentifier - The API resource identifier.
   * @param {Array<string>} apiFieldPaths - An array of API field paths for which to get effective headers.
   * @return {Array<string>} An array of effective header names, in the same order as apiFieldPaths.
   */
  getEffectiveHeaders(resourceIdentifier, apiFieldPaths) {
    const storedMappings = this.getStoredHeaders(resourceIdentifier);
    const mappingLookup = new Map(storedMappings.map(m => [m.apiFieldPath, m]));

    return apiFieldPaths.map(apiFieldPath => {
      const mapping = mappingLookup.get(apiFieldPath);
      if (mapping) {
        return this._getEffectiveHeaderFromMapping(mapping);
      }
      // If not stored, transform on-the-fly (this becomes the autoTransformedHeader)
      return this.transformHeaderName(apiFieldPath); 
    });
  }
  
  /**
   * Detects changes (new or removed fields) between the latest API response headers
   * and the currently stored headers for a given resource.
   * @param {string} resourceIdentifier - The API resource identifier.
   * @param {Array<string>} newApiFieldPathsFromApi - Array of API field paths from the latest API response.
   * @return {{newFields: Array<string>, removedFields: Array<string>}} An object detailing new and removed fields.
   */
  detectAndLogHeaderChanges(resourceIdentifier, newApiFieldPathsFromApi) {
    const storedMappings = this.getStoredHeaders(resourceIdentifier);
    const storedApiFieldPathsInSheet = storedMappings.map(m => m.apiFieldPath);

    const newFields = newApiFieldPathsFromApi.filter(path => !storedApiFieldPathsInSheet.includes(path));
    const removedFields = storedApiFieldPathsInSheet.filter(path => !newApiFieldPathsFromApi.includes(path));

    if (newFields.length > 0) {
      Logger.log(`HeaderMappingService.detectAndLogHeaderChanges: New fields detected for ${resourceIdentifier}: ${newFields.join(', ')}`);
    }
    if (removedFields.length > 0) {
      Logger.log(`HeaderMappingService.detectAndLogHeaderChanges: Removed fields detected for ${resourceIdentifier}: ${removedFields.join(', ')}`);
    }
    return { newFields, removedFields };
  }

  /**
   * Retrieves the complete header configuration for a resource.
   * Each object includes the API path, its auto-transformed name, any user-defined name,
   * and the effective header name that will be used.
   * @param {string} resourceIdentifier - The API resource identifier.
   * @param {Array<string>} currentApiFieldPathsFromApi - Optional. If provided, the result will be aligned with these paths,
   *                                             generating default transformations for any paths not found in storage.
   *                                             If not provided, returns all stored mappings for the resource.
   * @return {Array<Object>} An array of objects: 
   *   { apiFieldPath: string, autoTransformedHeader: string, userDefinedHeader: string, effectiveHeader: string }
   */
  getHeaderConfiguration(resourceIdentifier, currentApiFieldPathsFromApi = null) {
    const storedMappings = this.getStoredHeaders(resourceIdentifier);
    
    if (!currentApiFieldPathsFromApi) {
      // Return all stored mappings if no specific field paths are requested
      return storedMappings.map(m => ({
        ...m,
        effectiveHeader: this._getEffectiveHeaderFromMapping(m)
      }));
    }

    const mappingLookup = new Map(storedMappings.map(m => [m.apiFieldPath, m]));
    const config = currentApiFieldPathsFromApi.map(apiFieldPath => {
      const stored = mappingLookup.get(apiFieldPath);
      if (stored) {
        return {
          apiFieldPath: apiFieldPath,
          autoTransformedHeader: stored.autoTransformedHeader,
          userDefinedHeader: stored.userDefinedHeader,
          effectiveHeader: this._getEffectiveHeaderFromMapping(stored)
        };
      } else {
        // Path from API not found in storage, generate default
        const autoName = this.transformHeaderName(apiFieldPath);
        return {
          apiFieldPath: apiFieldPath,
          autoTransformedHeader: autoName,
          userDefinedHeader: '',
          effectiveHeader: autoName // Effective is auto since userDefined is blank
        };
      }
    });
    return config;
  }
}

// Example of how it might be exposed or used in Apps Script environment
// function getHeaderMappingServiceInstance() {
//   const sheetMgr = getSheetManagerInstance(); // Assuming SheetManager is available
//   return new HeaderMappingService(sheetMgr);
// }
