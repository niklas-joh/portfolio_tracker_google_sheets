/**
 * ===================== Data Processing Functions ========================
 * 
 * The functions in this section handle the dynamic generation of headers 
 * from the data retrieved from the API, as well as writing both the headers 
 * and data to the Google Sheets. They support both single object responses 
 * and arrays of objects.
 * 
 * Key functions include:
 * - `extractHeaders`: Recursively extracts headers (field paths) from 
 *   nested JSON objects.
 * - `resolveNestedField`: Extracts values from nested objects based on 
 *   a dot-separated path.
 */

/**
 * ===================== Data Extraction Functions ========================
 * 
 * This section contains functions for extracting headers and resolving
 * nested fields in the data.
 */

/**
 * Recursively extracts the headers (field paths) from a JSON object.
 * Handles arrays within objects and generates additional headers for array elements.
 *
 * @param {Object} obj - The object from which to extract headers.
 * @param {string} [parent=''] - The parent path for nested objects (used during recursion).
 * @returns {Array<string>} A list of dot-separated field paths representing the headers.
 */
function extractHeaders(obj, parent = '') {
  let headers = [];

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let path = parent ? `${parent}.${key}` : key;

      // Handle nested objects and arrays
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (Array.isArray(obj[key])) {
          // Extract headers from the first item in the array (assuming uniform structure)
          const firstItem = obj[key][0];
          headers = headers.concat(extractHeaders(firstItem, path));
        } else {
          // Recursively extract headers for nested objects
          headers = headers.concat(extractHeaders(obj[key], path));
        }
      } else {
        headers.push(path);  // Otherwise, it's a simple value, add it as a header
      }
    }
  }

  return headers;
}

/**
 * Resolves the value of a nested field in an object, given a dot-separated path.
 * Handles arrays and nested objects by flattening them if necessary.
 * 
 * @param {Object} obj - The object to resolve the field from.
 * @param {string} path - The dot-separated path to the field.
 * @returns {*} The resolved value, or a flattened representation if it's an array or object.
 */
function resolveNestedField(obj, path) {
  const keys = path.split('.');
  return resolveFieldRecursive(obj, keys, 0);
}

/**
 * Recursively resolves the field by traversing through keys, handling arrays and objects as needed.
 * 
 * @param {Object|Array} obj - The object or array to resolve.
 * @param {Array} keys - The array of keys from the dot-separated path.
 * @param {number} index - The current position in the keys array.
 * @returns {*} The resolved value or a flattened representation if it's an array or object.
 */
function resolveFieldRecursive(obj, keys, index) {
  if (obj === null || obj === undefined) return '';  // Early return if value is null or undefined
  const key = keys[index];

  // If the value is an array, resolve for each element in the array
  if (Array.isArray(obj[key])) {
    return obj[key].map(item => resolveFieldRecursive(item, keys, index + 1)).join(', ');
  }

  const value = obj[key];

  // If this is the last key, return the final value, flattening objects if necessary
  if (index === keys.length - 1) {
    if (typeof value === 'object' && value !== null) {
      return flattenObject(value);  // Flatten the object if necessary
    }
    return value !== undefined ? value : '';  // Return value or empty string if undefined
  }

  // Continue recursion for the next key
  return resolveFieldRecursive(value, keys, index + 1);
}

/**
 * Flattens an object by joining all its values into a single string.
 * 
 * @param {Object} obj - The object to flatten.
 * @returns {string} A string of the object's values, joined by commas.
 */
function flattenObject(obj) {
  return Object.values(obj).map(val => (val !== null && val !== undefined ? val : '')).join(', ');
}  