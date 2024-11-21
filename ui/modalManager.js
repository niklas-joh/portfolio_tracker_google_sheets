/**
 * Modal Manager class to handle different modal states and transitions
 */
class ModalManager {
    constructor() {
      this.currentStep = 0;
      this.steps = [
        'welcome',
        'environment-selection',
        'api-setup',
        'sheet-setup',
        'completion'
      ];
    }
  
    nextStep() {
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        return this.steps[this.currentStep];
      }
      return null;
    }
  
    previousStep() {
      if (this.currentStep > 0) {
        this.currentStep--;
        return this.steps[this.currentStep];
      }
      return null;
    }
  }
/**
 * Shows a modal dialog with the specified template and title
 * @param {string} templateFile - The name of the HTML template file
 * @param {string} title - The title of the modal
 * @param {Object} [size] - Optional size parameters for the modal
 * @param {number} [size.width=600] - The width of the modal
 * @param {number} [size.height=400] - The height of the modal
 */
 function showModal(templateFile, title, size = { width: 600, height: 400 }) {
  const modalHtml = createModalHtml(templateFile, size);
  SpreadsheetApp.getUi().showModalDialog(modalHtml, title);
 }
  
/**
 * Creates and evaluates an HTML template from a file
 * @param {string} filename - The name of the HTML template file
 * @param {Object} size - Size parameters for the modal
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated HTML output
 */
 function createModalHtml(filename, size) {
  const template = HtmlService.createTemplateFromFile(filename);
  return template.evaluate()
    .setWidth(size.width)
    .setHeight(size.height);
  }

 /**
 * Includes an HTML file in the current template and evaluates it as a template
 * @param {string} filename Name of the HTML file to include
 * @param {Object} data Data to pass to the template
 * @returns {string} HTML content
 */
 function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
 }