/**
 * @fileoverview Service for managing header mappings between API responses and Google Sheets.
 * This service handles the generation, transformation, storage, and retrieval of header
 * configurations, allowing for dynamic header management and user overrides.
 */

// For Apps Script, SheetManager would typically be a global object or accessed via a services object.
// The extractHeaders function is available from data/dataProcessing.js

const HEADER_MAPPINGS_SHEET_NAME = 'HeaderMappings';
const API_RESOURCE_NAME_COLUMN_INDEX = 0; // Column A in 0-based indexing for arrays
const ORIGINAL_API_FIELD_PATH_COLUMN_INDEX = 1; // Column B
const TRANSFORMED_HEADER_NAME_COLUMN_INDEX = 2; // Column C
const USER_OVERRIDE_FLAG_COLUMN_INDEX = 3; // Column D

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
   *                         [{ apiFieldPath: 'id', transformedHeader: 'ID', userOverride: false }, ...].
   *                         Returns an empty array if no mappings are found or an error occurs.
   */
  getStoredHeaders(resourceIdentifier) {
    // Use getSheetData which returns data excluding headers
    const allMappingsData = this.sheetManager.getSheetData(HEADER_MAPPINGS_SHEET_NAME);
    if (!allMappingsData || allMappingsData.length === 0) {
      Logger.log(`HeaderMappingService.getStoredHeaders: No data found in '${HEADER_MAPPINGS_SHEET_NAME}'.`);
      return [];
    }

    const resourceMappings = [];
    for (let i = 0; i < allMappingsData.length; i++) {
      const row = allMappingsData[i];
      // Ensure row is not empty and has enough columns
      if (row && row.length > TRANSFORMED_HEADER_NAME_COLUMN_INDEX && row[API_RESOURCE_NAME_COLUMN_INDEX] === resourceIdentifier) {
        resourceMappings.push({
          apiFieldPath: row[ORIGINAL_API_FIELD_PATH_COLUMN_INDEX],
          transformedHeader: row[TRANSFORMED_HEADER_NAME_COLUMN_INDEX],
          userOverride: row[USER_OVERRIDE_FLAG_COLUMN_INDEX] === true || String(row[USER_OVERRIDE_FLAG_COLUMN_INDEX]).toUpperCase() === 'TRUE',
        });
      }
    }
    return resourceMappings;
  }

  /**
   * Stores new or updated header mappings for a given API resource in the 'HeaderMappings' sheet.
   * It intelligently merges new API field paths with existing stored mappings, preserving user overrides.
   * @param {string} resourceIdentifier - A unique name for the API resource.
   * @param {Array<string>} newApiFieldPaths - An array of current API field paths from the latest API response.
   */
  storeHeaders(resourceIdentifier, newApiFieldPaths) {
    // Get existing data and reconstruct with headers
    const existingData = this.sheetManager.getSheetData(HEADER_MAPPINGS_SHEET_NAME) || [];
    const headers = ['API Resource Name', 'Original API Field Path', 'Transformed Header Name', 'User Override Flag'];
    
    // Segregate mappings for the current resource from others
    const otherResourceRows = [];
    const currentResourceStoredMappings = new Map(); // Use Map for efficient lookup of existing mappings

    if (existingData.length > 0) {
        for (let i = 0; i < existingData.length; i++) {
            const row = existingData[i];
            if (row[API_RESOURCE_NAME_COLUMN_INDEX] === resourceIdentifier) {
                currentResourceStoredMappings.set(row[ORIGINAL_API_FIELD_PATH_COLUMN_INDEX], {
                    transformedHeader: row[TRANSFORMED_HEADER_NAME_COLUMN_INDEX],
                    userOverride: row[USER_OVERRIDE_FLAG_COLUMN_INDEX] === true || String(row[USER_OVERRIDE_FLAG_COLUMN_INDEX]).toUpperCase() === 'TRUE',
                });
            } else {
                otherResourceRows.push(row);
            }
        }
    }
    
    // Start with other resources' mappings
    let updatedDataRows = otherResourceRows;

    // Process new API field paths for the current resource
    newApiFieldPaths.forEach(apiFieldPath => {
      const existingMapping = currentResourceStoredMappings.get(apiFieldPath);
      if (existingMapping) {
        // Preserve existing mapping, especially user overrides
        updatedDataRows.push([
          resourceIdentifier,
          apiFieldPath,
          existingMapping.transformedHeader,
          existingMapping.userOverride
        ]);
      } else {
        // New field path, generate transformed header
        updatedDataRows.push([
          resourceIdentifier,
          apiFieldPath,
          this.transformHeaderName(apiFieldPath),
          false // Not overridden by default
        ]);
      }
    });
    
    // (Optional) Handle field paths that were in stored mappings but not in newApiFieldPaths (deprecated fields).
    // For now, they are effectively removed for this resourceIdentifier as we rebuild its section.
    // If they need to be preserved with a "deprecated" status, logic would be added here.

    this.sheetManager.updateSheetData(HEADER_MAPPINGS_SHEET_NAME, updatedDataRows, headers);
    Logger.log(`HeaderMappingService.storeHeaders: Stored/Updated headers for resource: ${resourceIdentifier}.`);
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
      if (mapping && mapping.userOverride) {
        return mapping.transformedHeader; // Use user-overridden name
      }
      if (mapping) {
        return mapping.transformedHeader; // Use stored transformed name
      }
      return this.transformHeaderName(apiFieldPath); // Transform on-the-fly if not stored
    });
  }
  
  /**
   * Detects changes (new or removed fields) between the latest API response headers
   * and the currently stored headers for a given resource.
   * @param {string} resourceIdentifier - The API resource identifier.
   * @param {Array<string>} newApiFieldPaths - Array of API field paths from the latest API response.
   * @return {{newFields: Array<string>, removedFields: Array<string>}} An object detailing new and removed fields.
   */
  detectAndLogHeaderChanges(resourceIdentifier, newApiFieldPaths) {
    const storedMappings = this.getStoredHeaders(resourceIdentifier);
    const storedApiFieldPaths = storedMappings.map(m => m.apiFieldPath);

    const newFields = newApiFieldPaths.filter(path => !storedApiFieldPaths.includes(path));
    const removedFields = storedApiFieldPaths.filter(path => !newApiFieldPaths.includes(path));

    if (newFields.length > 0) {
      Logger.log(`HeaderMappingService.detectAndLogHeaderChanges: New fields detected for ${resourceIdentifier}: ${newFields.join(', ')}`);
      // Potentially flag for user review or auto-add them via storeHeaders
    }
    if (removedFields.length > 0) {
      Logger.log(`HeaderMappingService.detectAndLogHeaderChanges: Removed fields detected for ${resourceIdentifier}: ${removedFields.join(', ')}`);
      // Potentially flag for user review or mark as deprecated in HeaderMappings sheet
    }
    return { newFields, removedFields };
  }

  /**
   * Retrieves the complete header configuration for a resource, including API paths, transformed names, and override status.
   * This is useful for UI display or detailed repository logic.
   * @param {string} resourceIdentifier - The API resource identifier.
   * @param {Array<string>} currentApiFieldPaths - Optional. If provided, the result will be aligned with these paths,
   *                                             generating default transformations for any paths not found in storage.
   *                                             If not provided, returns all stored mappings for the resource.
   * @return {Array<Object>} An array of objects: { apiFieldPath: string, transformedHeader: string, userOverride: boolean }
   */
  getHeaderConfiguration(resourceIdentifier, currentApiFieldPaths = null) {
    const storedMappings = this.getStoredHeaders(resourceIdentifier);
    
    if (!currentApiFieldPaths) {
      // Return all stored mappings if no specific field paths are requested
      return storedMappings;
    }

    const mappingLookup = new Map(storedMappings.map(m => [m.apiFieldPath, m]));
    const config = currentApiFieldPaths.map(apiFieldPath => {
      const stored = mappingLookup.get(apiFieldPath);
      if (stored) {
        return {
          apiFieldPath: apiFieldPath,
          transformedHeader: stored.transformedHeader,
          userOverride: stored.userOverride
        };
      } else {
        // Path from API not found in storage, generate default
        return {
          apiFieldPath: apiFieldPath,
          transformedHeader: this.transformHeaderName(apiFieldPath),
          userOverride: false
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
