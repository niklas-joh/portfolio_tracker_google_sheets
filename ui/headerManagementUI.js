/**
 * @fileoverview Server-side functions for the Header Management UI.
 * Handles the connection between the UI and the HeaderMappingService.
 */

/**
 * Shows the Header Management UI as a modal dialog.
 * @param {HeaderMappingService} headerMappingService The service for managing dynamic headers.
 */
function showHeaderManagementUI(headerMappingService) {
  if (!headerMappingService) {
    throw new Error('headerMappingService is required to show the Header Management UI.');
  }
  
  // Get all available resources
  const resourceIds = headerMappingService.getAvailableResources();
  
  // Prepare resources for the UI
  const resources = resourceIds.map(resourceId => {
    return {
      id: resourceId,
      name: getResourceDisplayName(resourceId)
    };
  });
  
  // Create a template with the resources data
  const template = HtmlService.createTemplateFromFile('ui/headerManagement');
  template.resources = JSON.stringify(resources);
  
  // Evaluate the template to an HTML output
  const htmlOutput = template.evaluate()
    .setTitle('Header Management')
    .setWidth(800)
    .setHeight(600)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  
  // Show the UI
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Header Management');
}

/**
 * Converts a resource identifier to a user-friendly display name.
 * @param {string} resourceId The resource identifier (e.g., 'DIVIDENDS', 'PIE_ITEMS').
 * @returns {string} The user-friendly display name.
 */
function getResourceDisplayName(resourceId) {
  const resourceNameMap = {
    'DIVIDENDS': 'Dividends',
    'PIE_ITEMS': 'Pie Items',
    'PIES': 'Pies',
    'TRANSACTIONS': 'Transactions'
  };
  
  return resourceNameMap[resourceId] || resourceId;
}

/**
 * Gets all header mappings for a specific resource.
 * Called by the UI to populate the header mapping table.
 * @param {string} resourceIdentifier The resource identifier.
 * @returns {Array<{originalPath: string, transformedName: string, isOverride: boolean}>} Array of header mappings.
 */
function getHeaderMappingsForResource(resourceIdentifier) {
  try {
    // Get the HeaderMappingService instance
    const headerMappingService = getHeaderMappingServiceInstance_();
    
    // Get the stored headers for the resource
    const storedHeaders = headerMappingService.getStoredHeaders(resourceIdentifier);
    
    if (!storedHeaders || storedHeaders.length === 0) {
      Logger.log(`No headers found for resource: ${resourceIdentifier}`);
      return [];
    }
    
    // Return the headers in the format needed by the UI
    return storedHeaders.map(header => ({
      originalPath: header.originalPath,
      transformedName: header.transformedName,
      isOverride: header.isUserOverride
    }));
  } catch (error) {
    Logger.log(`Error getting header mappings for resource ${resourceIdentifier}: ${error.message}`);
    throw error;
  }
}

/**
 * Updates a header mapping with a user override.
 * Called by the UI when a user edits a header name.
 * @param {Object} params Parameters for the update.
 * @param {string} params.resourceIdentifier The resource identifier.
 * @param {string} params.originalPath The original API field path.
 * @param {string} params.newTransformedName The new user-defined header name.
 * @returns {boolean} True if the update was successful, false otherwise.
 */
function updateHeaderMapping(params) {
  try {
    if (!params || !params.resourceIdentifier || !params.originalPath || !params.newTransformedName) {
      Logger.log('Missing required parameters for updateHeaderMapping');
      return false;
    }
    
    // Get the HeaderMappingService instance
    const headerMappingService = getHeaderMappingServiceInstance_();
    
    // Update the header mapping
    const success = headerMappingService.updateHeaderName(
      params.resourceIdentifier,
      params.originalPath,
      params.newTransformedName,
      true // Set as user override
    );
    
    return success;
  } catch (error) {
    Logger.log(`Error updating header mapping: ${error.message}`);
    return false;
  }
}

/**
 * Resets a header mapping to its default generated value.
 * Called by the UI when a user clicks the reset button for a header.
 * @param {Object} params Parameters for the reset.
 * @param {string} params.resourceIdentifier The resource identifier.
 * @param {string} params.originalPath The original API field path.
 * @returns {boolean} True if the reset was successful, false otherwise.
 */
function resetHeaderMapping(params) {
  try {
    if (!params || !params.resourceIdentifier || !params.originalPath) {
      Logger.log('Missing required parameters for resetHeaderMapping');
      return false;
    }
    
    // Get the HeaderMappingService instance
    const headerMappingService = getHeaderMappingServiceInstance_();
    
    // Reset the header mapping to its default
    const success = headerMappingService.resetHeaderToDefault(
      params.resourceIdentifier,
      params.originalPath
    );
    
    return success;
  } catch (error) {
    Logger.log(`Error resetting header mapping: ${error.message}`);
    return false;
  }
}

/**
 * Gets information about detected changes in API fields for a resource.
 * Called by the UI to display notifications about field changes.
 * @param {string} resourceIdentifier The resource identifier.
 * @returns {Object} Object with arrays of added and removed fields.
 */
function getDetectedHeaderChanges(resourceIdentifier) {
  try {
    // Get the HeaderMappingService instance
    const headerMappingService = getHeaderMappingServiceInstance_();
    
    // Get the detected changes
    const changes = headerMappingService.getDetectedChanges(resourceIdentifier);
    
    return changes || { added: [], removed: [] };
  } catch (error) {
    Logger.log(`Error getting detected header changes: ${error.message}`);
    return { added: [], removed: [] };
  }
}

/**
 * Helper function to get a HeaderMappingService instance.
 * @private
 * @returns {HeaderMappingService} A HeaderMappingService instance.
 */
function getHeaderMappingServiceInstance_() {
  const sheetManager = new SheetManager();
  const errorHandler = new ErrorHandler('headerManagementUI');
  return new HeaderMappingService(sheetManager, errorHandler);
}
