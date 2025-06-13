/**
 * ProgressManager handles storing and retrieving progress messages
 * so the client UI can display status updates while long running
 * operations are executing.
 */
class ProgressManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.prefix = 'PROGRESS_';
  }

  /**
   * Saves a progress message for the given id.
   * @param {string} id Identifier for the progress entry.
   * @param {string} message Progress message to store.
   */
  setProgress(id, message) {
    // Cache entries expire after 25 minutes which is below Apps Script limits
    this.cache.put(this.prefix + id, message, 1500);
  }

  /**
   * Retrieves the latest progress message for the given id.
   * @param {string} id Identifier used when storing progress.
   * @returns {string} The stored progress message or an empty string.
   */
  getProgress(id) {
    return this.cache.get(this.prefix + id) || '';
  }

  /**
   * Clears the progress message for the given id.
   * @param {string} id Identifier used when storing progress.
   */
  clearProgress(id) {
    this.cache.remove(this.prefix + id);
  }
}

// Singleton instance used throughout the project
const progressManager = new ProgressManager();

/**
 * Updates the global fetch progress message.
 * @param {string} message The message to display to the user.
 */
function updateProgress(message) {
  progressManager.setProgress('fetch', message);
}

/**
 * Retrieves the current global fetch progress message.
 * @returns {string} The latest message set via updateProgress().
 */
function getProgress() {
  return progressManager.getProgress('fetch');
}

/**
 * Clears the stored fetch progress message.
 */
function clearProgress() {
  progressManager.clearProgress('fetch');
}
