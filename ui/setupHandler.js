/**
 * Displays the setup modal for the Trading212 Portfolio Manager.
 * This function is responsible for showing the initial welcome modal to the user.
 * 
 * @function
 * @name showSetupModal
 * @description Opens the setup modal with a welcome message for the Trading212 Portfolio Manager.
 */
function showSetupModal() {
  showModal('html/setup', 'Welcome to Trading212 Portfolio Manager');
}

/**
 * Displays the modal for fetching Trading212 data.
 * This function is called when the user chooses to fetch data after completing the setup process.
 * 
 * @function
 * @name showFetchDataModal
 * @description Opens a new modal window with options for fetching different types of Trading212 data.
 */
function showFetchDataModal() {
  showModal('html/fetchData', 'Fetch Trading212 Data');
  resetSteps();
}