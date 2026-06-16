// Fallback rates used when the live API is unreachable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157.5,
  CAD: 1.37,
  AUD: 1.54,
  CHF: 0.90,
  NZD: 1.67,
  SGD: 1.35,
  HKD: 7.83,
  NOK: 10.6,
  SEK: 10.5,
  DKK: 6.89,
  ZAR: 18.6,
};

export async function getRates(base: string): Promise<{ rates: Record<string, number>; isFallback: boolean }> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`, {
      // 8-second timeout so the UI doesn't hang
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 }, // cache for 1 hour on the server
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { rates: Record<string, number> };

    // Frankfurter omits the base currency itself — add it back as 1
    return {
      rates: { [base]: 1, ...data.rates },
      isFallback: false,
    };
  } catch {
    // Network error or timeout — silently fall back to hardcoded rates
    return { rates: FALLBACK_RATES, isFallback: true };
  }
}

export function getConversionRate(rates: Record<string, number>, quote: string, account: string) {
  if (quote === account) return 1;
  const quoteRate = rates[quote] || 1;
  const accountRate = rates[account] || 1;
  // Convert from quote to base (USD), then base to account
  return accountRate / quoteRate;
}
