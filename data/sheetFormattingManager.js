/**
 * Google Apps Script - Trading212 Format Configuration System
 * 
 * This script creates a simple but effective format configuration system for Google Sheets.
 * It automatically formats columns based on user-defined format categories.
 * 
 * Features:
 * - Automatic detection of sheets and columns
 * - Intelligent format category guessing based on column names
 * - Automatic format application when configuration changes
 * - Preservation of user format choices when refreshing
 * 
 * Setup:
 * 1. Copy this code to your Google Apps Script project
 * 2. Run the 'setupFormatConfigSystem' function to create the configuration sheets
 * 3. Customize format patterns in the FormatConfigurations sheet
 * 4. Assign format categories in the ColumnFormatMapping sheet
 * 
 * @author Niklas Johansson
 * @version 1.0
 */

/**
 * Set up the format configuration system
 */
function setupFormatConfigSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Format Configurations sheet
  createFormatConfigurationsSheet(ss);
  
  // Create Column Format Mapping sheet
  createColumnFormatMappingSheet(ss);
  
  // Add triggers to automatically apply formatting when changes are made
  createTriggers();
  
  // Show confirmation message
  SpreadsheetApp.getUi().alert('Format configuration system has been set up successfully!');
}

/**
 * Create the Format Configurations sheet with format type dropdown options
 */
function createFormatConfigurationsSheet(ss) {
  // Check if sheet already exists
  let sheet = ss.getSheetByName('FormatConfigurations');
  if (sheet) {
    // If it exists, clear it
    sheet.clear();
  } else {
    // Create new sheet
    sheet = ss.insertSheet('FormatConfigurations');
  }
  
  // Set up headers
  sheet.getRange('A1:E1').setValues([['Format Category', 'Format Type', 'Format Pattern', 'Description', 'Example']]);
  
  // Define all format options with their patterns
  const formatOptions = {
    'Currency': [
      { type: 'USD', pattern: '"$"#,##0.00', description: 'US Dollar' },
      { type: 'EUR', pattern: '"€"#,##0.00', description: 'Euro' },
      { type: 'GBP', pattern: '"£"#,##0.00', description: 'British Pound' }
    ],
    'Decimal': [
      { type: '2 Decimals', pattern: '#,##0.00', description: 'Numbers with 2 decimals' },
      { type: '3 Decimals', pattern: '#,##0.000', description: 'Numbers with 3 decimals' },
      { type: '4 Decimals', pattern: '#,##0.0000', description: 'Numbers with 4 decimals' }
    ],
    'Integer': [
      { type: 'Plain', pattern: '#,##0', description: 'Whole numbers only' },
      { type: 'Grouped', pattern: '#,###', description: 'Whole numbers with grouping' }
    ],
    'Percentage': [
      { type: '0 Decimals', pattern: '0%', description: 'Percentage with no decimals' },
      { type: 'Always 1 Decimal', pattern: '0.0%', description: 'Percentage with 1 decimal always visible' },
      { type: 'Always 2 Decimals', pattern: '0.00%', description: 'Percentage with 2 decimals always visible' },
      { type: '1 Decimal', pattern: '0.#%', description: 'Percentage with 1 decimal' },
      { type: '2 Decimals', pattern: '0.##%', description: 'Percentage with 2 decimals' }
    ],
    'Date': [
      { type: 'DD/MM/YYYY', pattern: 'dd/MM/yyyy', description: 'Day/Month/Year' },
      { type: 'MM/DD/YYYY', pattern: 'MM/dd/yyyy', description: 'Month/Day/Year' },
      { type: 'YYYY-MM-DD', pattern: 'yyyy-MM-dd', description: 'ISO Date Format' },
      { type: 'DD Month YYYY', pattern: 'dd MMMM yyyy', description: 'Long Date Format' }
    ],
    'DateTime': [
      { type: 'DD/MM/YYYY HH:MM', pattern: 'dd/MM/yyyy HH:mm', description: 'Day/Month/Year Hour:Minute' },
      { type: 'MM/DD/YYYY HH:MM', pattern: 'MM/dd/yyyy HH:mm', description: 'Month/Day/Year Hour:Minute' },
      { type: 'YYYY-MM-DD HH:MM', pattern: 'yyyy-MM-dd HH:mm', description: 'ISO DateTime Format' }
    ],
    'Text': [
      { type: 'Plain Text', pattern: '@', description: 'Plain text' }
    ]
  };
  
  // Prepare data for sheet
  const formats = [];
  
  // For each category, add the first format option as default
  Object.keys(formatOptions).forEach(category => {
    const defaultOption = formatOptions[category][0];
    formats.push([
      category,
      defaultOption.type,
      defaultOption.pattern,
      defaultOption.description,
      category === 'Date' || category === 'DateTime' ? new Date() : 
      category === 'Text' ? 'Sample Text' : 1234.56
    ]);
  });
  
  // Write data to sheet
  sheet.getRange(2, 1, formats.length, 5).setValues(formats);
  
  // Format the example column based on the format pattern
  for (let i = 0; i < formats.length; i++) {
    sheet.getRange(i + 2, 5).setNumberFormat(formats[i][2]);
  }
  
  // Add data validation (dropdowns) for the Format Type column
  for (let i = 0; i < formats.length; i++) {
    const category = formats[i][0];
    const typeOptions = formatOptions[category].map(option => option.type);
    
    // Create a dropdown for each format type
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(typeOptions, true)
      .build();
    
    sheet.getRange(i + 2, 2).setDataValidation(rule);
  }
  
  // Make it look nicer
  formatSheet(sheet); 
  
  // Add instructions at the bottom
  sheet.getRange(formats.length + 3, 1).setValue('Instructions:');
  sheet.getRange(formats.length + 4, 1).setValue('1. Select a format type from the dropdown to change the formatting.');
  sheet.getRange(formats.length + 5, 1).setValue('2. Changes will automatically be applied to all sheets.');
  sheet.getRange(formats.length + 6, 1).setValue('3. Format patterns will update automatically based on your selection.');
  
  return sheet;
}

/**
 * Create the Column Format Mapping sheet
 */
function createColumnFormatMappingSheet(ss) {
  // Check if sheet already exists
  let sheet = ss.getSheetByName('ColumnFormatMapping');
  if (sheet) {
    // If it exists, clear it
    sheet.clear();
  } else {
    // Create new sheet
    sheet = ss.insertSheet('ColumnFormatMapping');
  }
  
  // Set up headers
  sheet.getRange('A1:C1').setValues([['Sheet Name', 'Column Name', 'Format Category']]);
  
  // Populate with all sheets and columns
  populateColumnMappingSheet(sheet);
  
  // Make it look nicer
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.getRange('A1:C1').setBackground('#f3f3f3');
  sheet.autoResizeColumns(1, 3);
  
  // Add instructions at the bottom
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 2, 1).setValue('Instructions:');
  sheet.getRange(lastRow + 3, 1).setValue('1. Update the Format Category column to change formatting for a column.');
  sheet.getRange(lastRow + 4, 1).setValue('2. Changes will automatically be applied to all sheets.');
  sheet.getRange(lastRow + 5, 1).setValue('3. Run "Refresh Column Mapping" from the menu if you add new sheets or columns.');
  
  return sheet;
}

/**
 * Populate the Column Format Mapping sheet with all sheets and columns
 */
function populateColumnMappingSheet(sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  
  let rowIndex = 2; // Start after header row
  
  // Loop through all sheets
  for (let i = 0; i < allSheets.length; i++) {
    const currentSheet = allSheets[i];
    const sheetName = currentSheet.getName();
    
    // Skip configuration sheets
    if (sheetName === 'FormatConfigurations' || sheetName === 'ColumnFormatMapping') {
      continue;
    }
    
    // Get column headers
    const lastColumn = currentSheet.getLastColumn();
    if (lastColumn === 0) {
      continue; // Skip empty sheets
    }
    
    const headers = currentSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // For each column, add a row to the mapping sheet
    for (let j = 0; j < headers.length; j++) {
      const columnName = headers[j];
      if (!columnName) continue; // Skip empty column names
      
      // Guess default format based on column name
      const defaultFormat = guessDefaultFormat(columnName);
      
      // Add to mapping sheet
      sheet.getRange(rowIndex, 1, 1, 3).setValues([[sheetName, columnName, defaultFormat]]);
      rowIndex++;
    }
  }
  
  // Add data validation for the Format Category column
  const formatValues = ['Currency', 'Decimal', 'Integer', 'Percentage', 'Date', 'DateTime', 'Text'];
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(formatValues).build();
  sheet.getRange(2, 3, rowIndex - 2, 1).setDataValidation(rule);
}

/**
 * Guess default format based on column name
 */
function guessDefaultFormat(columnName) {
  const lowerName = columnName.toLowerCase();
  
  const formatRules = [
    { keywords: ['date', 'day'], format: 'Date' },
    { keywords: ['time', 'timestamp'], format: 'DateTime' },
    { keywords: ['price', 'cost', 'amount', 'value', 'balance', 'value', 'cash', 'dividend', 'result'], format: 'Currency' },
    { keywords: ['percent', '%', 'progress'], format: 'Percentage' },
    { keywords: ['count', 'number'], format: 'Integer' },
    { keywords: ['rate', 'ratio', 'quantity'], format: 'Decimal' }
  ];

  for (const rule of formatRules) {
    if (rule.keywords.some(keyword => lowerName.includes(keyword))) {
      return rule.format;
    }
  }

  return 'Text';
}

/**
 * Create triggers to automatically apply formatting when changes are made
 */
function createTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create a new trigger for the onEdit function
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}

/**
 * Handle edits to the spreadsheet and automatically apply formatting if needed
 */
function onEdit(e) {
  // Check if edit was made to one of our configuration sheets
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  
  if (sheetName === 'FormatConfigurations' || sheetName === 'ColumnFormatMapping') {
    // Don't trigger for edits to instructions
    if (e.range.getRow() > sheet.getLastRow() - 5) {
      return;
    }
    
    // Check if the edited cell is in a column that affects formatting
    const col = e.range.getColumn();
    
    if (sheetName === 'FormatConfigurations' && col === 2) {
      // Format type was changed in dropdown
      updateFormatPatternAndExample(sheet, e.range.getRow());
      applyFormattingToAllSheets();
    } else if (sheetName === 'FormatConfigurations' && col === 3) {
      // Format pattern was directly changed
      updateExampleFormatting(sheet, e.range.getRow());
      applyFormattingToAllSheets();
    } else if (sheetName === 'ColumnFormatMapping' && col === 3) {
      // Format category was changed
      applyFormattingToSpecificColumn(sheet, e.range.getRow());
    }
  }
}

/**
 * Update the format pattern and example formatting when format type is changed via dropdown
 */
function updateFormatPatternAndExample(sheet, row) {
  // Get the category and selected format type
  const category = sheet.getRange(row, 1).getValue();
  const formatType = sheet.getRange(row, 2).getValue();
  
  // Define all format options with their patterns (must match createFormatConfigurationsSheet)
  const formatOptions = {
    'Currency': [
      { type: 'USD', pattern: '"$"#,##0.00', description: 'US Dollar' },
      { type: 'EUR', pattern: '"€"#,##0.00', description: 'Euro' },
      { type: 'GBP', pattern: '"£"#,##0.00', description: 'British Pound' }
    ],
    'Decimal': [
      { type: '2 Decimals', pattern: '#,##0.00', description: 'Numbers with 2 decimals' },
      { type: '3 Decimals', pattern: '#,##0.000', description: 'Numbers with 3 decimals' },
      { type: '4 Decimals', pattern: '#,##0.0000', description: 'Numbers with 4 decimals' }
    ],
    'Integer': [
      { type: 'Plain', pattern: '#,##0', description: 'Whole numbers only' },
      { type: 'Grouped', pattern: '#,###', description: 'Whole numbers with grouping' }
    ],
    'Percentage': [
      { type: '0 Decimals', pattern: '0%', description: 'Percentage with no decimals' },
      { type: 'Always 1 Decimal', pattern: '0.0%', description: 'Percentage with 1 decimal always visible' },
      { type: 'Always 2 Decimals', pattern: '0.00%', description: 'Percentage with 2 decimals always visible' },
      { type: '1 Decimal', pattern: '0.#%', description: 'Percentage with 1 decimal' },
      { type: '2 Decimals', pattern: '0.##%', description: 'Percentage with 2 decimals' }
    ],
    'Date': [
      { type: 'DD/MM/YYYY', pattern: 'dd/MM/yyyy', description: 'Day/Month/Year' },
      { type: 'MM/DD/YYYY', pattern: 'MM/dd/yyyy', description: 'Month/Day/Year' },
      { type: 'YYYY-MM-DD', pattern: 'yyyy-MM-dd', description: 'ISO Date Format' },
      { type: 'DD Month YYYY', pattern: 'dd MMMM yyyy', description: 'Long Date Format' }
    ],
    'DateTime': [
      { type: 'DD/MM/YYYY HH:MM', pattern: 'dd/MM/yyyy HH:mm', description: 'Day/Month/Year Hour:Minute' },
      { type: 'MM/DD/YYYY HH:MM', pattern: 'MM/dd/yyyy HH:mm', description: 'Month/Day/Year Hour:Minute' },
      { type: 'YYYY-MM-DD HH:MM', pattern: 'yyyy-MM-dd HH:mm', description: 'ISO DateTime Format' }
    ],
    'Text': [
      { type: 'Plain Text', pattern: '@', description: 'Plain text' }
    ]
  };
  
  // Find the selected format option
  const selectedFormat = formatOptions[category].find(option => option.type === formatType);
  
  if (selectedFormat) {
    // Update the format pattern and description
    sheet.getRange(row, 3).setValue(selectedFormat.pattern);
    sheet.getRange(row, 4).setValue(selectedFormat.description);
    
    // Update the example formatting
    sheet.getRange(row, 5).setNumberFormat(selectedFormat.pattern);
    
    // Log for debugging
    Logger.log(`Updated format for ${category} to ${formatType}: ${selectedFormat.pattern}`);
  }
}

/**
 * Update the example formatting when a format pattern is changed directly
 */
function updateExampleFormatting(sheet, row) {
  // Get the new format pattern
  const formatPattern = sheet.getRange(row, 3).getValue();
  
  // Apply the format to the example cell
  sheet.getRange(row, 5).setNumberFormat(formatPattern);
}

/**
 * Apply formatting to a specific column based on a mapping row
 */
function applyFormattingToSpecificColumn(mappingSheet, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Get the mapping information
    const mappingData = mappingSheet.getRange(row, 1, 1, 3).getValues()[0];
    const sheetName = mappingData[0];
    const columnName = mappingData[1];
    const formatCategory = mappingData[2];
    
    // Get the sheet
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    // Find the column index
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) return;
    
    // Get the format pattern
    const configSheet = ss.getSheetByName('FormatConfigurations');
    if (!configSheet) return;
    
    const formatData = configSheet.getDataRange().getValues();
    let formatPattern = '';
    
    // Find the format pattern for the category (now in column 3 instead of 2)
    for (let i = 1; i < formatData.length; i++) {
      if (formatData[i][0] === formatCategory) {
        formatPattern = formatData[i][2]; // Column 3 (index 2) now contains the pattern
        break;
      }
    }
    
    if (!formatPattern) return;
    
    // Apply the format to the column
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const columnRange = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1);
      columnRange.setNumberFormat(formatPattern);
    }
    
    // Log for debugging
    Logger.log(`Applied ${formatCategory} (${formatPattern}) to ${sheetName}.${columnName}`);
  } catch (error) {
    Logger.log('Error in applyFormattingToSpecificColumn: ' + error.message);
  }
}

/**
 * Apply formatting to all sheets based on the current mapping
 */
function applyFormattingToAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Get the mapping sheet
    const mappingSheet = ss.getSheetByName('ColumnFormatMapping');
    if (!mappingSheet) return;
    
    // Get the format configurations sheet
    const configSheet = ss.getSheetByName('FormatConfigurations');
    if (!configSheet) return;
    
    // Get all format patterns
    const formatData = configSheet.getDataRange().getValues();
    const formatPatterns = {};
    
    // Skip header row
    for (let i = 1; i < formatData.length; i++) {
      if (formatData[i][0] && formatData[i][2]) { // Column 3 (index 2) now contains the pattern
        formatPatterns[formatData[i][0]] = formatData[i][2];
      }
    }
    
    // Get all mappings
    const mappingData = mappingSheet.getDataRange().getValues();
    const mappings = {};
    
    // Skip header row
    for (let i = 1; i < mappingData.length; i++) {
      const sheetName = mappingData[i][0];
      const columnName = mappingData[i][1];
      const formatCategory = mappingData[i][2];
      
      // Skip if any data is missing
      if (!sheetName || !columnName || !formatCategory) continue;
      
      // Initialize sheet in mappings if not exists
      if (!mappings[sheetName]) {
        mappings[sheetName] = {};
      }
      
      // Add column mapping
      mappings[sheetName][columnName] = formatCategory;
    }
    
    // Apply formatting to all sheets
    for (const sheetName in mappings) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      // Get column headers
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) continue;
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      
      // For each column, apply the format
      for (let j = 0; j < headers.length; j++) {
        const columnName = headers[j];
        if (!columnName) continue;
        
        // Get format category for this column
        const formatCategory = mappings[sheetName][columnName];
        if (!formatCategory) continue;
        
        // Get format pattern
        const formatPattern = formatPatterns[formatCategory];
        if (!formatPattern) continue;
        
        // Apply format to the entire column (skip header row)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) { // Only if there's data
          const columnRange = sheet.getRange(2, j + 1, lastRow - 1, 1);
          columnRange.setNumberFormat(formatPattern);
          
          // Log for debugging
          Logger.log(`Applied ${formatCategory} (${formatPattern}) to ${sheetName}.${columnName}`);
        }
      }
    }
  } catch (error) {
    Logger.log('Error in applyFormattingToAllSheets: ' + error.message);
  }
}

/**
 * Refresh the column mapping sheet to include new sheets and columns
 * This is the only function that still needs to be triggered manually
 */
function refreshColumnMapping() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Get the mapping sheet
    const mappingSheet = ss.getSheetByName('ColumnFormatMapping');
    if (!mappingSheet) {
      ui.alert('Column Format Mapping sheet not found. Please run the setup function first.');
      return;
    }
    
    // Get current mappings to preserve format choices
    const currentMappings = {};
    const mappingData = mappingSheet.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < mappingData.length; i++) {
      if (mappingData[i][0] && mappingData[i][1]) {
        const sheetName = mappingData[i][0];
        const columnName = mappingData[i][1];
        const formatCategory = mappingData[i][2];
        
        // Initialize sheet in mappings if not exists
        if (!currentMappings[sheetName]) {
          currentMappings[sheetName] = {};
        }
        
        // Add column mapping
        currentMappings[sheetName][columnName] = formatCategory;
      }
    }
    
    // Clear the mapping sheet (except header)
    if (mappingSheet.getLastRow() > 1) {
      mappingSheet.deleteRows(2, mappingSheet.getLastRow() - 1);
    }
    
    // Repopulate with all sheets and columns, preserving existing mappings
    populateColumnMappingWithExisting(mappingSheet, currentMappings);
    
    // Apply formatting to all sheets
    applyFormattingToAllSheets();
    
    ui.alert('Column mapping refreshed successfully.');
  } catch (error) {
    ui.alert('Error refreshing column mapping: ' + error.message);
    Logger.log('Error in refreshColumnMapping: ' + error.message);
  }
}

/**
 * Populate the Column Format Mapping sheet with all sheets and columns
 * Preserves existing mappings
 */
function populateColumnMappingWithExisting(sheet, currentMappings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  
  let rowIndex = 2; // Start after header row
  
  // Loop through all sheets
  for (let i = 0; i < allSheets.length; i++) {
    const currentSheet = allSheets[i];
    const sheetName = currentSheet.getName();
    
    // Skip configuration sheets
    if (sheetName === 'FormatConfigurations' || sheetName === 'ColumnFormatMapping') {
      continue;
    }
    
    // Get column headers
    const lastColumn = currentSheet.getLastColumn();
    if (lastColumn === 0) {
      continue; // Skip empty sheets
    }
    
    const headers = currentSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // For each column, add a row to the mapping sheet
    for (let j = 0; j < headers.length; j++) {
      const columnName = headers[j];
      if (!columnName) continue; // Skip empty column names
      
      // Check if we have existing mapping
      let formatCategory = 'Text';
      
      if (currentMappings[sheetName] && currentMappings[sheetName][columnName]) {
        formatCategory = currentMappings[sheetName][columnName];
      } else {
        formatCategory = guessDefaultFormat(columnName);
      }
      
      // Add to mapping sheet
      sheet.getRange(rowIndex, 1, 1, 3).setValues([[sheetName, columnName, formatCategory]]);
      rowIndex++;
    }
  }
  
  // Add data validation for the Format Category column
  const formatValues = ['Currency', 'Decimal', 'Integer', 'Percentage', 'Date', 'DateTime', 'Text'];
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(formatValues).build();
  
  if (rowIndex > 2) {
    sheet.getRange(2, 3, rowIndex - 2, 1).setDataValidation(rule);
  }
  
  // Add instructions at the bottom
  sheet.getRange(rowIndex + 2, 1).setValue('Instructions:');
  sheet.getRange(rowIndex + 3, 1).setValue('1. Update the Format Category column to change formatting for a column.');
  sheet.getRange(rowIndex + 4, 1).setValue('2. Changes will automatically be applied to all sheets.');
  sheet.getRange(rowIndex + 5, 1).setValue('3. Run "Refresh Column Mapping" from the menu if you add new sheets or columns.');
}

function formatSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return;
  }
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return;
  }

  const lastColumn = sheet.getLastColumn();
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);
  
  // Make headers bold and add background
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');

  // Freeze the first row
  sheet.setFrozenRows(1);
  
  // Auto-resize all columns
  sheet.autoResizeColumns(1, lastColumn);
}