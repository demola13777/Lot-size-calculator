import { useState, useEffect } from 'react';

export interface Preferences {
  defaultAccountBalance: number;
  defaultRiskValue: number;
  defaultRiskType: 'fixed' | 'percent';
  theme: 'light' | 'dark';
  accountCurrency: string;
}

const defaultPrefs: Preferences = {
  defaultAccountBalance: 100000,
  defaultRiskValue: 1,
  defaultRiskType: 'percent',
  theme: 'dark',
  accountCurrency: 'USD',
};

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const updatePrefs = (newPrefs: Partial<Preferences>) => {
    setPrefs((prev) => ({ ...prev, ...newPrefs }));
  };

  return { prefs, updatePrefs, isLoaded };
}
