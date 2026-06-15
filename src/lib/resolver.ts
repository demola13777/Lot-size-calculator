export function resolveAsset(canonical: string) {
  const type = canonical.endsWith('JPY') ? 'FOREX_JPY' : 'FOREX';
  const quoteCurrency = canonical.length >= 3 ? canonical.slice(-3) : 'USD';
  return {
    model: {
      type,
      quoteCurrency,
      pipSize: type === 'FOREX_JPY' ? 0.01 : 0.0001,
      minLot: 0.01,
      lotStep: 0.01,
      displayName: canonical,
    },
    isInferred: true,
  };
}
