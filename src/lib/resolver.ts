import { ASSETS } from '@/data/assets';

export function resolveAsset(canonical: string) {
  // Find in pre-registered assets
  const registered = ASSETS.find((a) => a.symbol === canonical);
  if (registered) {
    return {
      model: {
        type: registered.type,
        quoteCurrency: registered.quoteCurrency,
        pipSize: registered.pipSize,
        minLot: registered.minLot,
        lotStep: registered.lotStep,
        displayName: registered.displayName,
      },
      isInferred: false,
    };
  }

  // Fallback to inferred logic for custom symbols
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
