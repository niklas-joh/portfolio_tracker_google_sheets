// File: setup.gs

/**
 * Function triggered when the "Start Setup" button is clicked. Guides the user through initial setup.
 */
function startSetupProcess() {
  showEnvironmentSelectionModal();
}

/**
 * Function to show a modal where the user can select between the demo or live environment.
 */
function showEnvironmentSelectionModal() {
  showCustomModal('Select Environment', 'Please choose between the demo or live environment:', 'main/api_key_setup.html');
}

/**
 * Function to handle the selected environment and prompt for the API key setup.
 * @param {string} environment - The environment selected by the user ('demo' or 'live').
 */
function handleEnvironmentSelection(environment) {
  const userProperties = PropertiesService.getUserProperties();
  const apiKeyProperty = environment === 'live' ? 'API_KEY_LIVE' : 'API_KEY_DEMO';
  const existingApiKey = userProperties.getProperty(apiKeyProperty);

  if (existingApiKey) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      `API Key for ${environment} environment already exists.`,
      'Would you like to reset it?',
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.NO) {
      ui.alert('Keeping existing API key.');
      return;
    }
  }

  showApiKeyModal(environment);
}

/**
 * Function to show the API key modal based on the selected environment.
 * @param {string} environment - The environment for which the API key is being set.
 */
function showApiKeyModal(environment) {
  showCustomModal(`Enter API Key for ${environment} Environment`, 'Please enter your API key below:', 'main/api_key_setup.html');
}

/**
 * Function to save the API key and selected environment.
 * @param {string} apiKey - The API key entered by the user.
 * @param {string} environment - The environment ('demo' or 'live').
 */
function saveApiKey(apiKey, environment) {
  const userProperties = PropertiesService.getUserProperties();
  const apiKeyProperty = environment === 'live' ? 'API_KEY_LIVE' : 'API_KEY_DEMO';
  userProperties.setProperty(apiKeyProperty, apiKey);
  userProperties.setProperty('SELECTED_ENVIRONMENT', environment); // Save the environment choice
  SpreadsheetApp.getUi().alert(`API Key for ${environment} environment saved successfully.`);
}


/**
 * Reusable function to show a custom modal dialog with consistent design.
 * @param {string} title - The title of the modal.
 * @param {string} message - The message or body content of the modal.
 * @param {string} htmlFile - The HTML file to load for the modal content.
 */

function showCustomModal(title, message, htmlFile) {
  const template = HtmlService.createTemplateFromFile(htmlFile);
  template.title = title;
  template.message = message;

  const htmlContent = template.evaluate()
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(htmlContent, title);
}
