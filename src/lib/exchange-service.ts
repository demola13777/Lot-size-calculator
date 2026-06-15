export async function getRates(base: string) {
  return {
    rates: {
      USD: 1,
      EUR: 0.9,
      GBP: 0.8,
      JPY: 150,
      CAD: 1.4,
      AUD: 1.5,
      CHF: 0.9,
      NZD: 1.6,
    },
    isFallback: true,
  };
}

export function getConversionRate(rates: Record<string, number>, quote: string, account: string) {
  if (quote === account) return 1;
  const quoteRate = rates[quote] || 1;
  const accountRate = rates[account] || 1;
  // Convert from quote to base (USD), then base to account
  return accountRate / quoteRate;
}
