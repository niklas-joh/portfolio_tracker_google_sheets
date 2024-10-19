/**
 * Adds a "Start Setup" button to the "Welcome Sheet" that triggers the setup process.
 */
function addStartSetupButton() {
    const sheetName = 'Welcome'; // Ensure this matches the welcome sheet's name
    const sheet = getOrCreateSheet(sheetName);
  
    // Check if a button already exists to avoid duplicates
    const drawings = sheet.getDrawings();
    const existingButton = drawings.find(drawing => drawing.getOnAction() === 'startSetupProcess');
    if (existingButton) return;
  
    // Create a new button to start the setup process
    const button = sheet.insertDrawing(0, 0, 3, 3);
    button.setName('Start Setup')
          .setOnClickFunction('startSetupProcess');
  }
  
  /**
   * Function triggered when the "Start Setup" button is clicked. Guides the user through initial setup.
   */
  function startSetupProcess() {
    // Assuming this is where API Key input or further onboarding steps will happen
    showApiKeySidebar(); // Leads to prompting API key sidebar as the first step of the setup process.
  }