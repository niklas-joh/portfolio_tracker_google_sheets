/**
* Class to manage modal dialogs in the onboarding journey or other user flows.
* Handles the modularity and navigation of different steps.
*/
class ModalManager {
  constructor() {
    this.currentStepIndex = 0;
    this.steps = [];
  }

  /**
   * Initializes the journey with a set of steps.
   * 
   * @param {Array<Object>} steps - An array of steps, each containing a title and htmlFile property.
   */
  initializeJourney(steps) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.showCurrentStep();
  }

  /**
   * Displays the current step of the journey.
   */
  showCurrentStep() {
    const currentStep = this.steps[this.currentStepIndex];
    this.showCustomModal(currentStep.title, currentStep.htmlFile);
  }

  /**
   * Displays the custom modal.
   * 
   * @param {string} title - The title of the modal.
   * @param {string} htmlFile - The HTML file to load for the modal content.
   */
  showCustomModal(title, htmlFile) {
    const template = HtmlService.createTemplateFromFile(htmlFile);
    template.title = title;
    const htmlContent = template.evaluate()
      .setWidth(500)
      .setHeight(400);
    SpreadsheetApp.getUi().showModalDialog(htmlContent, title);
  }

  /**
   * Moves to the next step in the journey.
   */
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.showCurrentStep();
    } else {
      SpreadsheetApp.getUi().alert('You have completed the journey.');
    }
  }

  /**
   * Moves to the previous step in the journey.
   */
  previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.showCurrentStep();
    }
  }
}
 
// Create a singleton instance of ModalManager
const modalManager = new ModalManager();