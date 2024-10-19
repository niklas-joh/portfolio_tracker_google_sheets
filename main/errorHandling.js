/**
 * ===================== Error Handling Functions ========================
 * 
 * This section contains functions responsible for handling errors that occur
 * during API requests and other operations. Centralizing error handling ensures
 * consistent behavior across the application and makes it easier to update
 * error handling logic in one place.
 * 
 * Functions in this section include:
 * - `handleApiError`: Processes API responses based on status codes and
 *   performs appropriate actions.
 * - Any other error handling utilities as needed.
 */

/**
 * Handles HTTP error responses from UrlFetchApp.fetch().
 * Extracts the HTTP response code and message, and logs appropriate error messages.
 *
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - The HTTP response object from UrlFetchApp.fetch().
 * @returns {null} Always returns null to indicate an error occurred.
 */
function handleApiError(response) {
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  Logger.log('Response Code: ' + statusCode);
  Logger.log('Response Text: ' + responseText);

  switch (statusCode) {
    case 400:
      Logger.log('Error 400: Bad filtering arguments.');
      break;
    case 401:
      Logger.log('Error 401: Unauthorized - Bad API key.');
      break;
    case 403:
      Logger.log('Error 403: Forbidden - Scope missing for API key.');
      break;
    case 408:
      Logger.log('Error 408: Request timed out.');
      break;
    case 429:
      Logger.log('Error 429: Rate limit exceeded.');
      break;
    case 500:
      Logger.log('Error 500: Internal server error.');
      break;
    default:
      Logger.log(`Error ${statusCode}: ${responseText}`);
      break;
  }

  // Return null to indicate an error occurred
  return null;
}