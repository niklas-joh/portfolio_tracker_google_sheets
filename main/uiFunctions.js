/**
 * @description Includes and evaluates HTML content from another file
 * @param {string} filename - The name of the file to include
 * @returns {string} The evaluated content of the file
 */
function include(filename, data) {
  const template = HtmlService.createTemplateFromFile(filename);
  template.data = data;  // Pass the data to the included template
  return template.evaluate().getContent();
}

/**
 * @description Saves the API key and environment selection to user properties
 * @param {string} apiKey - The API key to save
 * @param {string} environment - The selected environment ('demo' or 'live')
 * @returns {Object} Result of the save operation
 */
function saveApiSettings(apiKey, environment) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    // Store settings
    userProperties.setProperties({
      'API_KEY': apiKey,
      'ENVIRONMENT': environment,
      'SETUP_COMPLETE': 'true',
      'SETUP_TIMESTAMP': new Date().toISOString()
    });

    return {
      success: true,
      message: 'Settings saved successfully'
    };
  } catch (error) {
    console.error('Error saving settings:', error);
    return {
      success: false,
      error: 'Failed to save settings'
    };
  }
}

/**
 * @description Validates an API key with the selected environment
 * @param {string} apiKey - The API key to validate
 * @param {string} environment - The environment to validate against
 * @returns {Promise<Object>} Validation result
 */
async function validateApiKey(apiKey, environment) {
  try {
    // Here you would typically make an API call to validate the key
    // This is a placeholder for the actual API validation logic
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'API key validated successfully'
    };
  } catch (error) {
    console.error('API validation error:', error);
    return {
      success: false,
      error: 'Failed to validate API key'
    };
  }
}

/**
 * @description Gets the current setup status
 * @returns {Object} The current setup status and settings
 */
function getSetupStatus() {
  const userProperties = PropertiesService.getUserProperties();
  const properties = userProperties.getProperties();

  return {
    isComplete: properties.SETUP_COMPLETE === 'true',
    environment: properties.ENVIRONMENT,
    setupTimestamp: properties.SETUP_TIMESTAMP
  };
}

/**
 * @description Resets the setup, clearing all saved settings
 * @returns {Object} Result of the reset operation
 */
function resetSetup() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteAllProperties();

    return {
      success: true,
      message: 'Setup reset successfully'
    };
  } catch (error) {
    console.error('Error resetting setup:', error);
    return {
      success: false,
      error: 'Failed to reset setup'
    };
  }
}