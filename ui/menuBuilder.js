/**
 * Creates the add-on menu when the spreadsheet opens
 *
 * */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
    ui.createMenu('Trading212 Integration')
      .addItem('First Item', 'firstItem')
      .addSeparator()
      .addSubMenu(ui.createMenu('Data')
        .addItem('Fetch Transactions', 'fetchTransactions')
        .addItem('Fetch Account Info', 'fetchAccountInfo')
        .addItem('Fetch Pies', 'fetchPies')
        .addItem('Fetch Selected Data...', 'showDataSelectionDialog'))
        .addSubMenu(ui.createMenu('Configuration')
            .addItem('API Settings', 'showApiSettingsDialog')
            .addItem('Sheet Mappings', 'showSheetMappingsDialog')
            .addItem('Column Formatting', 'showColumnFormattingDialog')
            .addItem('Advanced Configuration', 'showAdvancedConfigDialog'))
        .addSubMenu(ui.createMenu('Tracking')
            .addItem('Track Current Sheet', 'trackCurrentSheet')
            .addItem('View Tracking Report', 'showTrackingReport')
            .addItem('Update Tracking Sheet', 'updateTrackingSheet'))
        .addSeparator()
        .addItem('About', 'showAboutDialog')
    .addToUi();
  }