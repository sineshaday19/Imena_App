/** Canonical phone: exactly this many digits, no country-specific rules. */
export const PHONE_DIGIT_COUNT = 10

export function digitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '')
}

export function normalizePhoneDigits(value: string): string | null {
  const d = digitsOnly(value)
  return d.length === PHONE_DIGIT_COUNT ? d : null
}
