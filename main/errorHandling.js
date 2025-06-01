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
class ErrorHandler {
  /**
   * Logs a message with a specified level.
   * @param {string} message The message to log.
   * @param {string} [level='INFO'] The log level (e.g., 'INFO', 'WARN', 'ERROR').
   */
  log(message, level = 'INFO') {
    Logger.log(`[${level}] ${message}`);
  }

  /**
   * Logs an error, including its message and stack trace.
   * @param {Error} error The error object.
   * @param {string} [message=''] An optional additional message.
   */
  logError(error, message = '') {
    const fullMessage = message ? `ERROR: ${message} - ${error.message}` : `ERROR: ${error.message}`;
    Logger.log(fullMessage);
    if (error.stack) {
      Logger.log(error.stack);
    }
    // Optionally, you could also send notifications or store errors in a log sheet here.
  }

  /**
   * Handles HTTP error responses from UrlFetchApp.fetch().
   * Extracts the HTTP response code and message, and logs appropriate error messages.
   * This function is designed to be called by the API client or other network operations.
   * It will throw an error to propagate the issue.
   *
   * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - The HTTP response object from UrlFetchApp.fetch().
   * @param {string} [contextMessage='API request failed'] - A message providing context for the error.
   * @throws {Error} An error object with a detailed message.
   */
  handleApiError(response, contextMessage = 'API request failed') {
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    let errorMessage = `${contextMessage}. Status: ${statusCode}. Response: ${responseText}`;

    switch (statusCode) {
      case 400:
        errorMessage = `${contextMessage}: Bad Request. Check parameters.`;
        break;
      case 401:
        errorMessage = `${contextMessage}: Unauthorized. Invalid or missing API key.`;
        break;
      case 403:
        errorMessage = `${contextMessage}: Forbidden. API key lacks necessary permissions.`;
        break;
      case 404:
        errorMessage = `${contextMessage}: Not Found. The requested resource does not exist.`;
        break;
      case 408:
        errorMessage = `${contextMessage}: Request Timeout.`;
        break;
      case 429:
        errorMessage = `${contextMessage}: Rate Limit Exceeded. Too many requests.`;
        break;
      case 500:
        errorMessage = `${contextMessage}: Internal Server Error. The API encountered an unexpected condition.`;
        break;
      case 502:
      case 503:
      case 504:
        errorMessage = `${contextMessage}: Server Unavailable/Gateway Timeout. Try again later.`;
        break;
      default:
        // Generic error message for unhandled status codes
        break;
    }

    this.logError(new Error(errorMessage), 'API Error');
    throw new Error(errorMessage); // Re-throw to stop execution or allow calling function to catch
  }
}

// Global instance for backward compatibility or direct use if not injecting
const errorHandlerInstance = new ErrorHandler();

/**
 * Global function for handling API errors, primarily for compatibility with older code
 * or direct calls where an ErrorHandler instance isn't readily available.
 * New code should prefer using an injected ErrorHandler instance.
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - The HTTP response object.
 * @param {string} [contextMessage='API request failed'] - Context for the error.
 * @returns {null} Always returns null (or throws) to indicate an error.
 */
function handleApiError(response, contextMessage = 'API request failed') {
  try {
    errorHandlerInstance.handleApiError(response, contextMessage);
  } catch (e) {
    // Re-throw the error that handleApiError (method) already created
    throw e;
  }
  return null; // Should not be reached if handleApiError throws
}
