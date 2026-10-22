/**
 * Utility functions for tournament pickup system
 */

/**
 * Generates a secure, easy-to-read pickup code
 * Format: XXX-XXX (6 characters, uppercase letters and numbers, no ambiguous chars)
 * Excludes: 0, O, 1, I, L to avoid confusion
 */
export function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 2) code += '-'; // Add dash in middle for readability
  }

  return code;
}

/**
 * Validates if a pickup code matches the expected format
 */
export function isValidPickupCodeFormat(code: string): boolean {
  return /^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(code);
}

/**
 * Normalizes a pickup code (removes spaces, converts to uppercase, adds dash if needed)
 */
export function normalizePickupCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length !== 6) {
    return input; // Return original if not 6 chars
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

/**
 * Gets the expiration time for a pickup code (end of tournament day)
 */
export function getCodeExpirationTime(tournamentDate: string): string {
  const date = new Date(tournamentDate);
  date.setHours(23, 59, 59, 999); // End of tournament day
  return date.toISOString();
}
