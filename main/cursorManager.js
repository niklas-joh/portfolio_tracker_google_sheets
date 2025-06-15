/**
 * Cursor and update management for incremental API fetching.
 */

function cursorProperty(sheetName) {
  return `CURSOR_${sheetName}`;
}

function updatedProperty(sheetName) {
  return `LAST_UPDATED_${sheetName}`;
}

function getLastCursor(sheetName) {
  return PropertiesService.getUserProperties().getProperty(cursorProperty(sheetName));
}

function setLastCursor(sheetName, cursor) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(cursorProperty(sheetName), String(cursor));
  setSheetLastUpdated(sheetName, String(cursor));
}

function getLastUpdated(sheetName) {
  return PropertiesService.getUserProperties().getProperty(updatedProperty(sheetName));
}

function setSheetLastUpdated(sheetName, timestamp) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(updatedProperty(sheetName), timestamp);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet) {
    const finder = sheet.createTextFinder('Last Updated').findNext();
    if (finder) {
      sheet.getRange(finder.getRow(), finder.getColumn() + 1).setValue(timestamp);
    }
  }
}
