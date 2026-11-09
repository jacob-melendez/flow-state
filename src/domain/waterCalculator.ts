/**
 * Daily water estimate. Pure function; no I/O.
 *
 * This is a rough, population-level estimate to help students pick a goal.
 * It is NOT medical advice. All numbers are here so the SENSA Health &
 * Wellness team can review and tune them.
 *
 * Method:
 *  1. Weight-based estimate: 33 mL per kg of body weight (midpoint of the
 *     commonly cited 30–35 mL/kg for adults).
 *  2. Guideline for water from drinks, from the US National Academies'
 *     Adequate Intake for adults 19+ (3.7 L/day total for men, 2.7 L/day
 *     for women; roughly 80% of that comes from drinks rather than food):
 *     ~3.0 L men, ~2.2 L women, midpoint 2.6 L if sex isn't given.
 *  3. Base = average of (1) and (2), so body size and the guideline both count.
 *  4. Additions:
 *     - Exercise: +12 oz (~355 mL) per 30 minutes (a common sports-medicine
 *       rule of thumb for replacing sweat losses).
 *     - Hot weather: +2 cups.
 *     - Pregnancy: +1 cup (Adequate Intake rises from 2.7 to 3.0 L).
 *     - Breastfeeding: +3 cups (Adequate Intake rises to 3.8 L).
 *  5. Rounded to whole 8-oz cups and kept within MIN_CUPS–MAX_CUPS.
 */
import { MAX_GOAL_CUPS } from '../config';

export const ML_PER_KG = 33;
export const GUIDELINE_ML: Record<Sex, number> = { male: 3000, female: 2200, unspecified: 2600 };
export const EXERCISE_ML_PER_30_MIN = 355;
export const CUP_ML = 236.6;
export const HOT_WEATHER_ML = 2 * CUP_ML;
export const PREGNANT_ML = 1 * CUP_ML;
export const BREASTFEEDING_ML = 3 * CUP_ML;

export const MIN_CUPS = 4;
export const MAX_CUPS = MAX_GOAL_CUPS;

export const KG_PER_LB = 0.45359237;
/** Accepted weight range (kg); outside it we don't give an estimate. */
export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 250;
export const MAX_EXERCISE_MINUTES = 300;

export type Sex = 'male' | 'female' | 'unspecified';
export type WeightUnit = 'lb' | 'kg';
export type Pregnancy = 'none' | 'pregnant' | 'breastfeeding';

export interface CalculatorInput {
  weight: number;
  weightUnit: WeightUnit;
  sex: Sex;
  /** Minutes of exercise on a typical day. */
  exerciseMinutes: number;
  hotWeather: boolean;
  /** Only used when sex is 'female' or 'unspecified'. */
  pregnancy: Pregnancy;
}

export interface BreakdownLine {
  label: string;
  ml: number;
}

export interface WaterEstimate {
  cups: number;
  oz: number;
  liters: number;
  /** Unrounded total before limits, for the breakdown. */
  totalMl: number;
  breakdown: BreakdownLine[];
  /** True if the result was raised/lowered to stay within MIN_CUPS–MAX_CUPS. */
  limited: boolean;
}

export const DEFAULT_CALCULATOR_INPUT: CalculatorInput = {
  weight: 150,
  weightUnit: 'lb',
  sex: 'unspecified',
  exerciseMinutes: 0,
  hotWeather: false,
  pregnancy: 'none',
};

export function toKg(weight: number, unit: WeightUnit): number {
  return unit === 'kg' ? weight : weight * KG_PER_LB;
}

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  const converted = to === 'kg' ? weight * KG_PER_LB : weight / KG_PER_LB;
  return Math.round(converted);
}

export function pregnancyApplies(sex: Sex): boolean {
  return sex !== 'male';
}

export function isValidWeight(weight: number, unit: WeightUnit): boolean {
  if (!Number.isFinite(weight)) return false;
  const kg = toKg(weight, unit);
  return kg >= MIN_WEIGHT_KG && kg <= MAX_WEIGHT_KG;
}

/** Returns null when the weight is missing or out of range. */
export function estimateDailyWater(input: CalculatorInput): WaterEstimate | null {
  if (!isValidWeight(input.weight, input.weightUnit)) return null;

  const kg = toKg(input.weight, input.weightUnit);
  const base = (kg * ML_PER_KG + GUIDELINE_ML[input.sex]) / 2;
  const breakdown: BreakdownLine[] = [{ label: 'Body weight & national guidelines', ml: base }];

  const minutes = Math.max(0, Math.min(MAX_EXERCISE_MINUTES, input.exerciseMinutes));
  if (minutes > 0) breakdown.push({ label: `Exercise (${minutes} min)`, ml: (minutes / 30) * EXERCISE_ML_PER_30_MIN });
  if (input.hotWeather) breakdown.push({ label: 'Hot weather', ml: HOT_WEATHER_ML });
  if (pregnancyApplies(input.sex)) {
    if (input.pregnancy === 'pregnant') breakdown.push({ label: 'Pregnancy', ml: PREGNANT_ML });
    if (input.pregnancy === 'breastfeeding') breakdown.push({ label: 'Breastfeeding', ml: BREASTFEEDING_ML });
  }

  const totalMl = breakdown.reduce((sum, line) => sum + line.ml, 0);
  const rawCups = Math.round(totalMl / CUP_ML);
  const cups = Math.max(MIN_CUPS, Math.min(MAX_CUPS, rawCups));

  return {
    cups,
    oz: cups * 8,
    liters: Math.round(cups * CUP_ML) / 1000,
    totalMl,
    breakdown,
    limited: cups !== rawCups,
  };
}

/** "≈ 1.5 cups" style label for a breakdown amount. */
export function formatCups(ml: number): string {
  const cups = Math.round((ml / CUP_ML) * 2) / 2; // nearest half cup
  return `${cups} ${cups === 1 ? 'cup' : 'cups'}`;
}
