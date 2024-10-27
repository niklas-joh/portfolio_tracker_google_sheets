// modalManager.js
/**
 * @class ModalManager
 * @description Manages multi-step modal dialogs with progress tracking and navigation
 */
class ModalManager {
    /**
     * @constructor
     * @description Initializes a new ModalManager instance
     */
    constructor() {
      this.currentStep = 0;
      this.steps = [];
      this.state = {};
    }
  
    /**
     * @method initializeJourney
     * @description Sets up a new modal journey with the specified steps
     * @param {Array<{id: string, title: string, template: string, validate?: Function}>} steps 
     * @param {Object} [initialState={}] Optional initial state for the journey
     */
    initializeJourney(steps, initialState = {}) {
      this.steps = steps;
      this.currentStep = 0;
      this.state = initialState;
      this.showCurrentStep();
    }
  
    /**
     * @method showCurrentStep
     * @description Displays the current step's modal content
     * @private
     */
    showCurrentStep() {
      const template = HtmlService.createTemplateFromFile('html/base');
      template.step = this.steps[this.currentStep];
      template.progress = {
        current: this.currentStep + 1,
        total: this.steps.length,
        percentage: ((this.currentStep + 1) / this.steps.length) * 100
      };
      template.state = this.state;
      template.showBack = this.currentStep > 0;
      template.showNext = !this.steps[this.currentStep].isLast;
      template.showFinish = this.steps[this.currentStep].isLast;
      
      const html = template.evaluate()
        .setWidth(600)
        .setHeight(400)
        .setTitle(this.steps[this.currentStep].title);
        
      SpreadsheetApp.getUi().showModalDialog(html, this.steps[this.currentStep].title);
    }
  
    /**
     * @method handleNavigation
     * @description Handles navigation between steps, including validation and API calls
     * @param {string} direction - Either 'next' or 'back'
     * @param {Object} formData - Form data from the current step
     * @returns {Object} Navigation result including success status and any error messages
     */
    async handleNavigation(direction, formData = {}) {
      try {
        if (direction === 'next') {
          // Validate current step if validation function exists
          const currentStep = this.steps[this.currentStep];
          if (currentStep.validate) {
            const validationResult = currentStep.validate(formData);
            if (!validationResult.success) {
              return {
                success: false,
                error: validationResult.error
              };
            }
          }
  
          // Process API call if required
          if (currentStep.apiCall) {
            const apiResult = await currentStep.apiCall(formData);
            if (!apiResult.success) {
              return {
                success: false,
                error: apiResult.error
              };
            }
          }
  
          // Update state with form data
          this.state = { ...this.state, ...formData };
  
          // Move to next step if not at the end
          if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showCurrentStep();
          }
        } else if (direction === 'back' && this.currentStep > 0) {
          this.currentStep--;
          this.showCurrentStep();
        }
  
        return { success: true };
      } catch (error) {
        console.error('Navigation error:', error);
        return {
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        };
      }
    }
  
    /**
     * @method completeJourney
     * @description Handles the completion of the journey
     * @param {Object} finalData - Final form data from the last step
     * @returns {Object} Completion result including success status and any error messages
     */
    async completeJourney(finalData = {}) {
      try {
        const finalStep = this.steps[this.currentStep];
        
        // Final validation if needed
        if (finalStep.validate) {
          const validationResult = finalStep.validate(finalData);
          if (!validationResult.success) {
            return {
              success: false,
              error: validationResult.error
            };
          }
        }
  
        // Final API call if needed
        if (finalStep.apiCall) {
          const apiResult = await finalStep.apiCall(finalData);
          if (!apiResult.success) {
            return {
              success: false,
              error: apiResult.error
            };
          }
        }
  
        // Update final state
        this.state = { ...this.state, ...finalData };
  
        return { 
          success: true,
          message: 'Journey completed successfully'
        };
      } catch (error) {
        console.error('Completion error:', error);
        return {
          success: false,
          error: 'An unexpected error occurred while completing the journey.'
        };
      }
    }
  }
  
  // Create a singleton instance
  const modalManager = new ModalManager();
  
  /**
   * @function startSetupProcess
   * @description Initiates the setup process journey
   */
  function startSetupProcess() {
    const setupJourney = [
      {
        id: 'environment',
        title: 'Select Environment',
        template: 'step1',
        validate: (data) => ({
          success: !!data.environment,
          error: !data.environment ? 'Please select an environment' : null
        })
      },
      {
        id: 'apiKey',
        title: 'API Key Configuration',
        template: 'step2',
        validate: (data) => ({
          success: !!data.apiKey && data.apiKey.length > 0,
          error: !data.apiKey ? 'Please enter an API key' : null
        }),
        apiCall: async (data) => {
          // Simulate API key validation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: true };
        }
      },
      {
        id: 'confirmation',
        title: 'Confirmation',
        template: 'step3',
        isLast: true
      }
    ];
  
    modalManager.initializeJourney(setupJourney);
  }

  /**
 * Gets the current state of the journey
 * @returns {Object} The current state
 */
function getState() {
    return ModalManager.state || {};
  }
  
  // Update the showCurrentStep method in the ModalManager class
  showCurrentStep() {
    const template = HtmlService.createTemplateFromFile('html/base');
    template.step = this.steps[this.currentStep];
    template.progress = {
      current: this.currentStep + 1,
      total: this.steps.length,
      percentage: ((this.currentStep + 1) / this.steps.length) * 100
    };
    template.showBack = this.currentStep > 0;
    template.showNext = !this.steps[this.currentStep].isLast;
    template.showFinish = this.steps[this.currentStep].isLast;
    
    const html = template.evaluate()
      .setWidth(600)
      .setHeight(400)
      .setTitle(this.steps[this.currentStep].title);
      
    SpreadsheetApp.getUi().showModalDialog(html, this.steps[this.currentStep].title);
  }