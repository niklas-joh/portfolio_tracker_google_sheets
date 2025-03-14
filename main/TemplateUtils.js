/**
 * ===================== Template Utilities ========================
 * 
 * Server-side utility functions for use in HTML templates.
 */

/**
 * Safely converts a value to a string, handling null and undefined values.
 * For use in HTML templates (scriptlets).
 * 
 * @param {*} value - The value to convert to a string.
 * @param {string} [defaultValue=''] - The default value to return if value is null or undefined.
 * @returns {string} The string representation of the value or the default value.
 */
function safeString(value, defaultValue = '') {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }
  
  /**
   * Safely compares two values as strings.
   * For use in HTML templates (scriptlets).
   * 
   * @param {*} value1 - The first value to compare.
   * @param {*} value2 - The second value to compare.
   * @returns {boolean} True if the string representations are equal.
   */
  function safeEquals(value1, value2) {
    return safeString(value1) === safeString(value2);
  }
  
  /**
   * Safely formats a date for display.
   * For use in HTML templates (scriptlets).
   * 
   * @param {*} date - The date to format (can be Date object, string, or timestamp).
   * @param {string} [format='long'] - The format to use ('short', 'medium', 'long', 'full').
   * @param {string} [defaultValue=''] - The default value to return if date is invalid.
   * @returns {string} The formatted date string.
   */
  function formatDate(date, format = 'long', defaultValue = '') {
    try {
      if (!date) return defaultValue;
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return defaultValue;
      
      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString();
        case 'medium':
          return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        case 'full':
          return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        case 'long':
        default:
          return dateObj.toDateString();
      }
    } catch (e) {
      return defaultValue;
    }
  }
  
  /**
   * Safely formats a number for display.
   * For use in HTML templates (scriptlets).
   * 
   * @param {*} number - The number to format.
   * @param {number} [decimals=2] - The number of decimal places.
   * @param {string} [defaultValue=''] - The default value to return if number is invalid.
   * @returns {string} The formatted number string.
   */
  function formatNumber(number, decimals = 2, defaultValue = '') {
    try {
      if (number === null || number === undefined) return defaultValue;
      
      const num = Number(number);
      if (isNaN(num)) return defaultValue;
      
      return num.toFixed(decimals);
    } catch (e) {
      return defaultValue;
    }
  }