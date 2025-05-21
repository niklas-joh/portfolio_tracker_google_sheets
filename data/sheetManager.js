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

  /**
   * Ensures a sheet with the given name exists. If not, it creates it.
   * @param {string} sheetName The name of the sheet.
   * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
   */
  ensureSheetExists(sheetName) {
    let sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
      Logger.log(`SheetManager: Created sheet "${sheetName}".`);
    }
    return sheet;
  }

  /**
   * Sets the header row for a given sheet.
   * @param {string} sheetName The name of the sheet.
   * @param {string[]} headers An array of header strings.
   */
  setHeaders(sheetName, headers) {
    const sheet = this.ensureSheetExists(sheetName);
    sheet.clearContents(); // Clear existing content before setting new headers
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    Logger.log(`SheetManager: Set headers for sheet "${sheetName}": ${headers.join(", ")}`);
  }

  /**
   * Updates a sheet with new data, clearing old data below the headers.
   * @param {string} sheetName The name of the sheet.
   * @param {Array<Array<any>>} dataRows An array of arrays representing rows of data.
   * @param {string[]} headers An array of header strings (used to determine columns).
   */
  updateSheetData(sheetName, dataRows, headers) {
    try {
      const sheet = this.ensureSheetExists(sheetName);
      
      // Validate dataRows before clearing the sheet
      if (!dataRows || !Array.isArray(dataRows)) {
        Logger.log(`SheetManager: Invalid dataRows for sheet "${sheetName}". Not clearing or updating.`);
        return;
      }
      
      Logger.log(`SheetManager: Preparing to update sheet "${sheetName}" with ${dataRows.length} rows of data.`);
      
      // Only clear and update if we have valid data to write
      if (dataRows.length > 0) {
        // Clear old data (below header row)
        if (sheet.getLastRow() > 1) {
          Logger.log(`SheetManager: Clearing existing data in sheet "${sheetName}".`);
          sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        }
        
        try {
          // Ensure headers array is valid and has a length property for determining numColumns
          const numColumns = Array.isArray(headers) && headers.length > 0 ? headers.length : (dataRows[0] ? dataRows[0].length : 1);
          
          Logger.log(`SheetManager: Writing ${dataRows.length} rows with ${numColumns} columns to sheet "${sheetName}".`);
          sheet.getRange(2, 1, dataRows.length, numColumns).setValues(dataRows);
          Logger.log(`SheetManager: Successfully updated sheet "${sheetName}" with ${dataRows.length} rows of data.`);
        } catch (writeError) {
          Logger.log(`SheetManager: Error writing data to sheet "${sheetName}": ${writeError.message}`);
          throw new Error(`Failed to write data to sheet "${sheetName}": ${writeError.message}`);
        }
      } else {
        Logger.log(`SheetManager: No data rows to update for sheet "${sheetName}". Sheet not cleared.`);
      }
    } catch (error) {
      Logger.log(`SheetManager: Error in updateSheetData for sheet "${sheetName}": ${error.message}`);
      throw error; // Re-throw to allow calling code to handle the error
    }
  }

  /**
   * Retrieves all data from a sheet, excluding the header row.
   * @param {string} sheetName The name of the sheet.
   * @return {Array<Array<any>>} An array of arrays representing rows of data.
   */
  getSheetData(sheetName) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`SheetManager: Sheet "${sheetName}" not found.`);
      return [];
    }
    if (sheet.getLastRow() <= 1) {
      Logger.log(`SheetManager: Sheet "${sheetName}" has no data beyond headers.`);
      return [];
    }
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    Logger.log(`SheetManager: Retrieved ${data.length} rows from sheet "${sheetName}".`);
    return data;
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

  // Log the row data being written for debugging purposes
  Logger.log(`Writing to ${sheet} and row ${startRow + rowIndex}: ${JSON.stringify(flattenedRow)}`);

  // Write the flattened row to the sheet
  sheet.getRange(startRow + rowIndex, 1, 1, flattenedRow.length).setValues([flattenedRow]);
});
}
