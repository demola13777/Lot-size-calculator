/**
 * CALCULATION ENGINE
 * Fully deterministic lot size calculator.
 * No UI coupling. No external API calls. No side effects.
 *
 * Inputs: raw user strings + manual contract size → normalizer → resolver → registry → math
 * Output: structured result with lot size, risk, pip value, and warnings
 *
 * ──────────────────────────────────────────────────────────────────
 * FORMULA
 *
 * slDistance       = |entryPrice − stopLossPrice|
 * pips             = slDistance / pipSize
 * pipValuePerLot   = pipSize × contractSize × quoteToAccountRate
 * lotSize          = riskAmount / (pips × pipValuePerLot)
 *                  = riskAmount / (slDistance × contractSize × quoteToAccountRate)
 *
 * contractSize is supplied by the user (units per 1.0 lot, per the prop
 * firm's contract specs). pipSize and quoteCurrency are still resolved
 * from the internal registry/normalizer based on the symbol.
 *
 * Verification — USDCAD ($125 risk, entry 1.39381, SL 1.38988):
 *   slDistance       = 0.00393
 *   contractSize     = 100,000 (user-supplied)
 *   quoteToAcct rate = 1 / 1.39381 ≈ 0.71745  (CAD→USD)
 *   lotSize          = 125 / (0.00393 × 100,000 × 0.71745)
 *                    = 125 / 282.16 ≈ 0.44 ✓
 * ──────────────────────────────────────────────────────────────────
 */

import { normalizeSymbol } from './normalizer';
import { resolveAsset } from './resolver';
import { getConversionRate } from './exchange-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EngineInput {
  /** Raw symbol as typed by the user (e.g. "XAUUSDm", "nas100", "GBP/USD") */
  rawSymbol: string;
  /** Account balance in account currency */
  accountBalance: number;
  /** Risk amount — either a flat dollar value or a percentage */
  riskValue: number;
  /** True if riskValue is a percentage; false if it's a flat amount */
  isPercentage: boolean;
  /** Entry price */
  entryPrice: number;
  /** Stop loss price */
  stopLossPrice: number;
  /** Account currency code (e.g. "USD", "EUR") */
  accountCurrency: string;
  /** Live or cached exchange rates keyed to USD base */
  rates: Record<string, number>;
  /** True when rates come from cache rather than live API */
  isFallbackRate: boolean;
  /**
   * User-supplied contract size (units per 1.0 lot), e.g. 100000 for forex,
   * 100 for gold, 1 for indices/crypto. Overrides the registry/inferred value
   * so the calculator works for any prop firm's contract specs.
   */
  contractSize: number;
}

export interface EngineOutput {
  /** Rounded lot size respecting lotStep */
  lotSize: number;
  /** Actual dollar risk at the computed lot size (may differ from input if clamped) */
  riskAmountActual: number;
  /** Raw price distance (not in pips — just |entry − SL|) */
  stopLossDistance: number;
  /** Number of pips in the SL distance */
  stopLossDistancePips: number;
  /** Pip value in account currency at computed lot size */
  pipValue: number;
  /** Notional position value in account currency */
  positionValue: number;
  /** Canonical symbol resolved (e.g. EUR_USD) */
  canonicalSymbol: string;
  /** Human-readable display name */
  displayName: string;
  /** Asset type string */
  assetType: string;
  /** Quote currency of the instrument */
  quoteCurrency: string;
  /** Exchange rate used (quote→account) */
  exchangeRateUsed: number;
  /** True when fallback cached rate was used */
  isFallbackRate: boolean;
  /** Non-fatal warnings (e.g. min-lot clamping, inferred model) */
  warnings: string[];
}

export interface EngineError {
  error: string;
  code:
    | 'INVALID_SYMBOL'
    | 'UNRESOLVABLE_SYMBOL'
    | 'ZERO_SL_DISTANCE'
    | 'INVALID_INPUTS'
    | 'NO_RATES';
}

export type EngineResult = { ok: true; data: EngineOutput } | { ok: false; error: EngineError };

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Round a lot size to the nearest valid lot step.
 * e.g. 0.443 with step 0.01 → 0.44
 */
function roundToStep(value: number, step: number): number {
  const precision = Math.round(-Math.log10(step));
  return parseFloat((Math.floor(value / step) * step).toFixed(precision));
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Primary calculation entry point.
 * Call this from any UI layer — do NOT call sub-modules directly.
 */
export function calculate(input: EngineInput): EngineResult {
  const warnings: string[] = [];

  // ── 1. Validate numeric inputs ─────────────────────────────────────────────
  const {
    rawSymbol,
    accountBalance,
    riskValue,
    isPercentage,
    entryPrice,
    stopLossPrice,
    accountCurrency,
    rates,
    isFallbackRate,
    contractSize,
  } = input;

  if (
    !isFinite(accountBalance) ||
    accountBalance <= 0 ||
    !isFinite(riskValue) ||
    riskValue <= 0 ||
    !isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !isFinite(stopLossPrice) ||
    stopLossPrice <= 0 ||
    !isFinite(contractSize) ||
    contractSize <= 0
  ) {
    return {
      ok: false,
      error: { error: 'All numeric inputs must be positive numbers.', code: 'INVALID_INPUTS' },
    };
  }

  if (!rates || Object.keys(rates).length === 0) {
    return {
      ok: false,
      error: { error: 'Exchange rates unavailable.', code: 'NO_RATES' },
    };
  }

  // ── 2. Normalize symbol ────────────────────────────────────────────────────
  const canonical = normalizeSymbol(rawSymbol);
  if (!canonical) {
    return {
      ok: false,
      error: {
        error: `"${rawSymbol}" could not be recognized. Try a format like EURUSD, XAUUSDm, or NAS100.`,
        code: 'INVALID_SYMBOL',
      },
    };
  }

  // ── 3. Resolve asset model ─────────────────────────────────────────────────
  const resolution = resolveAsset(canonical);
  if (!resolution) {
    return {
      ok: false,
      error: {
        error: `No asset model found for "${rawSymbol}". Check the symbol and try again.`,
        code: 'UNRESOLVABLE_SYMBOL',
      },
    };
  }

  const { model } = resolution;

  if (resolution.isInferred) {
    warnings.push(
      `"${rawSymbol}" was not found in the registry — using inferred defaults for ${model.type}. Verify results against your broker.`
    );
  }

  // ── 4. Stop-loss distance ──────────────────────────────────────────────────
  const slDistance = Math.abs(entryPrice - stopLossPrice);
  if (slDistance === 0) {
    return {
      ok: false,
      error: {
        error: 'Entry price and stop loss price cannot be equal.',
        code: 'ZERO_SL_DISTANCE',
      },
    };
  }

  // ── 5. Risk amount ─────────────────────────────────────────────────────────
  const riskAmount = isPercentage ? (accountBalance * riskValue) / 100 : riskValue;

  // ── 6. Exchange rate: quote currency → account currency ────────────────────
  const quoteToAccountRate = getConversionRate(rates, model.quoteCurrency, accountCurrency);

  // ── 7. Pip value per lot (in account currency) ─────────────────────────────
  //   pipValuePerLot = pipSize × contractSize × quoteToAccountRate
  const pipValuePerLot = model.pipSize * contractSize * quoteToAccountRate;

  // ── 8. Pip count in the SL distance ───────────────────────────────────────
  const slPips = slDistance / model.pipSize;

  // ── 9. Raw lot size ────────────────────────────────────────────────────────
  //   lotSize = riskAmount / (slPips × pipValuePerLot)
  //           = riskAmount / (slDistance × contractSize × quoteToAccountRate)
  const rawLotSize = riskAmount / (slPips * pipValuePerLot);

  // ── 10. Clamp to minimum lot ───────────────────────────────────────────────
  let finalLotSize: number;
  if (rawLotSize < model.minLot) {
    finalLotSize = model.minLot;
    warnings.push(
      `Computed lot size (${rawLotSize.toFixed(4)}) is below the minimum lot of ${model.minLot}. ` +
        `Clamped to ${model.minLot} — actual risk will be higher than requested.`
    );
  } else {
    // Round down to nearest lot step (never round up — that would exceed risk)
    finalLotSize = roundToStep(rawLotSize, model.lotStep);
  }

  // ── 11. Actual risk at final lot size ──────────────────────────────────────
  const riskAmountActual = finalLotSize * slPips * pipValuePerLot;

  // ── 12. Pip value at final position ───────────────────────────────────────
  const pipValue = finalLotSize * pipValuePerLot;

  // ── 13. Notional position value in account currency ────────────────────────
  const positionValue = finalLotSize * contractSize * entryPrice * quoteToAccountRate;

  // Derive display precision from pipSize (e.g. 0.0001 → 4 decimal places)
  const slDecimals = Math.max(0, Math.ceil(-Math.log10(model.pipSize)) + 1);

  // ── 14. Warnings for prop firm risk validation ─────────────────────────────
  const riskPct = (riskAmountActual / accountBalance) * 100;
  if (riskPct > 5) {
    warnings.push(
      `Risk is ${riskPct.toFixed(2)}% of account. Most prop firms cap daily risk at 4–5%.`
    );
  }

  return {
    ok: true,
    data: {
      lotSize: finalLotSize,
      riskAmountActual: parseFloat(riskAmountActual.toFixed(2)),
      stopLossDistance: parseFloat(slDistance.toFixed(slDecimals)),
      stopLossDistancePips: parseFloat(slPips.toFixed(1)),
      pipValue: parseFloat(pipValue.toFixed(2)),
      positionValue: parseFloat(positionValue.toFixed(2)),
      canonicalSymbol: canonical,
      displayName: model.displayName,
      assetType: model.type,
      quoteCurrency: model.quoteCurrency,
      exchangeRateUsed: quoteToAccountRate,
      isFallbackRate,
      warnings,
    },
  };
}
