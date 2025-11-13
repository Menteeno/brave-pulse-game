/**
 * RTL (Right-to-Left) language utilities
 */

/**
 * List of RTL language codes
 */
export const RTL_LANGUAGES = ['fa', 'ar', 'he', 'ur'] as const

/**
 * Check if a language code is RTL
 */
export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.includes(language as typeof RTL_LANGUAGES[number])
}

/**
 * Get text direction for a language
 */
export function getDirection(language: string): 'ltr' | 'rtl' {
  return isRTL(language) ? 'rtl' : 'ltr'
}

