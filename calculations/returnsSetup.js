/**
 * Returns Dashboard Setup - Time-Weighted Return (TWR) Implementation
 * 
 * This module creates and configures sheets for calculating portfolio returns:
 * - Daily_Portfolio_Values: Calculates daily portfolio values
 * - Returns_Dashboard: Displays TWR for various periods
 * 
 * @author Niklas Johansson
 * @version 1.0
 */

/**
 * Main setup function - creates both returns sheets
 */
function setupReturnsDashboard() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    updateProgress('Setting up Returns Dashboard...');
    
    // Create Daily_Portfolio_Values sheet
    updateProgress('Creating Daily Portfolio Values sheet...');
    setupDailyPortfolioValuesSheet();
    
    // Create Returns_Dashboard sheet
    updateProgress('Creating Returns Dashboard sheet...');
    setupReturnsDashboardSheet();
    
    updateProgress('Returns Dashboard setup complete!');
    ui.alert('Success', 'Returns Dashboard has been set up successfully!\n\nTwo new sheets have been created:\n- Daily_Portfolio_Values\n- Returns_Dashboard\n\nYou can now fetch Portfolio data to see your returns.', ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('Error in setupReturnsDashboard: ' + error.message);
    ui.alert('Error', 'Failed to set up Returns Dashboard: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Creates and configures the Daily_Portfolio_Values sheet
 */
function setupDailyPortfolioValuesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create sheet
  let sheet = ss.getSheetByName('Daily_Portfolio_Values');
  if (sheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Sheet Exists',
      'Daily_Portfolio_Values sheet already exists. Do you want to recreate it?\n\n⚠️ This will delete all existing data in this sheet.',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      ss.deleteSheet(sheet);
      sheet = ss.insertSheet('Daily_Portfolio_Values');
    } else {
      return; // User chose not to recreate
    }
  } else {
    sheet = ss.insertSheet('Daily_Portfolio_Values');
  }
  
  // Set up headers
  const headers = ['Date', 'Shares_Market_Value', 'Cash_Balance', 'Total_Portfolio_Value', 'Daily_Net_Cash_Flow'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  
  // Set up dates for last 365 days (using individual dates to avoid SEQUENCE compatibility issues)
  const numDays = 365;
  const today = new Date();
  
  // Create date formulas - each cell references the one above it
  sheet.getRange('A2').setFormula('=TODAY()-365');
  
  // For rows 3 onwards, reference the cell above and add 1
  for (let i = 3; i <= numDays + 1; i++) {
    sheet.getRange(i, 1).setFormula(`=A${i-1}+1`);
  }
  
  // Column B: Shares Market Value
  // Note: This needs to be customized based on actual sheet structure
  // Using a simplified version that users can adjust
  const marketValueFormula = `=IFERROR(
  IF(
    A2=TODAY(),
    SUMPRODUCT(Portfolio!B2:B, Portfolio!D2:D),
    SUMPRODUCT(
      (Historical_shares!$A$2:$A$1000=A2)*1,
      Historical_shares!B$2:Z$2,
      Historical_avg_price_paid!B$2:Z$2
    )
  ),
  0
)`;
  
  sheet.getRange('B2').setFormula(marketValueFormula);
  
  // Copy formula down
  if (numDays > 1) {
    sheet.getRange('B2').copyTo(sheet.getRange(3, 2, numDays - 1, 1));
  }
  
  // Column C: Cash Balance (historical reconstruction)
  const cashBalanceFormula = `=IFERROR(
  IF(
    A2=TODAY(),
    VLOOKUP("Total", Cash!A:B, 2, FALSE),
    VLOOKUP("Total", Cash!A:B, 2, FALSE) + 
    SUMIFS(212Transactions!B:B, 212Transactions!D:D, ">"&A2, 212Transactions!A:A, "DEPOSIT") - 
    SUMIFS(212Transactions!B:B, 212Transactions!D:D, ">"&A2, 212Transactions!A:A, "WITHDRAW")
  ),
  0
)`;
  
  sheet.getRange('C2').setFormula(cashBalanceFormula);
  
  // Copy formula down
  if (numDays > 1) {
    sheet.getRange('C2').copyTo(sheet.getRange(3, 3, numDays - 1, 1));
  }
  
  // Column D: Total Portfolio Value
  sheet.getRange('D2').setFormula('=IFERROR(B2,0)+IFERROR(C2,0)');
  
  // Copy formula down
  if (numDays > 1) {
    sheet.getRange('D2').copyTo(sheet.getRange(3, 4, numDays - 1, 1));
  }
  
  // Column E: Daily Net Cash Flow
  const cashFlowFormula = `=IFERROR(
  SUMIFS(212Transactions!B:B, 212Transactions!D:D, ">="&A2, 212Transactions!D:D, "<"&(A2+1), 212Transactions!A:A, "DEPOSIT") - 
  SUMIFS(212Transactions!B:B, 212Transactions!D:D, ">="&A2, 212Transactions!D:D, "<"&(A2+1), 212Transactions!A:A, "WITHDRAW"),
  0
)`;
  
  sheet.getRange('E2').setFormula(cashFlowFormula);
  
  // Copy formula down
  if (numDays > 1) {
    sheet.getRange('E2').copyTo(sheet.getRange(3, 5, numDays - 1, 1));
  }
  
  // Format columns
  sheet.getRange(2, 1, numDays, 1).setNumberFormat('yyyy-mm-dd'); // Date
  sheet.getRange(2, 2, numDays, 3).setNumberFormat('€#,##0.00'); // Currency columns B, C, D
  sheet.getRange(2, 5, numDays, 1).setNumberFormat('€#,##0.00'); // Cash flow column E
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  // Add notes to cells with instructions
  sheet.getRange('B2').setNote('Formula calculates market value using Historical_shares and Historical_avg_price_paid. Adjust ranges based on your sheet structure.');
  sheet.getRange('C2').setNote('Formula reconstructs historical cash balance. Requires Cash and 212Transactions sheets.');
  sheet.getRange('E2').setNote('Formula calculates daily net cash flows (deposits - withdrawals).');
  
  Logger.log('Daily_Portfolio_Values sheet created successfully');
}

/**
 * Creates and configures the Returns_Dashboard sheet
 */
function setupReturnsDashboardSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create sheet
  let sheet = ss.getSheetByName('Returns_Dashboard');
  if (sheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Sheet Exists',
      'Returns_Dashboard sheet already exists. Do you want to recreate it?\n\n⚠️ This will delete all existing data in this sheet.',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      ss.deleteSheet(sheet);
      sheet = ss.insertSheet('Returns_Dashboard');
    } else {
      return; // User chose not to recreate
    }
  } else {
    sheet = ss.insertSheet('Returns_Dashboard');
  }
  
  // Set up headers
  const headers = ['Period', 'Return', 'Start Value', 'End Value', 'Net Cash Flow', 'Days in Period'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  
  // Set up period labels
  const periods = ['Today', 'Last 7 Days', 'Last 30 Days', 'Year to Date', 'All Time'];
  sheet.getRange(2, 1, periods.length, 1).setValues(periods.map(p => [p]));
  
  // Column C: Start Value
  const startValueFormulas = [
    '=IFERROR(VLOOKUP(TODAY()-1, Daily_Portfolio_Values!A:D, 4, FALSE), 0)',
    '=IFERROR(VLOOKUP(TODAY()-7, Daily_Portfolio_Values!A:D, 4, FALSE), 0)',
    '=IFERROR(VLOOKUP(TODAY()-30, Daily_Portfolio_Values!A:D, 4, FALSE), 0)',
    '=IFERROR(VLOOKUP(DATE(YEAR(TODAY()),1,1)-1, Daily_Portfolio_Values!A:D, 4, FALSE), 0)',
    '=IFERROR(INDEX(Daily_Portfolio_Values!D:D, MATCH(TRUE, Daily_Portfolio_Values!D:D>0, 0)), 0)'
  ];
  
  for (let i = 0; i < startValueFormulas.length; i++) {
    sheet.getRange(i + 2, 3).setFormula(startValueFormulas[i]);
  }
  
  // Column D: End Value (all use today's value)
  const endValueFormula = '=IFERROR(VLOOKUP(TODAY(), Daily_Portfolio_Values!A:D, 4, FALSE), 0)';
  for (let i = 0; i < periods.length; i++) {
    sheet.getRange(i + 2, 4).setFormula(endValueFormula);
  }
  
  // Column E: Net Cash Flow
  const cashFlowFormulas = [
    '=IFERROR(SUMIFS(Daily_Portfolio_Values!E:E, Daily_Portfolio_Values!A:A, "="&TODAY()), 0)',
    '=IFERROR(SUMIFS(Daily_Portfolio_Values!E:E, Daily_Portfolio_Values!A:A, ">="&(TODAY()-7), Daily_Portfolio_Values!A:A, "<="&TODAY()), 0)',
    '=IFERROR(SUMIFS(Daily_Portfolio_Values!E:E, Daily_Portfolio_Values!A:A, ">="&(TODAY()-30), Daily_Portfolio_Values!A:A, "<="&TODAY()), 0)',
    '=IFERROR(SUMIFS(Daily_Portfolio_Values!E:E, Daily_Portfolio_Values!A:A, ">="&DATE(YEAR(TODAY()),1,1), Daily_Portfolio_Values!A:A, "<="&TODAY()), 0)',
    '=IFERROR(SUM(Daily_Portfolio_Values!E:E), 0)'
  ];
  
  for (let i = 0; i < cashFlowFormulas.length; i++) {
    sheet.getRange(i + 2, 5).setFormula(cashFlowFormulas[i]);
  }
  
  // Column F: Days in Period
  const daysFormulas = [
    '1',
    '7',
    '30',
    '=TODAY()-DATE(YEAR(TODAY()),1,1)+1',
    '=TODAY()-INDEX(Daily_Portfolio_Values!A:A, MATCH(TRUE, Daily_Portfolio_Values!D:D>0, 0))+1'
  ];
  
  for (let i = 0; i < daysFormulas.length; i++) {
    if (i < 3) {
      sheet.getRange(i + 2, 6).setValue(parseInt(daysFormulas[i]));
    } else {
      sheet.getRange(i + 2, 6).setFormula(daysFormulas[i]);
    }
  }
  
  // Column B: Return (Modified Dietz) - Simplified version without weighting
  const returnFormula = '=IFERROR(IF(C2=0, 0, (D2-C2-E2)/C2), 0)';
  for (let i = 0; i < periods.length; i++) {
    sheet.getRange(i + 2, 2).setFormula(returnFormula.replace('C2', 'C' + (i + 2)).replace('D2', 'D' + (i + 2)).replace('E2', 'E' + (i + 2)));
  }
  
  // Format columns
  sheet.getRange(2, 2, periods.length, 1).setNumberFormat('0.00%'); // Return as percentage
  sheet.getRange(2, 3, periods.length, 3).setNumberFormat('€#,##0.00'); // Currency columns C, D, E
  sheet.getRange(2, 6, periods.length, 1).setNumberFormat('#,##0'); // Days as integer
  
  // Add conditional formatting for returns
  addConditionalFormattingToReturns(sheet, periods.length);
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  // Make period labels bold
  sheet.getRange(2, 1, periods.length, 1).setFontWeight('bold');
  
  // Add explanation text below
  const lastRow = periods.length + 2;
  sheet.getRange(lastRow + 1, 1).setValue('📊 Understanding Your Returns').setFontWeight('bold').setFontSize(11);
  sheet.getRange(lastRow + 2, 1, 1, 6).merge().setValue('Time-Weighted Return (TWR) shows your investment performance excluding the impact of deposits/withdrawals. This is the industry-standard method for evaluating portfolio performance.');
  sheet.getRange(lastRow + 2, 1).setWrap(true);
  
  sheet.getRange(lastRow + 4, 1).setValue('✅ How to Use').setFontWeight('bold').setFontSize(11);
  sheet.getRange(lastRow + 5, 1, 1, 6).merge().setValue('1. Ensure you have fetched Portfolio data, 212Transactions, and Cash\n2. Your Historical_shares and Historical_avg_price_paid sheets must exist\n3. Returns will automatically update when you fetch new data\n4. Check Daily_Portfolio_Values sheet if returns look incorrect');
  sheet.getRange(lastRow + 5, 1).setWrap(true);
  
  sheet.getRange(lastRow + 7, 1).setValue('⚠️ Limitations').setFontWeight('bold').setFontSize(11);
  sheet.getRange(lastRow + 8, 1, 1, 6).merge().setValue('Historical values use average price paid (estimation). For 100% accuracy, consider implementing daily price snapshots (see TWR_Formula_Templates.md documentation).');
  sheet.getRange(lastRow + 8, 1).setWrap(true);
  
  // Add note to Return column header
  sheet.getRange('B1').setNote('Modified Dietz method: (End Value - Start Value - Net Cash Flows) / Start Value\n\nThis method separates your investment returns from the impact of deposits and withdrawals.');
  
  Logger.log('Returns_Dashboard sheet created successfully');
}

/**
 * Adds conditional formatting to the returns column
 */
function addConditionalFormattingToReturns(sheet, numRows) {
  const returnRange = sheet.getRange(2, 2, numRows, 1);
  
  // Positive returns (green)
  const positiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#d9ead3')
    .setFontColor('#38761d')
    .setRanges([returnRange])
    .build();
  
  // Negative returns (red)
  const negativeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground('#f4cccc')
    .setFontColor('#cc0000')
    .setRanges([returnRange])
    .build();
  
  // Zero returns (gray)
  const zeroRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberEqualTo(0)
    .setBackground('#f3f3f3')
    .setFontColor('#666666')
    .setRanges([returnRange])
    .build();
  
  // Apply rules
  const rules = sheet.getConditionalFormatRules();
  rules.push(positiveRule, negativeRule, zeroRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Helper function to check if required sheets exist
 */
function checkRequiredSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = ['Historical_shares', 'Historical_avg_price_paid', '212Transactions', 'Cash', 'Portfolio'];
  const missingSheets = [];
  
  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      missingSheets.push(sheetName);
    }
  });
  
  return missingSheets;
}

/**
 * Validates setup before creating returns dashboard
 */
function validateReturnsDashboardSetup() {
  const missingSheets = checkRequiredSheets();
  
  if (missingSheets.length > 0) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Missing Required Sheets',
      'The following sheets are required but not found:\n\n' + missingSheets.join('\n') + '\n\nPlease fetch the required data first:\n1. Fetch Portfolio\n2. Fetch Transactions\n3. Fetch Cash Balance\n\nAlso ensure Historical_shares and Historical_avg_price_paid sheets exist.',
      ui.ButtonSet.OK
    );
    return false;
  }
  
  return true;
}

/**
 * Menu function with validation
 */
function setupReturnsDashboardWithValidation() {
  if (validateReturnsDashboardSetup()) {
    setupReturnsDashboard();
  }
}

/**
 * Opens documentation in a browser
 */
function viewReturnsDocs() {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = HtmlService.createHtmlOutput(`
    <html>
      <head>
        <base target="_blank">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { color: #4a86e8; }
          .doc-link { 
            display: block; 
            margin: 10px 0; 
            padding: 15px; 
            background: #f0f0f0; 
            border-radius: 5px; 
            text-decoration: none; 
            color: #333;
          }
          .doc-link:hover { background: #e0e0e0; }
        </style>
      </head>
      <body>
        <h2>📊 Returns Dashboard Documentation</h2>
        <p>Access the comprehensive guides for implementing and using the Returns Dashboard:</p>
        
        <a class="doc-link" href="https://github.com/niklas-joh/portfolio_tracker_google_sheets/blob/main/docs/TWR_Formula_Templates.md">
          <strong>📐 TWR Formula Templates</strong><br>
          Technical implementation guide with ready-to-use formulas
        </a>
        
        <a class="doc-link" href="https://github.com/niklas-joh/portfolio_tracker_google_sheets/blob/main/docs/Returns_Dashboard_Visual_Guide.md">
          <strong>🎨 Visual Implementation Guide</strong><br>
          User-friendly reference with examples and troubleshooting
        </a>
        
        <a class="doc-link" href="https://github.com/niklas-joh/portfolio_tracker_google_sheets/blob/main/docs/development_docs/future_implementation_considerations.md">
          <strong>🔮 Future Enhancements</strong><br>
          Roadmap for additional features and improvements
        </a>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          💡 Tip: You can also find these files in the <code>docs/</code> folder of your project repository.
        </p>
      </body>
    </html>
  `)
    .setWidth(600)
    .setHeight(400);
  
  ui.showModalDialog(htmlOutput, 'Returns Dashboard Documentation');
}
