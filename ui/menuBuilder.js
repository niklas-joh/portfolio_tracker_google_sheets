/**
 * Creates the add-on menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trading212 Portfolio')
      .addItem('Setup Account', 'showSetupModal')
      .addItem('Refresh Data', 'refreshPortfolioData')
      .addItem('Settings', 'showSettingsModal')
      .addSeparator()
    .addSubMenu(ui.createMenu('Format Configuration')
      .addItem('Setup Format System', 'setupFormatConfigSystem')
      .addItem('Refresh Column Mapping', 'refreshColumnMapping')
      .addItem('Apply All Formatting', 'applyFormattingToAllSheets'))
    .addSeparator()
    .addToUi();
}