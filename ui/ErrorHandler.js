/**
 * ===================== Error Handling ========================
 * 
 * This file contains utility functions for handling and logging errors.
 */

/**
 * Logs a client-side error to the server-side log.
 * 
 * @param {string} errorJson - JSON string containing error details.
 */
function logClientError(errorJson) {
    try {
      const error = JSON.parse(errorJson);
      Logger.log(`CLIENT ERROR: ${error.message}`);
      Logger.log(`Source: ${error.source}`);
      Logger.log(`Line: ${error.line}, Column: ${error.column}`);
      Logger.log(`Stack: ${error.stack}`);
      Logger.log(`User Agent: ${error.userAgent}`);
      Logger.log(`Time: ${error.time}`);
    } catch (e) {
      Logger.log(`Error parsing client error JSON: ${e}`);
      Logger.log(`Original error JSON: ${errorJson}`);
    }
  }
  
  /**
   * Gets the stack trace from an error object.
   * 
   * @param {Error} error - The error object.
   * @returns {string} The formatted stack trace.
   */
  function getStackTrace(error) {
    if (!error) return 'No error object provided';
    
    return error.stack || error.toString();
  }
  
  /**
   * Handles an error with consistent logging and user notification.
   * 
   * @param {Error} error - The error object.
   * @param {string} context - The context where the error occurred.
   * @param {boolean} [notifyUser=true] - Whether to notify the user.
   */
  function handleError(error, context, notifyUser = true) {
    // Log the error
    Logger.log(`ERROR in ${context}: ${error.message}`);
    Logger.log(getStackTrace(error));
    
    // Notify the user if required
    if (notifyUser) {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          'Error',
          `An error occurred in ${context}: ${error.message}\n\nThe error has been logged. Please try again or contact support if the issue persists.`,
          ui.ButtonSet.OK
        );
      } catch (e) {
        // If we can't show an alert (e.g., in a non-interactive context)
        Logger.log(`Could not show error alert: ${e}`);
      }
    }
  }
  
  /**
   * Wraps a function with error handling.
   * 
   * @param {Function} fn - The function to wrap.
   * @param {string} context - The context for error reporting.
   * @param {boolean} [notifyUser=true] - Whether to notify the user of errors.
   * @returns {Function} The wrapped function.
   */
  function withErrorHandling(fn, context, notifyUser = true) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (error) {
        handleError(error, context, notifyUser);
        throw error; // Re-throw to maintain expected behavior
      }
    };
  }
  
  /**
   * Creates a new Error object with additional context information.
   * 
   * @param {string} message - The error message.
   * @param {string} context - The context where the error occurred.
   * @param {Object} [details={}] - Additional details about the error.
   * @returns {Error} The new Error object.
   */
  function createError(message, context, details = {}) {
    const error = new Error(`${context}: ${message}`);
    error.context = context;
    error.details = details;
    return error;
  }