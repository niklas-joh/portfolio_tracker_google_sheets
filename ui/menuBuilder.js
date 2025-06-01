/**
 * Creates the add-on menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trading212 Portfolio')
      .addItem('Setup Account', 'showSetupModal')
      .addItem('Refresh Data', 'refreshPortfolioData')
      .addItem('Update All Core Data', 'updateAllCoreData_') // New grouped update
      .addItem('Settings', 'showSettingsModal')
      .addSeparator()
    .addSubMenu(ui.createMenu('Format Configuration')
      .addItem('Setup Format System', 'setupFormatConfigSystem')
      .addItem('Refresh Column Mapping', 'refreshColumnMapping')
      .addItem('Apply All Formatting', 'applyFormattingToAllSheets'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Data Management')
      .addItem('Manage Headers', 'showHeaderManagementUI_'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Update Repository Data') // Renamed submenu
      .addItem('Update All Pies', 'updateAllPies_')
      .addItem('Update All Pie Items', 'updateAllPieItems_')
      .addItem('Update Transactions', 'updateTransactions_')
      .addItem('Update Dividends', 'updateDividends_')
      .addSeparator() // Separator for new items
      .addItem('Update Instruments List', 'updateInstrumentsList_')
      .addItem('Update Account Info', 'updateAccountInfo_')
      .addItem('Update Account Cash', 'updateAccountCash_')
      .addItem('Update Order History', 'updateOrderHistory_'))
    .addSeparator()
    .addToUi();
}
