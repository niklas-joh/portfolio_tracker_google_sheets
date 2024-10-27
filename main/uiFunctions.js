function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Setup')
    .addItem('Start Setup Wizard', 'startSetupProcess')
    .addToUi();
}

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
 * Function to initiate the setup process.
 * This creates a new ModalManager and initializes the journey with defined steps.
 */
function startSetupProcess() {
  const modalManager = createModalManager();
  const steps = defineSetupSteps();
  modalManager.initializeJourney(steps);
}

/**
 * Creates and returns a new ModalManager instance.
 * @returns {ModalManager} A new ModalManager instance.
 */
function createModalManager() {
  return new ModalManager();
}

/**
 * Defines the steps for the setup process.
 * @returns {Array} An array of step objects.
 */
function defineSetupSteps() {
  return [
    {
      title: 'Select Environment',
      htmlFile: 'html/api_setup.html',
      callback: saveApiKey
    },
    // Add more steps as needed
  ];
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
