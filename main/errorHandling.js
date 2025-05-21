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
 *   performs appropriate actions by throwing an ApiError.
 * - `ApiError` class: Custom error for API related issues.
 * - `getUserFriendlyErrorMessage`: Translates technical errors to user-friendly messages.
 * - `ErrorHandler` class: A class for more structured error handling and display.
 */

/**
 * @class ApiError
 * @description Custom error class for API-specific errors.
 * @extends Error
 */
class ApiError extends Error {
  /**
   * @constructor
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code.
   * @param {string} [responseText=''] - The response text from the API.
   * @param {string} [errorCode=''] - A specific error code from the API response body if available.
   */
  constructor(message, statusCode, responseText = '', errorCode = '') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseText = responseText;
    this.errorCode = errorCode; // e.g., T212's specific error codes like 'invalid_argument'
    
    // Capture stack trace, excluding constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Handles HTTP error responses from UrlFetchApp.fetch().
 * Extracts the HTTP response code and message, and throws an ApiError.
 *
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - The HTTP response object from UrlFetchApp.fetch().
 * @param {string} [contextMessage='API Request Failed'] - Context for the error.
 * @throws {ApiError} Throws an ApiError with details from the response.
 */
function handleApiError(response, contextMessage = 'API Request Failed') {
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();
  let message = `${contextMessage}: Status ${statusCode}`;
  let apiErrorCode = ''; // Placeholder for specific API error codes if parsed from responseText

  // Attempt to parse responseText if it's JSON for more detailed error codes
  try {
    const parsedResponse = JSON.parse(responseText);
    if (parsedResponse && parsedResponse.code) { // Example: Trading 212 often returns a 'code' field
      apiErrorCode = parsedResponse.code;
      message += ` - Code: ${apiErrorCode}`;
    }
    if (parsedResponse && parsedResponse.message) {
        message += ` - Details: ${parsedResponse.message}`;
    }
  } catch (e) {
    // responseText is not JSON or parsing failed, use raw responseText
    if (responseText) {
        message += ` - Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`;
    }
  }
  
  Logger.log(`handleApiError: ${message} (Full Response: ${responseText})`);

  switch (statusCode) {
    case 400:
      throw new ApiError('Bad Request: The server could not understand the request due to invalid syntax or parameters.', statusCode, responseText, apiErrorCode || 'BAD_REQUEST');
    case 401:
      throw new ApiError('Unauthorized: Authentication failed or was not provided. Check your API key.', statusCode, responseText, apiErrorCode || 'UNAUTHORIZED');
    case 403:
      throw new ApiError('Forbidden: You do not have permission to access this resource. Check API key scopes.', statusCode, responseText, apiErrorCode || 'FORBIDDEN');
    case 404:
      throw new ApiError('Not Found: The requested resource could not be found on the server.', statusCode, responseText, apiErrorCode || 'NOT_FOUND');
    case 408:
      throw new ApiError('Request Timeout: The server timed out waiting for the request.', statusCode, responseText, apiErrorCode || 'TIMEOUT');
    case 429:
      throw new ApiError('Too Many Requests: Rate limit exceeded. Please wait and try again later.', statusCode, responseText, apiErrorCode || 'RATE_LIMIT_EXCEEDED');
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ApiError('Server Error: The server encountered an internal error. Please try again later.', statusCode, responseText, apiErrorCode || 'SERVER_ERROR');
    default:
      throw new ApiError(`An unexpected API error occurred (Status: ${statusCode}).`, statusCode, responseText, apiErrorCode || 'UNKNOWN_API_ERROR');
  }
}


/**
 * Generates a user-friendly error message from an error object and context.
 * @param {Error|ApiError} error - The error object.
 * @param {string} [contextMessage='An error occurred'] - A general context for the error.
 * @returns {string} A user-friendly error message.
 */
function getUserFriendlyErrorMessage(error, contextMessage = 'An operation could not be completed.') {
  let friendlyMessage = contextMessage;

  if (error instanceof ApiError) {
    friendlyMessage = `API Communication Error: ${contextMessage}.`;
    switch (error.statusCode) {
      case 400:
        friendlyMessage += ' There was a problem with the request details. Please check your inputs.';
        if (error.errorCode === 'PF_INVALID_REQUEST_PARAMETER') friendlyMessage = 'Invalid request: A parameter is incorrect. Please check your settings or inputs.';
        break;
      case 401:
        friendlyMessage = 'Authentication Failed: Please verify your API key in the settings and ensure it is correct and active.';
        break;
      case 403:
        friendlyMessage = 'Access Denied: Your API key may not have the necessary permissions for this action.';
        break;
      case 404:
        friendlyMessage = 'Not Found: The requested item or resource could not be found. It might have been moved or deleted.';
        break;
      case 429:
        friendlyMessage = 'Rate Limit Exceeded: Too many requests were made in a short period. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        friendlyMessage = 'Server Unavailable: We are experiencing temporary issues with the service. Please try again in a few minutes.';
        break;
      default:
        friendlyMessage += ` An unexpected issue occurred (Status: ${error.statusCode}). If this persists, please contact support.`;
    }
    // Add specific error code message if available and not too technical
    if (error.errorCode && error.errorCode !== error.message && !error.message.includes(error.errorCode)) {
        // Avoid highly technical codes unless we have a map for them
        // friendlyMessage += ` (Code: ${error.errorCode})`; 
    }

  } else if (error.name === 'TypeError' && error.message.includes("Cannot read property")) {
    friendlyMessage = `${contextMessage}. A required piece of data seems to be missing or in an unexpected format. Please check your data or try refreshing.`;
  } else if (error.message.includes("SheetManager") || error.message.includes("Sheet not found")) {
    friendlyMessage = `${contextMessage}. There was an issue accessing or updating the Google Sheet. Please ensure the sheet exists and is accessible.`;
  } else {
    // Generic error
    friendlyMessage = `${contextMessage}. An unexpected error occurred. Details: ${error.message.substring(0,100)}${error.message.length > 100 ? '...' : ''}`;
  }
  
  // Ensure the message is not overly long for an alert
  return friendlyMessage.substring(0, 500); 
}


/**
 * @class ErrorHandler
 * @description A class for handling, logging, and displaying errors in a structured way.
 */
class ErrorHandler {
  /**
   * @constructor
   * @param {string} source - The source of the error (e.g., 'uiFunctions', 'PieRepository').
   */
  constructor(source) {
    this.source = source || 'UnknownSource';
  }

  /**
   * @description Logs an error. This method is primarily for detailed logging.
   * For displaying errors to the user, use displayError.
   * @param {Error|ApiError} error - The error object.
   * @param {string} contextMessage - A custom message describing the context of the error.
   */
  logError(error, contextMessage) {
    const technicalMessage = `${this.source} Error Context: ${contextMessage}\nError: ${error.message || error.toString()}`;
    let logDetails = `Stack: ${error.stack || 'No stack available'}`;

    if (error instanceof ApiError) {
      logDetails += `\nAPI Status: ${error.statusCode}, API Code: ${error.errorCode || 'N/A'}, API Response: ${error.responseText || 'N/A'}`;
    }
    Logger.log(`${technicalMessage}\n${logDetails}`);
  }
  
  /**
   * @description Displays a user-friendly error message in the UI and logs the detailed error.
   * @param {Error|ApiError} error - The error object.
   * @param {string} contextMessage - A custom message describing the context for the user.
   * @param {string} [errorSource=this.source] - Optional override for the source of the error for logging.
   */
  displayError(error, contextMessage, errorSource = this.source) {
    const originalSource = this.source; // Preserve original source if errorSource is different
    this.source = errorSource; // Temporarily set source for logging consistency
    
    this.logError(error, `User-facing error displayed for context: "${contextMessage}"`);
    
    const friendlyMessage = getUserFriendlyErrorMessage(error, contextMessage);
    
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi()) {
      SpreadsheetApp.getUi().alert('Error', friendlyMessage, SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      // Fallback if UI is not available (e.g. background script)
      Logger.log(`UI Alert Fallback (UI not available): ${friendlyMessage}`);
    }
    this.source = originalSource; // Restore original source
  }

  /**
   * @description Handles an error by logging it and optionally showing an alert.
   * DEPRECATED: Prefer displayError for UI messages and logError for logging.
   * This method is kept for backward compatibility but will be phased out.
   * @param {Error|ApiError} error - The error object.
   * @param {string} message - A custom message to prepend to the error.
   * @param {boolean} [showAlert=true] - Whether to show an alert in the UI. (Default changed to true)
   */
  handleError(error, message, showAlert = true) {
    this.logError(error, message); // Log the detailed error first
    if (showAlert) {
      // For backward compatibility, try to show a somewhat user-friendly message
      // but ideally, new calls should use displayError.
      const friendlyContext = message || 'An operation failed.';
      const userMessage = getUserFriendlyErrorMessage(error, friendlyContext);
      if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi()) {
        SpreadsheetApp.getUi().alert('Error', userMessage, SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        Logger.log(`UI Alert Fallback (UI not available for handleError): ${userMessage}`);
      }
    }
  }

  /**
   * @description Logs a simple message with a specified level.
   * @param {string} message - The message to log.
   * @param {string} [level='INFO'] - The log level (e.g., INFO, WARNING, ERROR, DEBUG).
   */
  log(message, level = 'INFO') {
    Logger.log(`[${level.toUpperCase()}] ${this.source}: ${message}`);
  }
}
