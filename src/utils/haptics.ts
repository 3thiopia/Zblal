/**
 * Subtle tactile feedback on devices supporting the Web Vibration API.
 * Fails silently on unsupported platforms (e.g., iOS Safari / Desktop).
 */
export function triggerHaptic(pattern: number | number[] = 8): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors in restricted contexts
    }
  }
}
