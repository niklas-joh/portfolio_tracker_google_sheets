/**
 * Includes the content of another HTML file.
 *
 * @param {string} filename - The name of the HTML file to include.
 * @returns {string} The content of the specified file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Function triggered when the "Start Setup" button is clicked.
 * Guides the user through initial setup and creates html/api_setup.html
 */
function startSetupProcess() {
  showCustomModal('Select Environment', 'html/api_setup.html');
}

/**
 * Function to save the API key and selected environment.
 * @param {string} apiKey - The API key entered by the user.
 * @param {string} environment - The environment ('demo' or 'live').
 */
function saveApiKey(apiKey, environment) {
  const userProperties = PropertiesService.getUserProperties();
  const apiKeyProperty = environment === 'live' ? 'API_KEY_LIVE' : 'API_KEY_DEMO';
  // TO DO: Check if API is correct by calling Trading212 API

  userProperties.setProperty(apiKeyProperty, apiKey);
  userProperties.setProperty('SELECTED_ENVIRONMENT', environment); // Save the environment choice
}

/**
 * Reusable function to show a custom modal dialog with consistent design.
 * @param {string} title - The title of the modal.
 * @param {string} htmlFile - The HTML file to load for the modal content.
 */

function showCustomModal(title, htmlFile) {
  const template = HtmlService.createTemplateFromFile(htmlFile);
  template.title = title;

  const htmlContent = template.evaluate()
    .setWidth(500)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(htmlContent, title);
}