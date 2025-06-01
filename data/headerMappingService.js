/**
 * @fileoverview Defines the HeaderMappingService class for managing dynamic header mappings.
 * This service handles generating headers from API responses, transforming them into user-friendly names,
 * and storing/retrieving these mappings for consistent sheet operations.
 */

/**
 * Service class for managing dynamic header mappings between API field paths and sheet column names.
 * It allows for user-friendly transformations and persistence of these mappings.
 */
class HeaderMappingService {
  constructor() {
    // Use ScriptProperties for persistent storage of header mappings
    this.propertiesService = PropertiesService.getScriptProperties();
    // A cache for frequently accessed mappings to reduce property service calls
    this.cache = CacheService.getScriptCache();
  }

  /**
   * Generates a list of original API field paths (headers) from an API response.
   * It prioritizes extracting from the actual API response, but falls back to a predefined
   * list if the response is empty or doesn't contain the expected structure.
   * @param {Object|Array<Object>} apiResponse The raw API response data.
   * @param {Function} fallbackFieldsGetter A function that returns an array of expected field paths if API response is empty.
   * @returns {Array<string>} An array of dot-separated original field paths.
   */
  generateHeadersFromApiResponse(apiResponse, fallbackFieldsGetter) {
    let headers = [];
    let sampleData = null;

    if (Array.isArray(apiResponse) && apiResponse.length > 0) {
      sampleData = apiResponse[0];
    } else if (typeof apiResponse === 'object' && apiResponse !== null) {
      sampleData = apiResponse;
    }

    if (sampleData) {
      // Assuming extractHeaders is a global utility function from dataProcessing.js
      headers = extractHeaders(sampleData);
    }

    // If no headers extracted from API response, use fallback
    if (headers.length === 0 && typeof fallbackFieldsGetter === 'function') {
      headers = fallbackFieldsGetter();
      Logger.log(`HeaderMappingService: Using fallback headers as no headers extracted from API response. Fallback: ${JSON.stringify(headers)}`);
    } else if (headers.length === 0) {
      Logger.log('HeaderMappingService: No headers could be generated from API response or fallback.');
    }

    return headers;
  }

  /**
   * Transforms an original API field path into a more user-friendly column name.
   * Example: "amount.value" -> "Amount Value", "creationDate" -> "Creation Date".
   * This is the default transformation; user overrides are handled by getStoredHeaders.
   * @param {string} originalPath The original dot-separated API field path.
   * @returns {string} The transformed, user-friendly header name.
   */
  transformHeaderName(originalPath) {
    if (!originalPath || typeof originalPath !== 'string') {
      return '';
    }
    // Replace dots with spaces, then capitalize each word
    return originalPath
      .split('.')
      .map(part => part.replace(/([A-Z])/g, ' $1')) // Add space before capital letters
      .map(part => part.charAt(0).toUpperCase() + part.slice(1)) // Capitalize first letter
      .join(' ');
  }

  /**
   * Stores the mapping between original API field paths and their transformed names
   * for a specific resource. This is typically called after initial API fetch.
   * @param {string} resourceIdentifier A unique key for the resource (e.g., 'PIES', 'TRANSACTIONS').
   * @param {Array<string>} originalHeaders An array of original dot-separated API field paths.
   * @param {Array<string>} transformedNames An array of user-friendly names corresponding to originalHeaders.
   * @returns {boolean} True if stored successfully, false otherwise.
   */
  storeHeaders(resourceIdentifier, originalHeaders, transformedNames) {
    if (!resourceIdentifier || !Array.isArray(originalHeaders) || !Array.isArray(transformedNames) || originalHeaders.length !== transformedNames.length) {
      Logger.log('HeaderMappingService: Invalid input for storeHeaders.');
      return false;
    }

    const mapping = originalHeaders.map((originalPath, index) => ({
      originalPath: originalPath,
      transformedName: transformedNames[index],
      isUserOverride: false // Initially, these are not user overrides
    }));

    try {
      const key = `HEADER_MAPPING_${resourceIdentifier.toUpperCase()}`;
      this.propertiesService.setProperty(key, JSON.stringify(mapping));
      this.cache.put(key, JSON.stringify(mapping)); // Also update cache
      Logger.log(`HeaderMappingService: Stored headers for ${resourceIdentifier}.`);
      return true;
    } catch (e) {
      Logger.log(`HeaderMappingService: Error storing headers for ${resourceIdentifier}: ${e.message}`);
      return false;
    }
  }

  /**
   * Retrieves the stored header mapping for a given resource.
   * This includes any user-defined overrides.
   * @param {string} resourceIdentifier A unique key for the resource.
   * @returns {Array<{originalPath: string, transformedName: string, isUserOverride: boolean}>|null}
   *          The array of header mapping objects, or null if not found.
   */
  getStoredHeaders(resourceIdentifier) {
    if (!resourceIdentifier) {
      return null;
    }
    const key = `HEADER_MAPPING_${resourceIdentifier.toUpperCase()}`;
    let mapping = null;

    // Try to get from cache first
    const cached = this.cache.get(key);
    if (cached) {
      mapping = JSON.parse(cached);
      Logger.log(`HeaderMappingService: Cache hit for ${resourceIdentifier} headers.`);
      return mapping;
    }

    // If not in cache, get from properties service
    const stored = this.propertiesService.getProperty(key);
    if (stored) {
      mapping = JSON.parse(stored);
      this.cache.put(key, stored); // Put in cache for next time
      Logger.log(`HeaderMappingService: Retrieved headers for ${resourceIdentifier} from properties.`);
      return mapping;
    }

    Logger.log(`HeaderMappingService: No stored headers found for ${resourceIdentifier}.`);
    return null;
  }

  /**
   * Updates a specific header's transformed name for a resource.
   * This is used for user overrides.
   * @param {string} resourceIdentifier The unique key for the resource.
   * @param {string} originalPath The original API field path of the header to update.
   * @param {string} newTransformedName The new user-friendly name.
   * @returns {boolean} True if updated successfully, false otherwise.
   */
  updateHeaderMapping(resourceIdentifier, originalPath, newTransformedName) {
    const currentMapping = this.getStoredHeaders(resourceIdentifier);
    if (!currentMapping) {
      Logger.log(`HeaderMappingService: Cannot update header. No existing mapping for ${resourceIdentifier}.`);
      return false;
    }

    let updated = false;
    const newMapping = currentMapping.map(header => {
      if (header.originalPath === originalPath) {
        updated = true;
        return { ...header, transformedName: newTransformedName, isUserOverride: true };
      }
      return header;
    });

    if (updated) {
      return this.storeHeaders(resourceIdentifier, newMapping.map(m => m.originalPath), newMapping.map(m => m.transformedName));
    }
    Logger.log(`HeaderMappingService: Original path '${originalPath}' not found in mapping for ${resourceIdentifier}.`);
    return false;
  }

  /**
   * Resets a specific header's transformed name to its default generated value.
   * @param {string} resourceIdentifier The unique key for the resource.
   * @param {string} originalPath The original API field path of the header to reset.
   * @returns {boolean} True if reset successfully, false otherwise.
   */
  resetHeaderMapping(resourceIdentifier, originalPath) {
    const currentMapping = this.getStoredHeaders(resourceIdentifier);
    if (!currentMapping) {
      Logger.log(`HeaderMappingService: Cannot reset header. No existing mapping for ${resourceIdentifier}.`);
      return false;
    }

    let reset = false;
    const newMapping = currentMapping.map(header => {
      if (header.originalPath === originalPath && header.isUserOverride) {
        reset = true;
        const defaultName = this.transformHeaderName(originalPath);
        return { ...header, transformedName: defaultName, isUserOverride: false };
      }
      return header;
    });

    if (reset) {
      return this.storeHeaders(resourceIdentifier, newMapping.map(m => m.originalPath), newMapping.map(m => m.transformedName));
    }
    Logger.log(`HeaderMappingService: Original path '${originalPath}' not found or not overridden for ${resourceIdentifier}.`);
    return false;
  }
}

// Global availability for GAS V8 runtime
