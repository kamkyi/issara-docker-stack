/**
 * This file initializes all patches and should be imported
 * at the entry point of the application
 */

// Import the IDBKeyRange patch
import "./indexeddb-patch";

console.log("[Init] All patches initialized");

// Export some indicator to ensure the file is not tree-shaken
export const PATCHES_INITIALIZED = true;
