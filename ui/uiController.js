/**
 * ===================== UI Controller ========================
 * 
 * This file manages the UI components of the application, loading HTML files
 * and handling dialog display.
 */

/**
 * UI Controller class that handles loading HTML templates and displaying dialogs.
 */
class UIController {
  /**
   * Creates a new UIController instance.
   */
  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * Sets up the main menu in the spreadsheet.
   */
  createMainMenu() {
    const ui = SpreadsheetApp.getUi();
    
    ui.createMenu('Trading212 Integration')
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

  /**
   * Creates and returns an HTML template with the given name and optional template data.
   * 
   * @param {string} templateName - The name of the HTML file without the .html extension.
   * @param {Object} [templateData={}] - Optional data to pass to the template.
   * @returns {GoogleAppsScript.HTML.HtmlOutput} The HTML output.
   */
  createTemplate(templateName, templateData = {}) {
    // Create the template from the HTML file
    let template = HtmlService.createTemplateFromFile(templateName);
    
    // Add data to the template
    for (const key in templateData) {
      template[key] = templateData[key];
    }
    
    // Evaluate the template and set properties
    let htmlOutput = template.evaluate()
      .setWidth(450)
      .setHeight(500)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    return htmlOutput;
  }

  /**
   * Shows a dialog with the given template name, title, and optional template data.
   * 
   * @param {string} templateName - The name of the HTML file without the .html extension.
   * @param {string} title - The title of the dialog.
   * @param {Object} [templateData={}] - Optional data to pass to the template.
   * @param {number} [width=450] - The width of the dialog.
   * @param {number} [height=500] - The height of the dialog.
   */
  showDialog(templateName, title, templateData = {}, width = 450, height = 500) {
    // Create the template
    let htmlOutput = this.createTemplate(templateName, templateData);
    
    // Set dimensions
    htmlOutput.setWidth(width).setHeight(height);
    
    // Show the dialog
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, title);
  }

  /**
   * Shows a dialog for selecting which data to fetch.
   */
  showDataSelectionDialog() {
    this.showDialog('html/DataSelectionDialog', 'Fetch Trading212 Data', {}, 400, 300);
  }

  /**
   * Shows a dialog for configuring API settings.
   */
  showApiSettingsDialog() {
    // Get current settings with defensive coding
    const environment = this.configManager.get('API', 'ENVIRONMENT', 'demo') || 'demo';
    const apiKey = this.configManager.get('API', 'API_KEY', '') || '';
    const rateLimitStrategy = this.configManager.get('API', 'RATE_LIMIT_STRATEGY', 'conservative') || 'conservative';
    
    // Pass the settings to the template
    const templateData = {
      environment: String(environment),
      apiKey: String(apiKey),
      rateLimitStrategy: String(rateLimitStrategy)
    };
    
    this.showDialog('html/ApiSettingsDialog', 'API Settings', templateData, 400, 350);
  }

  /**
   * Shows a dialog for configuring sheet mappings.
   */
  showSheetMappingsDialog() {
    // Get current mappings
    const mappings = this.configManager.getCategory('SheetMappings');
    
    // Pass the mappings to the template
    const templateData = {
      mappings: mappings
    };
    
    this.showDialog('html/SheetMappingsDialog', 'Sheet Mappings', templateData, 450, 500);
  }

  /**
   * Shows a dialog for configuring column formatting.
   */
  showColumnFormattingDialog() {
    const configManager = new ConfigManager();
    const formatManager = new FormatManager(configManager);
    formatManager.showFormattingUI();
  }

  /**
   * Shows a dialog for advanced configuration options.
   */
  showAdvancedConfigDialog() {
    // Get all categories
    const categories = this.configManager.getCategories();
    
    // Pass the categories to the template
    const templateData = {
      categories: categories
    };
    
    this.showDialog('html/AdvancedConfigDialog', 'Advanced Configuration', templateData, 600, 700);
  }

  /**
   * Shows the tracking report in a dialog.
   */
  showTrackingReport() {
    const sheetTracker = new SheetTracker(this.configManager);
    const report = sheetTracker.generateTrackingReport();
    
    // Pass the report to the template
    const templateData = {
      report: report
    };
    
    this.showDialog('html/TrackingReportDialog', 'Sheet Tracking Report', templateData, 600, 400);
  }

  /**
   * Shows an about dialog with information about the application.
   */
  showAboutDialog() {
    const installDate = this.configManager.get('App', 'INSTALL_DATE', new Date());
    const lastModified = this.configManager.get('API', 'LAST_MODIFIED', new Date());
    
    // Pass the data to the template
    const templateData = {
      installDate: installDate,
      lastModified: lastModified
    };
    
    this.showDialog('html/AboutDialog', 'About', templateData, 400, 350);
  }
}

// Create a global instance for easy access
const UI = new UIController();

// These functions are exposed globally for the menu items

/**
 * Shows the data selection dialog.
 */
function showDataSelectionDialog() {
  UI.showDataSelectionDialog();
}

/**
 * Shows the API settings dialog.
 */
function showApiSettingsDialog() {
  UI.showApiSettingsDialog();
}

/**
 * Shows the sheet mappings dialog.
 */
function showSheetMappingsDialog() {
  UI.showSheetMappingsDialog();
}

/**
 * Shows the advanced configuration dialog.
 */
function showAdvancedConfigDialog() {
  UI.showAdvancedConfigDialog();
}

/**
 * Shows the tracking report dialog.
 */
function showTrackingReport() {
  UI.showTrackingReport();
}

/**
 * Shows the about dialog.
 */
function showAboutDialog() {
  UI.showAboutDialog();
}