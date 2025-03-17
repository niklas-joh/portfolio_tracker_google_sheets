/**
 * ===================== Sheet Tracker ========================
 * 
 * A class for tracking sheet and column update times and other metadata.
 * This class works with the ConfigManager to store update timestamps
 * and other tracking information.
 */
class SheetTracker {
    /**
     * Creates a new SheetTracker instance.
     * @param {ConfigManager} configManager - The configuration manager instance.
     */
    constructor(configManager) {
      this.configManager = configManager;
      this.trackedSheets = this.loadTrackedSheets();
    }
  
    /**
     * Loads the list of tracked sheets from the config.
     * @returns {Object} An object mapping sheet names to tracking metadata.
     */
    loadTrackedSheets() {
      return this.configManager.get('SheetTracking', 'TRACKED_SHEETS', {});
    }
  
    /**
     * Saves the list of tracked sheets to the config.
     */
    saveTrackedSheets() {
      this.configManager.set(
        'SheetTracking', 
        'TRACKED_SHEETS', 
        this.trackedSheets, 
        'json', 
        'Metadata for tracked sheets'
      );
    }
  
    /**
     * Registers a sheet for tracking.
     * @param {string} sheetName - The name of the sheet to track.
     * @param {Object} [metadata={}] - Optional metadata for the sheet.
     */
    registerSheet(sheetName, metadata = {}) {
      if (!this.trackedSheets[sheetName]) {
        this.trackedSheets[sheetName] = {
          registered: new Date(),
          lastUpdate: null,
          updateCount: 0,
          columns: {},
          ...metadata
        };
        this.saveTrackedSheets();
        Logger.log(`Registered sheet "${sheetName}" for tracking.`);
      }
    }
  
    /**
     * Updates the tracking information for a sheet.
     * @param {string} sheetName - The name of the sheet.
     * @param {Object} [metadata={}] - Optional metadata to update.
     */
    updateSheetTracking(sheetName, metadata = {}) {
      if (!this.trackedSheets[sheetName]) {
        this.registerSheet(sheetName, metadata);
        return;
      }
      
      const now = new Date();
      this.trackedSheets[sheetName] = {
        ...this.trackedSheets[sheetName],
        lastUpdate: now,
        updateCount: (this.trackedSheets[sheetName].updateCount || 0) + 1,
        ...metadata
      };
      
      // Store the last update time in the config
      this.configManager.set(
        'SheetTracking', 
        `LAST_UPDATE_${sheetName}`, 
        now, 
        'date', 
        `Last time ${sheetName} was updated`
      );
      
      this.saveTrackedSheets();
      Logger.log(`Updated tracking for sheet "${sheetName}".`);
    }
  
    /**
     * Updates the tracking information for a specific column.
     * @param {string} sheetName - The name of the sheet.
     * @param {string} columnName - The name of the column.
     * @param {Object} [metadata={}] - Optional metadata for the column.
     */
    updateColumnTracking(sheetName, columnName, metadata = {}) {
      if (!this.trackedSheets[sheetName]) {
        this.registerSheet(sheetName);
      }
      
      if (!this.trackedSheets[sheetName].columns) {
        this.trackedSheets[sheetName].columns = {};
      }
      
      const now = new Date();
      this.trackedSheets[sheetName].columns[columnName] = {
        ...(this.trackedSheets[sheetName].columns[columnName] || {}),
        lastUpdate: now,
        updateCount: (this.trackedSheets[sheetName].columns[columnName]?.updateCount || 0) + 1,
        ...metadata
      };
      
      // Store the last column update time in the config
      this.configManager.set(
        'SheetTracking', 
        `LAST_UPDATE_${sheetName}_${columnName}`, 
        now, 
        'date', 
        `Last time column ${columnName} in ${sheetName} was updated`
      );
      
      this.saveTrackedSheets();
      Logger.log(`Updated tracking for column "${columnName}" in sheet "${sheetName}".`);
    }
  
    /**
     * Gets tracking information for a specific sheet.
     * @param {string} sheetName - The name of the sheet.
     * @returns {Object|null} The tracking metadata for the sheet or null if not found.
     */
    getSheetTracking(sheetName) {
      return this.trackedSheets[sheetName] || null;
    }
  
    /**
     * Gets tracking information for a specific column.
     * @param {string} sheetName - The name of the sheet.
     * @param {string} columnName - The name of the column.
     * @returns {Object|null} The tracking metadata for the column or null if not found.
     */
    getColumnTracking(sheetName, columnName) {
      if (!this.trackedSheets[sheetName] || !this.trackedSheets[sheetName].columns) {
        return null;
      }
      
      return this.trackedSheets[sheetName].columns[columnName] || null;
    }
  
    /**
     * Gets the last update time for a sheet.
     * @param {string} sheetName - The name of the sheet.
     * @returns {Date|null} The last update time or null if the sheet is not tracked.
     */
    getLastUpdateTime(sheetName) {
      const tracking = this.getSheetTracking(sheetName);
      return tracking ? tracking.lastUpdate : null;
    }
  
    /**
     * Gets the last update time for a column.
     * @param {string} sheetName - The name of the sheet.
     * @param {string} columnName - The name of the column.
     * @returns {Date|null} The last update time or null if the column is not tracked.
     */
    getLastColumnUpdateTime(sheetName, columnName) {
      const tracking = this.getColumnTracking(sheetName, columnName);
      return tracking ? tracking.lastUpdate : null;
    }
  
    /**
     * Gets all tracked sheets.
     * @returns {Object} An object mapping sheet names to tracking metadata.
     */
    getAllTrackedSheets() {
      return {...this.trackedSheets};
    }
  
    /**
     * Creates a tracking report for all tracked sheets.
     * @returns {string} A string containing the tracking report.
     */
    generateTrackingReport() {
      let report = '=== Sheet Tracking Report ===\n\n';
      
      for (const sheetName in this.trackedSheets) {
        const sheet = this.trackedSheets[sheetName];
        report += `Sheet: ${sheetName}\n`;
        report += `- Registered: ${sheet.registered ? new Date(sheet.registered).toLocaleString() : 'N/A'}\n`;
        report += `- Last Update: ${sheet.lastUpdate ? new Date(sheet.lastUpdate).toLocaleString() : 'Never'}\n`;
        report += `- Update Count: ${sheet.updateCount || 0}\n`;
        
        if (sheet.columns && Object.keys(sheet.columns).length > 0) {
          report += '- Columns:\n';
          for (const columnName in sheet.columns) {
            const column = sheet.columns[columnName];
            report += `  - ${columnName}: Last Update: ${column.lastUpdate ? new Date(column.lastUpdate).toLocaleString() : 'Never'}, Count: ${column.updateCount || 0}\n`;
          }
        }
        
        report += '\n';
      }
      
      return report;
    }
  
    /**
     * Creates a tracking sheet that displays tracking information.
     */
    createTrackingSheet() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let trackingSheet = spreadsheet.getSheetByName('SheetTracking');
      
      if (!trackingSheet) {
        trackingSheet = spreadsheet.insertSheet('SheetTracking');
      }
      
      // Clear existing content
      trackingSheet.clear();
      
      // Set up headers
      const headers = ['Sheet Name', 'Registered', 'Last Update', 'Update Count', 'Last Columns Updated'];
      trackingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      trackingSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      trackingSheet.setFrozenRows(1);
      
      // Add data for each tracked sheet
      let rowIndex = 2;
      for (const sheetName in this.trackedSheets) {
        const sheet = this.trackedSheets[sheetName];
        
        // Get the three most recently updated columns
        let recentColumns = '';
        if (sheet.columns) {
          const columnEntries = Object.entries(sheet.columns);
          columnEntries.sort((a, b) => {
            const aTime = a[1].lastUpdate ? new Date(a[1].lastUpdate).getTime() : 0;
            const bTime = b[1].lastUpdate ? new Date(b[1].lastUpdate).getTime() : 0;
            return bTime - aTime;
          });
          
          recentColumns = columnEntries.slice(0, 3).map(([name, data]) => {
            const time = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : 'Never';
            return `${name} (${time})`;
          }).join('\n');
        }
        
        const rowData = [
          sheetName,
          sheet.registered ? new Date(sheet.registered) : '',
          sheet.lastUpdate ? new Date(sheet.lastUpdate) : '',
          sheet.updateCount || 0,
          recentColumns
        ];
        
        trackingSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        rowIndex++;
      }
      
      // Format the sheet
      trackingSheet.autoResizeColumns(1, headers.length);
      
      // Add a refresh button
      const refreshButton = trackingSheet.getDrawings()[0] || trackingSheet.insertImage(
        'https://www.gstatic.com/images/icons/material/system/1x/refresh_black_24dp.png',
        1, trackingSheet.getLastColumn() + 2
      );
      
      // Add a time stamp
      trackingSheet.getRange(1, trackingSheet.getLastColumn() + 1).setValue('Last Refresh:');
      trackingSheet.getRange(1, trackingSheet.getLastColumn()).setValue(new Date());
      
      Logger.log('Created tracking sheet with current tracking information.');
    }
  
    /**
     * Adds hooks to sheet and range change events to automatically track updates.
     */
    setupAutoTracking() {
      // This would normally use triggers, but for demonstration we'll create a menu item
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const ui = SpreadsheetApp.getUi();
      
      // Create a custom menu
      const menu = ui.createMenu('Sheet Tracking')
        .addItem('Track Current Sheet', 'trackCurrentSheet')
        .addItem('View Tracking Report', 'showTrackingReport')
        .addItem('Update Tracking Sheet', 'updateTrackingSheet')
        .addToUi();
      
      Logger.log('Set up auto-tracking menu.');
    }
  }
  
  /**
   * Tracks the current active sheet.
   */
  function trackCurrentSheet() {
    try {
      const configManager = new ConfigManager();
      const sheetTracker = new SheetTracker(configManager);
      
      const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const sheetName = activeSheet.getName();
      
      // Register or update the sheet
      sheetTracker.updateSheetTracking(sheetName, {
        manuallyTracked: true,
        rowCount: activeSheet.getLastRow(),
        columnCount: activeSheet.getLastColumn()
      });
      
      // Get headers to track columns
      if (activeSheet.getLastRow() > 0) {
        const headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
        headers.forEach((header, index) => {
          if (header) {
            sheetTracker.updateColumnTracking(sheetName, header, {
              index: index + 1,
              manuallyTracked: true
            });
          }
        });
      }
      
      SpreadsheetApp.getUi().alert(`Successfully tracked sheet "${sheetName}".`);
    } catch (e) {
      Logger.log(`Error tracking current sheet: ${e}`);
      SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    }
  }
  
/**
 * Shows the Tracking Report Dialog to the user.
 */
function showTrackingReportDialog() {
  // Initialize the ConfigManager instance
  const configManager = new ConfigManager();
  
  // Initialize SheetTracker with the configManager
  const sheetTracker = new SheetTracker(configManager);
  
  // Prepare dummy data for the dialog
  // In a real implementation, you'd call actual methods on sheetTracker
  const trackingData = {
    sheetsTrackedCount: 5,
    lastUpdateTime: new Date().toLocaleString(),
    freshnessStatus: "status-recent",
    freshnessLabel: "Up to date",
    sheetTracking: [],
    columnTracking: [],
    sheetNames: [],
    settings: {
      autoUpdateFrequency: 'none',
      trackingDetail: 'standard',
      createTrackingSheet: false,
      enableNotifications: false
    },
    chartData: {}
  };
  
  // Show the dialog
  const ui = new UIController();
  ui.showDialog('html/TrackingReportDialog', 'Trading212 Data Tracking Report', trackingData, 800, 600);
}
  
  /**
   * Updates the tracking sheet.
   */
  function updateTrackingSheet() {
    try {
      const configManager = new ConfigManager();
      const sheetTracker = new SheetTracker(configManager);
      
      sheetTracker.createTrackingSheet();
      
      SpreadsheetApp.getUi().alert('Tracking sheet updated.');
    } catch (e) {
      Logger.log(`Error updating tracking sheet: ${e}`);
      SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    }
  }