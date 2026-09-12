/**
 * Phone number normalization utilities for consistent storage,
 * duplicate detection, and WhatsApp/SMS integration.
 */

/**
 * Strips all non-digit characters from a phone number.
 * Example: "+91 73554 38970" -> "917355438970"
 */
export function extractDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Normalizes an Indian / standard mobile number to its core 10-digit format.
 * Examples:
 * - "7355438970" -> "7355438970"
 * - "+91 73554 38970" -> "7355438970"
 * - "07355438970" -> "7355438970"
 * - "+91-73554-38970" -> "7355438970"
 * - "917355438970" -> "7355438970"
 *
 * For numbers shorter than 10 digits or international numbers with different lengths,
 * returns the clean digits if >= 7 digits, or empty string.
 */
export function normalizePhone10(phone: string | null | undefined): string {
  const digits = extractDigits(phone);
  if (!digits) return "";

  // If 10 digits (e.g. 7355438970)
  if (digits.length === 10) {
    return digits;
  }

  // If 11 digits starting with 0 (e.g. 07355438970)
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  // If 12 digits starting with 91 (e.g. 917355438970)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  // If longer than 10 digits, take the last 10 digits
  if (digits.length > 10) {
    return digits.slice(-10);
  }

  // Fallback for non-10 digit numbers
  return digits;
}

/**
 * Returns true if the phone number has at least 10 valid digits.
 */
export function isValidMobileNumber(phone: string | null | undefined): boolean {
  const norm = normalizePhone10(phone);
  return norm.length === 10;
}
