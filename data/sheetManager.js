/**
 * Sheet Manager class to handle spreadsheet operations
 */
class SheetManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  initializeSheets() {
    // Use sheet names from API_RESOURCES
    Object.values(API_RESOURCES).forEach(resource => {
      if (resource.sheetName && !this.spreadsheet.getSheetByName(resource.sheetName)) {
        this.createSheet(resource.sheetName);
      }
    });
  }

  createSheet(sheetName) {
    const sheet = this.spreadsheet.insertSheet(sheetName);
    
    if (sheetName === API_RESOURCES.ACCOUNT_INFO.sheetName) {
      this.setupConfigSheet(sheet);
    }
    // Add other sheet setup cases as needed
  }

  setupConfigSheet(sheet) {
    sheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
    sheet.getRange('A2:A5').setValues([
      ['API Key'],
      ['Environment'],
      ['Last Updated'],
      ['Auto Refresh']
    ]);
    sheet.protect().setWarningOnly(true);
  }
}

/**
* ===================== Sheet Management ========================
* 
* This section contains functions that are responsible for managing 
* Google Sheets. These functions ensure that the target sheet exists, 
* clear existing content, and write new data, such as headers and rows.
* 
* These functions simplify common Google Sheets tasks such as:
* - Checking for or creating a sheet if it does not exist (`getOrCreateSheet`).
* - Clearing sheets and writing headers (`clearSheetAndWriteHeaders`).
* - Writing rows of data to the sheet (`writeRowsToSheet`).
* 
* By using these utility functions, the main code remains clean, 
* and the sheet operations are consistently handled.
*/


/**
* Checks if a Google Sheets sheet with the given name exists, and if not, creates it.
* 
* @param {string} sheetName - The name of the sheet to check or create.
* @returns {GoogleAppsScript.Spreadsheet.Sheet} The existing or newly created sheet.
*/
function getOrCreateSheet(sheetName) {
var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var sheet = spreadsheet.getSheetByName(sheetName);

// If the sheet does not exist, create it
if (!sheet) {
  sheet = spreadsheet.insertSheet(sheetName);
  Logger.log('Sheet "' + sheetName + '" did not exist and was created.');
} else {
  Logger.log('Sheet "' + sheetName + '" already exists.');
}

return sheet;
}

/**
* Clears the content of a sheet and writes headers to the first row.
*
* @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to clear and write to.
* @param {Array<string>} headers - The headers to write in the first row.
*/
function clearSheetAndWriteHeaders(sheet, headers) {
sheet.clear();  // Clear previous content
if (headers.length > 0) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
} else {
  Logger.log('No headers to write');
}
}
/**
* ===================== Data Processing Functions ========================
* 
* The functions in this section handle the dynamic generation of headers 
* from the data retrieved from the API, as well as writing both the headers 
* and data to the Google Sheets. They support both single object responses 
* and arrays of objects.
* 
* - `extractHeaders`: Recursively extracts headers (field paths) from 
*   nested JSON objects.
* - `resolveNestedField`: Extracts values from nested objects based on 
*   a dot-separated path.
*/

/**
* Writes data to the specified Google Sheet, starting from the provided row.
* 
* @param {Object|Array} data - The data to write (can be an object or array of objects).
* @param {string} sheetName - The name of the sheet where data will be written.
* @param {number} [startRow=2] - The row number to start writing data (default is 2).
* @returns {number} - The number of rows written.
*/
function writeDataToSheet(data, sheetName, startRow = 2) {
const sheet = getOrCreateSheet(sheetName);
const isArray = Array.isArray(data);
const headers = isArray ? extractHeaders(data[0]) : extractHeaders(data);

// Write headers if starting from row 2 (first page of data)
if (startRow === 2) {
  clearSheetAndWriteHeaders(sheet, headers);
}

// Prepare data rows
const rowData = isArray
  ? data.map(item => headers.map(header => resolveNestedField(item, header)))
  : [headers.map(header => resolveNestedField(data, header))];

Logger.log(`Raw rowData: ${JSON.stringify(rowData)}`);

// Write data to the sheet
writeRowsToSheet(sheet, rowData, startRow);

// Return the number of rows written
return rowData.length;
}


/**
* Writes row data to the given sheet starting from the specified row index.
* Handles the case where resolveNestedField returns an array, spreading it across multiple columns.
* 
* @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to write the data into.
* @param {Array<Array<string>>} rowData - The data to write into the sheet.
* @param {number} startRow - The row number to start writing the data (default is 2).
*/
function writeRowsToSheet(sheet, rowData, startRow = 2) {
if (!sheet) {
  Logger.log('No valid sheet found to write data.');
  return;
}

  rowData.forEach((row, rowIndex) => {
    // Flatten the row if any cell contains an array (spread array values across columns)
    const flattenedRow = row.flatMap(cell => Array.isArray(cell) ? cell : [cell]);

    // Notify progress for each row written
    updateProgress(`Fetching row ${startRow + rowIndex}`);

  // Log the row data being written for debugging purposes
  Logger.log(`Writing to ${sheet} and row ${startRow + rowIndex}: ${JSON.stringify(flattenedRow)}`);

  // Write the flattened row to the sheet
  sheet.getRange(startRow + rowIndex, 1, 1, flattenedRow.length).setValues([flattenedRow]);
  });

  // Update progress when a batch of rows is completed
  updateProgress(`Completed rows through ${startRow + rowData.length - 1}`);
}