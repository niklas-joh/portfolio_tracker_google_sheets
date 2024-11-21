/**
 * Creates the add-on menu when the spreadsheet opens
 */
function onOpen() {
    SpreadsheetApp.getUi()
      .createMenu('Trading212 Portfolio')
      .addItem('Setup Account', 'showSetupModal')
      .addItem('Refresh Data', 'refreshPortfolioData')
      .addItem('Settings', 'showSettingsModal')
      .addToUi();
  }
  