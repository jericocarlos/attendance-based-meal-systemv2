/**
 * Automatic scheduler initialization
 * This module initializes the email scheduler when imported
 * 
 * To use: Import this file in your main application entry point (e.g., layout.js or middleware)
 */

import { initializeScheduler } from './scheduler.js';

// Initialize scheduler immediately when this module is imported
let initPromise = null;

export async function ensureSchedulerInitialized() {
  if (!initPromise) {
    initPromise = initializeScheduler().catch(error => {
      console.error('[Scheduler Init] Failed to initialize:', error);
    });
  }
  return initPromise;
}

// Start initialization immediately on import
ensureSchedulerInitialized();

export default ensureSchedulerInitialized;
