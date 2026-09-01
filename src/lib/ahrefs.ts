/**
 * Ahrefs Web Analytics.
 *
 * The data-key is public by design: Recheck installation fetches the homepage
 * and looks for this value on the script tag. It identifies the project and
 * grants nothing. One tag, not the Google Tag Manager duplicate: Next already
 * has a Script component, and injecting a second copy of analytics.js would
 * double-count.
 */
export const AHREFS_ANALYTICS_KEY = 'tb0MmkVcNYuvlccIIpiDLg'
export const AHREFS_ANALYTICS_SRC = 'https://analytics.ahrefs.com/analytics.js'
