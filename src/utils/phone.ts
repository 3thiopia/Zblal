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
