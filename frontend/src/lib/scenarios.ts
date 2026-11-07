/** Illustrative anchored scenarios; marginal slopes are not joint-model coefficients. */
export function predictVacancy(initialVacancy: number, initialValue: number, finalValue: number, slope: number) {
  if (![initialVacancy, initialValue, finalValue, slope].every(Number.isFinite)) return null;
  const raw = initialVacancy + slope * (finalValue - initialValue);
  return { raw, feasible: raw >= 0 && raw <= 100, change: raw - initialVacancy };
}

export function sliderBounds(initial: number, observedMin: number, observedMax: number, percent: boolean) {
  const span = Math.max(observedMax - observedMin, initial * 0.5, 1);
  return {
    min: Math.max(0, Math.min(observedMin, initial - span * 0.25)),
    max: percent ? 100 : Math.max(observedMax, initial + span * 0.25),
  };
}

/** User-requested additive scenario, counting the starting vacancy exactly once. */
export function predictCombinedVacancy(initialVacancy: number, changes: { initial: number; final: number; slope: number }[]) {
  if (!Number.isFinite(initialVacancy) || changes.some(({ initial, final, slope }) => ![initial, final, slope].every(Number.isFinite))) return null;
  const change = changes.reduce((sum, item) => sum + item.slope * (item.final - item.initial), 0);
  const raw = initialVacancy + change;
  return { raw, change, feasible: raw >= 0 && raw <= 100 };
}
