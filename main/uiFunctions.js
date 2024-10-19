/**
 * ===================== onOpen Function ===========================
 */

/**
 * Adds a menu when the spreadsheet is opened to open HTML sidebar to enter API.
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trading212')
    .addItem('Set API Key', 'showApiKeySidebar')
    .addToUi();

  addStartSetupButton(); // Add Start Setup button on the Welcome sheet
}

/**
 * ===================== UI Interaction Functions ==================
 */

function showApiKeySidebar() {
  const html = HtmlService.createHtmlOutputFromFile('api_key_sidebar')
    .setWidth(300)
    .setHeight(250);
  SpreadsheetApp.getUi().showSidebar(html);
}

function saveApiKey(apiKey) {
  PropertiesService.getUserProperties().setProperty('API_KEY', apiKey);
}

/**
 * Retrieves the stored API key from User Properties.
 * If the API key is not set, logs an error message.
 *
 * @returns {string|null} The stored API key, or null if not available.
 */
function getAuthKey() {
  var apiKey = PropertiesService.getUserProperties().getProperty('API_KEY');
  if (!apiKey) {
    Logger.log('API Key is not set. Please use the "Trading212 > Set API Key" menu to enter your API key.');
    // Optionally, you could throw an error or notify the user through other means
  }
  return apiKey;
}