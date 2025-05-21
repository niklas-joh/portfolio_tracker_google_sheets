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
    .addSubMenu(ui.createMenu('Fetch Repository Data')
      .addItem('Fetch & Save Pies', 'fetchPiesAndSave_')
      .addItem('Fetch & Save Pie Items', 'fetchPieItemsAndSave_')
      .addItem('Fetch & Save Transactions', 'fetchTransactionsAndSave_')
      .addItem('Fetch & Save Dividends', 'fetchDividendsAndSave_'))
    .addSeparator()
    .addToUi();
}
