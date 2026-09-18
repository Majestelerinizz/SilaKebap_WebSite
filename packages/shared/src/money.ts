/** Convert kuruş (integer cents) to TL display string, e.g. 1250 → "12,50" */
export function centsToTry(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const formatted = `${whole},${frac.toString().padStart(2, "0")}`;
  return negative ? `-${formatted}` : formatted;
}

/** Convert TL number to kuruş integer (rounds to nearest kuruş). */
export function tryToCents(tryAmount: number): number {
  return Math.round(tryAmount * 100);
}

export function formatTryLabel(cents: number): string {
  return `${centsToTry(cents)} TL`;
}
