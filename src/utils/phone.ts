/**
 * Normalize and validate Ethiopian mobile numbers under +251.
 * Accepts user input like "911223344", "0911223344", "+251911223344", "711223344".
 * Valid Ethiopian mobile numbers have 9 digits after +251 starting with 9 or 7.
 */
export function normalizeEthiopianLocalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('251')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

export function isValidEthiopianLocalDigits(digits: string): boolean {
  return /^[79]\d{8}$/.test(digits);
}

export function formatEthiopianFullPhone(digits: string): string {
  return `+251${digits}`;
}

export function formatEthiopianDisplayPhone(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

/**
 * Normalize an arbitrary Ethiopian mobile string into canonical E.164 (+2519XXXXXXXX or +2517XXXXXXXX).
 * Returns null if invalid.
 */
export function normalizeEthiopianPhoneToE164(raw: string): string | null {
  const digits = normalizeEthiopianLocalDigits(raw);
  if (!isValidEthiopianLocalDigits(digits)) {
    return null;
  }
  return formatEthiopianFullPhone(digits);
}

/**
 * Mask a phone number for public leaderboards while preserving only country code,
 * leading mobile digit, and last 3 digits, e.g. "+251 9•• ••• 123".
 */
export function maskEthiopianPhone(rawPhone: string): string {
  const digits = normalizeEthiopianLocalDigits(rawPhone);
  if (digits.length === 9) {
    return `+251 ${digits[0]}•• ••• ${digits.slice(6, 9)}`;
  }
  const compact = rawPhone.replace(/\s+/g, '');
  if (compact.length <= 4) {
    return '••••';
  }
  return `${compact.slice(0, 4)} ••• ${compact.slice(-3)}`;
}

