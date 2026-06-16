'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  Info,
  PlayCircle,
} from 'lucide-react';
import { ACCOUNT_CURRENCIES, ASSETS, Asset } from '@/data/assets';
import { calculate, EngineOutput } from '@/lib/engine';
import { canonicalToDisplay } from '@/lib/normalizer';
import { getRates } from '@/lib/exchange-service';
import { usePreferences } from '@/hooks/use-preferences';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Asset type badge colors ───────────────────────────────────────────────

const ASSET_TYPE_COLORS: Record<string, string> = {
  FOREX:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  FOREX_JPY:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
  COMMODITY:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  INDEX:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  CRYPTO:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 p-4 space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-tight">
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuantumCalculator() {
  const { prefs, updatePrefs, isLoaded: prefsLoaded } = usePreferences();

  // ── User inputs ────────────────────────────────────────────────────────────
  const [symbol, setSymbol] = useState('');
  const [contractSize, setContractSize] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [riskValue, setRiskValue] = useState('');
  const [riskType, setRiskType] = useState<'fixed' | 'percent'>('percent');

  // ── States for interactive upgrades ───────────────────────────────────────
  const [showAlternativeText, setShowAlternativeText] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── Close mobile touch hover when tapping outside ──────────────────────────
  useEffect(() => {
    const handleTouchOutside = () => {
      setShowAlternativeText(false);
    };
    document.addEventListener('touchstart', handleTouchOutside);
    return () => document.removeEventListener('touchstart', handleTouchOutside);
  }, []);

  // ── Symbol Autocomplete Logic ──────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const query = symbol.trim().toUpperCase();
    if (!query) return [];
    return ASSETS.filter(
      (asset) =>
        asset.symbol.includes(query) ||
        asset.displayName.toUpperCase().includes(query)
    ).slice(0, 5);
  }, [symbol]);

  const handleSelectAsset = (asset: Asset) => {
    setSymbol(asset.symbol);
    setContractSize(asset.defaultContractSize.toString());
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredAssets.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredAssets.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredAssets.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredAssets.length) {
        e.preventDefault();
        handleSelectAsset(filteredAssets[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');

  // ── Exchange rates ─────────────────────────────────────────────────────────
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isFallback, setIsFallback] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);

  // ── Sync saved prefs ───────────────────────────────────────────────────────
  useEffect(() => {
    if (prefsLoaded) {
      setTimeout(() => {
        setAccountBalance(prefs.defaultAccountBalance.toString());
        setRiskValue(prefs.defaultRiskValue.toString());
        setRiskType(prefs.defaultRiskType);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  // ── Theme sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!prefsLoaded) return;
    const el = document.documentElement;
    if (prefs.theme === 'light') el.classList.remove('dark');
    else el.classList.add('dark');
  }, [prefs.theme, prefsLoaded]);

  const toggleTheme = () => updatePrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' });

  // ── Fetch exchange rates ───────────────────────────────────────────────────
  const fetchRates = useCallback(async () => {
    setLoadingRates(true);
    const [result] = await Promise.all([
      getRates('USD'),
      new Promise((resolve) => setTimeout(resolve, 500)) // min 500ms for spin animation
    ]);
    setRates(result.rates);
    setIsFallback(result.isFallback);
    setLoadingRates(false);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      fetchRates();
    }, 0);
  }, [fetchRates]);

  // ── Engine call (fully deterministic — no UI logic inside) ────────────────
  const engineResult = useMemo(() => {
    if (!rates || Object.keys(rates).length === 0) return null;
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskValue);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLossPrice);
    const contract = parseFloat(contractSize);
    if ([balance, risk, entry, sl, contract].some((n) => !isFinite(n) || n <= 0)) return null;
    if (symbol.trim().length < 2) return null;

    return calculate({
      rawSymbol: symbol.trim(),
      accountBalance: balance,
      riskValue: risk,
      isPercentage: riskType === 'percent',
      entryPrice: entry,
      stopLossPrice: sl,
      accountCurrency: prefs.accountCurrency,
      rates,
      isFallbackRate: isFallback,
      contractSize: contract,
    });
  }, [
    symbol,
    contractSize,
    accountBalance,
    riskValue,
    riskType,
    entryPrice,
    stopLossPrice,
    prefs.accountCurrency,
    rates,
    isFallback,
  ]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isDark = prefs.theme === 'dark';
  const output: EngineOutput | null = engineResult?.ok ? engineResult.data : null;
  const engineError: string | null =
    engineResult && !engineResult.ok ? engineResult.error.error : null;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (!prefsLoaded) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <Skeleton className="h-14 w-64 rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-96 rounded-2xl" />
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-6 w-full">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
          <div
            className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25 cursor-pointer select-none transition-transform duration-300 hover:scale-105 active:scale-95 animate-pulse"
            onMouseEnter={() => setShowAlternativeText(true)}
            onMouseLeave={() => setShowAlternativeText(false)}
            onTouchStart={(e) => {
              e.stopPropagation();
              setShowAlternativeText((prev) => !prev);
            }}
          >
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="relative h-11 flex flex-col justify-center overflow-hidden">
            {/* Original Title Text */}
            <div
              className={`transition-all duration-500 ease-out transform ${
                showAlternativeText
                  ? 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
            >
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
                Quantum
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">
                Position Size Calculator
              </p>
            </div>
            {/* Alternative Title Text */}
            <div
              className={`absolute left-0 top-0 bottom-0 flex items-center transition-all duration-500 ease-out transform ${
                showAlternativeText
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}
            >
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent leading-none">
                Nikhil 3.0
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
          {isFallback && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 text-[11px]"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Cached Rates
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger 
              render={<Button variant="ghost" size="icon" onClick={fetchRates} disabled={loadingRates} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white h-9 w-9" />}
            >
              <RefreshCw className={`h-4 w-4 ${loadingRates ? 'animate-spin' : ''}`} />
            </TooltipTrigger>
            <TooltipContent>Refresh exchange rates</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger 
              render={<Button variant="ghost" size="icon" onClick={toggleTheme} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white h-9 w-9 overflow-hidden" />}
            >
              <div className={`transition-transform duration-500 flex items-center justify-center h-full w-full ${isDark ? 'rotate-180' : 'rotate-0'}`}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </div>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
          <Select
            value={prefs.accountCurrency}
            onValueChange={(v) => updatePrefs({ accountCurrency: v || '' })}
          >
            <SelectTrigger className="w-[88px] h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Inputs ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Symbol & contract size */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Instrument</p>
              {output && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${ASSET_TYPE_COLORS[output.assetType] ?? ''}`}
                >
                  {output.assetType.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5 relative">
                <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Symbol
                </Label>
                <div className="relative">
                  <Input
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono uppercase text-sm h-10 w-full"
                    placeholder="e.g. USDCAD, XAUUSD, NAS100"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.toUpperCase());
                      setShowSuggestions(true);
                      setActiveIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Allow onMouseDown to execute before list disappears
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    autoComplete="off"
                  />

                  {/* Suggestions list dropdown */}
                  {showSuggestions && filteredAssets.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-lg max-h-60 overflow-y-auto py-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                      {filteredAssets.map((asset, index) => {
                        const isActive = index === activeIndex;
                        return (
                          <button
                            key={asset.symbol}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectAsset(asset);
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors duration-150 text-xs font-medium border-none outline-none ${
                              isActive
                                ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold font-mono text-zinc-900 dark:text-white">
                                {asset.symbol}
                              </span>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate max-w-[120px] sm:max-w-[150px]">
                                {asset.displayName.split('(')[1]?.replace(')', '') || asset.displayName}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded border scale-90 ${
                                ASSET_TYPE_COLORS[asset.type] ?? ''
                              }`}
                            >
                              {asset.type.replace('_', ' ')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Contract Size
                  </Label>
                  <Dialog>
                    <DialogTrigger 
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Watch a quick video on how to find your contract size"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      How to find this?
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black border-zinc-800">
                      <DialogHeader className="sr-only">
                        <DialogTitle>How to find your contract size</DialogTitle>
                        <DialogDescription>A short video tutorial explaining where to find contract sizes for your prop firm.</DialogDescription>
                      </DialogHeader>
                      <video 
                        controls 
                        autoPlay 
                        className="w-full h-auto max-h-[80vh] object-contain bg-black"
                      >
                        <source src="/contract-size.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-sm h-10"
                  placeholder="e.g. 100000"
                  value={contractSize}
                  onChange={(e) => setContractSize(e.target.value)}
                />
              </div>
            </div>

            {output && (
              <div className="h-10 flex items-center px-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {output.displayName}
              </div>
            )}
          </div>

          {/* Account & Risk */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Account &amp; Risk</p>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Account Balance ({prefs.accountCurrency})
              </Label>
              <Input
                type="number"
                min="0"
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono"
                placeholder="10,000.00"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Risk Amount
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono"
                  placeholder={riskType === 'percent' ? '1.00' : '100.00'}
                  value={riskValue}
                  onChange={(e) => setRiskValue(e.target.value)}
                />
                {/* Interactive toggle switch for Percentage/USD */}
                <div className="relative w-[130px] h-10 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg p-[3px] flex shrink-0 select-none">
                  {/* Sliding indicator */}
                  <div
                    className={`absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] bg-white dark:bg-zinc-700 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                      riskType === 'percent'
                        ? 'translate-x-0'
                        : 'translate-x-full'
                    }`}
                  />
                  {/* Percent option */}
                  <button
                    type="button"
                    onClick={() => setRiskType('percent')}
                    className={`relative z-10 flex-1 flex items-center justify-center text-xs font-bold transition-colors duration-250 ${
                      riskType === 'percent'
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    }`}
                  >
                    %
                  </button>
                  {/* Fixed option */}
                  <button
                    type="button"
                    onClick={() => setRiskType('fixed')}
                    className={`relative z-10 flex-1 flex items-center justify-center text-xs font-bold transition-colors duration-250 ${
                      riskType === 'fixed'
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    }`}
                  >
                    {prefs.accountCurrency}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Entry Price
                </Label>
                <Input
                  type="number"
                  step="any"
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono"
                  placeholder="0.00000"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Stop Loss Price
                </Label>
                <Input
                  type="number"
                  step="any"
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono"
                  placeholder="0.00000"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Engine error (symbol not found etc.) */}
          {engineError && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{engineError}</span>
            </div>
          )}

          {/* Warnings */}

        </div>

        {/* ── Result panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col">
          <div
            className={`rounded-2xl border-2 flex flex-col flex-1 overflow-hidden transition-colors duration-200 ${
              output
                ? 'border-blue-500/40 dark:border-blue-500/30'
                : 'border-zinc-200 dark:border-zinc-800'
            } bg-white dark:bg-zinc-900/60`}
          >
            {output ? (
              <>
                {/* Lot size hero */}
                <div className="flex flex-col items-center justify-center px-6 pt-9 pb-7 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                    Lot Size
                  </p>
                  <div className="text-[5rem] leading-none font-black text-zinc-900 dark:text-white tabular-nums tracking-tighter">
                    {output.lotSize}
                  </div>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2.5 font-medium">
                    {canonicalToDisplay(output.canonicalSymbol)}
                  </p>
                </div>

                <Separator className="bg-zinc-100 dark:bg-zinc-800" />

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2.5 p-4">
                  <StatCard
                    label="Risk Amount"
                    value={`${prefs.accountCurrency} ${output.riskAmountActual.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}`}
                  />
                  <StatCard
                    label="SL Distance"
                    value={`${output.stopLossDistancePips} pips`}
                    sub={`${output.stopLossDistance} pts`}
                  />
                  <StatCard
                    label="Pip Value"
                    value={`${prefs.accountCurrency} ${output.pipValue.toFixed(2)}`}
                    sub="per lot"
                  />
                  <StatCard
                    label="Position Value"
                    value={`${prefs.accountCurrency} ${output.positionValue.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                    )}`}
                  />
                </div>

                {/* Exchange rate footer — only when conversion needed */}
                {output.quoteCurrency !== prefs.accountCurrency && (
                  <div
                    className={`px-4 py-2.5 text-[11px] flex justify-between items-center rounded-b-2xl font-medium ${
                      output.isFallbackRate
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                        : 'bg-zinc-50 dark:bg-zinc-950/50 text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3 opacity-60" />1 {output.quoteCurrency} ={' '}
                      {output.exchangeRateUsed.toFixed(5)} {prefs.accountCurrency}
                    </span>
                    {output.isFallbackRate && (
                      <span className="text-amber-500 dark:text-amber-400">Cached</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Zap className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Ready to calculate
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 max-w-[200px] leading-relaxed">
                    Fill in all fields — lot size appears the moment all inputs are valid.
                  </p>
                </div>
                {/* Hints for missing fields */}
                <div className="text-left w-full space-y-1">
                  {[
                    !symbol && 'Instrument / symbol',
                    !contractSize && 'Contract size',
                    !accountBalance && 'Account balance',
                    !riskValue && 'Risk amount',
                    !entryPrice && 'Entry price',
                    !stopLossPrice && 'Stop loss price',
                  ]
                    .filter(Boolean)
                    .map((hint) => (
                      <p
                        key={String(hint)}
                        className="text-[11px] text-zinc-400 dark:text-zinc-600 flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block" />
                        {hint}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 pb-2">
        Pip size and quote currency are resolved from the internal asset registry — contract size
        is the only manual input, so results match your prop firm&apos;s exact specs.
      </p>
    </div>
  );
}
