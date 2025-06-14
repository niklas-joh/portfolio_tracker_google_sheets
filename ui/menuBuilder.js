/**
 * Creates the add-on menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Trading212 Portfolio')
    .addSubMenu(ui.createMenu('Setup')
      .addItem('Start Setup', 'showSetupModal')
      .addItem('Reset Setup', 'resetSetup'))
    .addSubMenu(ui.createMenu('Data')
      .addItem('Fetch Data...', 'showFetchDataModal')
      .addSeparator()
      .addItem('Fetch Pies', 'fetchPies')
      .addItem('Fetch Instruments', 'fetchInstrumentsList')
      .addItem('Fetch Exchanges', 'fetchExchanges')
      .addItem('Fetch Account Info', 'fetchAccountInfo')
      .addItem('Fetch Cash Balance', 'fetchAccountCash')
      .addItem('Fetch Transactions', 'fetchTransactions')
      .addItem('Fetch Order History', 'fetchOrderHistory')
      .addItem('Fetch Dividends', 'fetchDividends'))
    .addSubMenu(ui.createMenu('Formatting')
      .addItem('Setup Format System', 'setupFormatConfigSystem')
      .addItem('Refresh Column Mapping', 'refreshColumnMapping')
      .addItem('Apply All Formatting', 'applyFormattingToAllSheets'))
    .addToUi();
}