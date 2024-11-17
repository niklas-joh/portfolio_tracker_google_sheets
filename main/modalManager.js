// modalManager.js

/**
 * Manages the modal dialog for the setup process.
 * @class
 */
class ModalManager {
  /**
   * Creates an instance of ModalManager.
   * Initializes the setup steps and retrieves user properties.
   * @constructor
   */
  constructor() {
    /**
     * Array of setup steps.
     * @type {Array<Object>}
     */
    this.steps = [
      { title: 'Select Environment', template: 'step1', required: ['environment'] },
      { title: 'API Key', template: 'step2', required: ['apiKey'] },
      { title: 'Confirmation', template: 'step3', isLast: true }
    ];

    /**
     * User properties service.
     * @type {GoogleAppsScript.Properties.Properties}
     */
    this.userProps = PropertiesService.getUserProperties();

    /**
     * Current step index.
     * @type {number}
     */
    this.currentStep = parseInt(this.userProps.getProperty('CURRENT_STEP')) || 0;
  }

  /**
   * Displays the current step in the modal dialog.
   */
  showCurrentStep() {
    const template = HtmlService.createTemplateFromFile('html/base');
    
    template.data = {
      step: this.steps[this.currentStep],
      state: {
        environment: this.userProps.getProperty('ENVIRONMENT'),
        apiKey: this.userProps.getProperty('API_KEY')
      },
      progress: {
        current: this.currentStep + 1,
        total: this.steps.length,
        percentage: ((this.currentStep + 1) / this.steps.length) * 100
      },
      showBack: this.currentStep > 0,
      showNext: this.currentStep < this.steps.length - 1,
      showFinish: this.currentStep === this.steps.length - 1
    };
    
    const html = template.evaluate()
      .setWidth(600)
      .setHeight(400)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
      
    SpreadsheetApp.getUi().showModalDialog(html, this.steps[this.currentStep].title);
  }

  /**
   * Validates the current step based on required fields.
   * @param {Object} formData - The form data to validate.
   * @returns {Object} An object indicating if the validation passed and any error message.
   */
  validateStep(formData) {
    const currentStep = this.steps[this.currentStep];
    if (!currentStep.required) return { valid: true };

    const missingFields = currentStep.required.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Please fill in all required fields: ${missingFields.join(', ')}`
      };
    }
    return { valid: true };
  }

  /**
   * Saves form data to user properties.
   * @param {Object} formData - The form data to save.
   */
  saveFormData(formData) {
    Object.entries(formData).forEach(([key, value]) => {
      if (value) this.userProps.setProperty(key.toUpperCase(), value);
    });
  }

  /**
   * Handles navigation between steps.
   * @param {string} direction - The direction to navigate ('next', 'back', or 'finish').
   * @param {Object} [formData={}] - The form data to save.
   * @returns {Object} An object indicating if the navigation was successful and any error message.
   */
  handleNavigation(direction, formData = {}) {
    try {
      // Validate current step if moving forward
      if (direction === 'next') {
        const validation = this.validateStep(formData);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }
      }

      // Save any form data
      this.saveFormData(formData);

      // Handle navigation
      switch (direction) {
        case 'next':
          if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.userProps.setProperty('CURRENT_STEP', this.currentStep.toString());
            this.showCurrentStep();
            return { success: true };
          }
          break;

        case 'back':
          if (this.currentStep > 0) {
            this.currentStep--;
            this.userProps.setProperty('CURRENT_STEP', this.currentStep.toString());
            this.showCurrentStep();
            return { success: true };
          }
          break;

        case 'finish':
          this.userProps.setProperty('SETUP_COMPLETE', 'true');
          return { success: true };
      }

      return { success: false, error: 'Invalid navigation request' };
    } catch (error) {
      console.error('Navigation error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Resets the setup process by clearing all related user properties.
   */
  reset() {
    const properties = ['CURRENT_STEP', 'ENVIRONMENT', 'API_KEY', 'SETUP_COMPLETE'];
    properties.forEach(prop => this.userProps.deleteProperty(prop));
  }
}

/**
 * The modal manager instance.
 * @type {ModalManager}
 */
const modalManager = new ModalManager();

/**
 * Starts the setup process by resetting the state and showing the first step.
 */
function startSetupProcess() {
  modalManager.reset();  // Clear any previous state
  modalManager.currentStep = 0;
  modalManager.showCurrentStep();
}

/**
 * Handles navigation between steps.
 * @param {string} direction - The direction to navigate.
 * @param {Object} formData - The form data to save.
 * @returns {Object} The result of the navigation attempt.
 */
function handleNavigation(direction, formData) {
  return modalManager.handleNavigation(direction, formData);
}

/**
 * Includes and evaluates an HTML template file.
 * @param {string} filename - The name of the file to include.
 * @param {Object} data - The data to pass to the template.
 * @returns {string} The evaluated HTML content.
 */
function include(filename, data) {
  const template = HtmlService.createTemplateFromFile(filename);
  template.data = data;
  return template.evaluate().getContent();
}