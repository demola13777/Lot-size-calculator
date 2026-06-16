export interface Asset {
  symbol: string;
  displayName: string;
  type: 'FOREX' | 'FOREX_JPY' | 'COMMODITY' | 'INDEX' | 'CRYPTO';
  quoteCurrency: string;
  pipSize: number;
  minLot: number;
  lotStep: number;
  defaultContractSize: number;
}

export const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'NZD'];

export const ASSETS: Asset[] = [
  // Forex Majors
  { symbol: 'EURUSD', displayName: 'EURUSD (Euro / US Dollar)', type: 'FOREX', quoteCurrency: 'USD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'GBPUSD', displayName: 'GBPUSD (Great Britain Pound / US Dollar)', type: 'FOREX', quoteCurrency: 'USD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'AUDUSD', displayName: 'AUDUSD (Australian Dollar / US Dollar)', type: 'FOREX', quoteCurrency: 'USD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'NZDUSD', displayName: 'NZDUSD (New Zealand Dollar / US Dollar)', type: 'FOREX', quoteCurrency: 'USD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'USDCAD', displayName: 'USDCAD (US Dollar / Canadian Dollar)', type: 'FOREX', quoteCurrency: 'CAD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'USDCHF', displayName: 'USDCHF (US Dollar / Swiss Franc)', type: 'FOREX', quoteCurrency: 'CHF', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  
  // Forex JPY
  { symbol: 'USDJPY', displayName: 'USDJPY (US Dollar / Japanese Yen)', type: 'FOREX_JPY', quoteCurrency: 'JPY', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'EURJPY', displayName: 'EURJPY (Euro / Japanese Yen)', type: 'FOREX_JPY', quoteCurrency: 'JPY', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'GBPJPY', displayName: 'GBPJPY (Great Britain Pound / Japanese Yen)', type: 'FOREX_JPY', quoteCurrency: 'JPY', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'AUDJPY', displayName: 'AUDJPY (Australian Dollar / Japanese Yen)', type: 'FOREX_JPY', quoteCurrency: 'JPY', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  
  // Forex Crosses
  { symbol: 'EURGBP', displayName: 'EURGBP (Euro / Great Britain Pound)', type: 'FOREX', quoteCurrency: 'GBP', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'EURCAD', displayName: 'EURCAD (Euro / Canadian Dollar)', type: 'FOREX', quoteCurrency: 'CAD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'EURAUD', displayName: 'EURAUD (Euro / Australian Dollar)', type: 'FOREX', quoteCurrency: 'AUD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'GBPAUD', displayName: 'GBPAUD (Great Britain Pound / Australian Dollar)', type: 'FOREX', quoteCurrency: 'AUD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },
  { symbol: 'GBPCAD', displayName: 'GBPCAD (Great Britain Pound / Canadian Dollar)', type: 'FOREX', quoteCurrency: 'CAD', pipSize: 0.0001, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100000 },

  // Commodities
  { symbol: 'XAUUSD', displayName: 'XAUUSD (Gold / US Dollar)', type: 'COMMODITY', quoteCurrency: 'USD', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 100 },
  { symbol: 'XAGUSD', displayName: 'XAGUSD (Silver / US Dollar)', type: 'COMMODITY', quoteCurrency: 'USD', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 5000 },
  { symbol: 'USOIL', displayName: 'USOIL (WTI Crude Oil)', type: 'COMMODITY', quoteCurrency: 'USD', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 1000 },
  { symbol: 'UKOIL', displayName: 'UKOIL (Brent Crude Oil)', type: 'COMMODITY', quoteCurrency: 'USD', pipSize: 0.01, minLot: 0.01, lotStep: 0.01, defaultContractSize: 1000 },

  // Indices
  { symbol: 'NAS100', displayName: 'NAS100 (Nasdaq 100 Index)', type: 'INDEX', quoteCurrency: 'USD', pipSize: 1.0, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },
  { symbol: 'US30', displayName: 'US30 (Dow Jones Industrial Average)', type: 'INDEX', quoteCurrency: 'USD', pipSize: 1.0, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },
  { symbol: 'SPX500', displayName: 'SPX500 (S&P 500 Index)', type: 'INDEX', quoteCurrency: 'USD', pipSize: 1.0, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },
  { symbol: 'GER40', displayName: 'GER40 (DAX 40 Index)', type: 'INDEX', quoteCurrency: 'EUR', pipSize: 1.0, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },
  { symbol: 'UK100', displayName: 'UK100 (FTSE 100 Index)', type: 'INDEX', quoteCurrency: 'GBP', pipSize: 1.0, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },

  // Crypto
  { symbol: 'BTCUSD', displayName: 'BTCUSD (Bitcoin / US Dollar)', type: 'CRYPTO', quoteCurrency: 'USD', pipSize: 1.0, minLot: 0.01, lotStep: 0.01, defaultContractSize: 1 },
  { symbol: 'ETHUSD', displayName: 'ETHUSD (Ethereum / US Dollar)', type: 'CRYPTO', quoteCurrency: 'USD', pipSize: 0.1, minLot: 0.01, lotStep: 0.01, defaultContractSize: 1 },
  { symbol: 'SOLUSD', displayName: 'SOLUSD (Solana / US Dollar)', type: 'CRYPTO', quoteCurrency: 'USD', pipSize: 0.01, minLot: 0.1, lotStep: 0.1, defaultContractSize: 1 },
];
