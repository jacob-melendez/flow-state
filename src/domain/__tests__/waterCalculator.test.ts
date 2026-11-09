import {
  CalculatorInput,
  DEFAULT_CALCULATOR_INPUT,
  MAX_CUPS,
  MIN_CUPS,
  convertWeight,
  estimateDailyWater,
  formatCups,
  isValidWeight,
  toKg,
} from '../waterCalculator';

const input = (overrides: Partial<CalculatorInput>): CalculatorInput => ({ ...DEFAULT_CALCULATOR_INPUT, ...overrides });

describe('estimateDailyWater', () => {
  it.each([
    // 70 kg man: (70*33 + 3000) / 2 = 2655 mL ≈ 11.2 cups
    ['70 kg man', input({ weight: 70, weightUnit: 'kg', sex: 'male' }), 11],
    // 60 kg woman: (1980 + 2200) / 2 = 2090 mL ≈ 8.8 cups
    ['60 kg woman', input({ weight: 60, weightUnit: 'kg', sex: 'female' }), 9],
    // 150 lb (68 kg), sex not given: (2245 + 2600) / 2 ≈ 2423 mL ≈ 10.2 cups
    ['150 lb, sex not given', input({ weight: 150, weightUnit: 'lb', sex: 'unspecified' }), 10],
  ])('%s → %i cups', (_label, i, cups) => {
    expect(estimateDailyWater(i)!.cups).toBe(cups);
  });

  it('reports oz and liters for the rounded cups', () => {
    const e = estimateDailyWater(input({ weight: 70, weightUnit: 'kg', sex: 'male' }))!;
    expect(e.oz).toBe(88);
    expect(e.liters).toBeCloseTo(2.603, 3);
  });

  it('gives the same answer for equivalent lb and kg weights', () => {
    const lb = estimateDailyWater(input({ weight: 154.3, weightUnit: 'lb', sex: 'male' }))!;
    const kg = estimateDailyWater(input({ weight: 70, weightUnit: 'kg', sex: 'male' }))!;
    expect(lb.totalMl).toBeCloseTo(kg.totalMl, 0);
  });

  it('adds 12 oz per 30 minutes of exercise', () => {
    const rest = estimateDailyWater(input({ weight: 70, weightUnit: 'kg', sex: 'male' }))!;
    const active = estimateDailyWater(input({ weight: 70, weightUnit: 'kg', sex: 'male', exerciseMinutes: 60 }))!;
    expect(active.totalMl - rest.totalMl).toBeCloseTo(710, 0);
    expect(active.cups).toBe(14);
    expect(active.breakdown.map((b) => b.label)).toContain('Exercise (60 min)');
  });

  it('adds 2 cups for hot weather', () => {
    const e = estimateDailyWater(input({ weight: 60, weightUnit: 'kg', sex: 'female', hotWeather: true }))!;
    expect(e.cups).toBe(11);
  });

  it('applies pregnancy and breastfeeding only when sex is not male', () => {
    expect(estimateDailyWater(input({ weight: 60, weightUnit: 'kg', sex: 'female', pregnancy: 'pregnant' }))!.cups).toBe(10);
    expect(estimateDailyWater(input({ weight: 60, weightUnit: 'kg', sex: 'female', pregnancy: 'breastfeeding' }))!.cups).toBe(12);
    expect(estimateDailyWater(input({ weight: 60, weightUnit: 'kg', sex: 'unspecified', pregnancy: 'pregnant' }))!.breakdown).toHaveLength(2);
    const male = estimateDailyWater(input({ weight: 70, weightUnit: 'kg', sex: 'male', pregnancy: 'breastfeeding' }))!;
    expect(male.breakdown).toHaveLength(1);
    expect(male.cups).toBe(11);
  });

  it('keeps results within the goal range', () => {
    const big = estimateDailyWater(
      input({ weight: 250, weightUnit: 'kg', sex: 'male', exerciseMinutes: 300, hotWeather: true }),
    )!;
    expect(big.cups).toBe(MAX_CUPS);
    expect(big.limited).toBe(true);

    const small = estimateDailyWater(input({ weight: 30, weightUnit: 'kg', sex: 'female' }))!;
    expect(small.cups).toBeGreaterThanOrEqual(MIN_CUPS);
  });

  it('caps exercise minutes', () => {
    const a = estimateDailyWater(input({ weight: 60, weightUnit: 'kg', exerciseMinutes: 300 }))!;
    const b = estimateDailyWater(input({ weight: 60, weightUnit: 'kg', exerciseMinutes: 9999 }))!;
    expect(b.totalMl).toBe(a.totalMl);
  });

  it('returns null for missing or out-of-range weights', () => {
    expect(estimateDailyWater(input({ weight: NaN }))).toBeNull();
    expect(estimateDailyWater(input({ weight: 0 }))).toBeNull();
    expect(estimateDailyWater(input({ weight: 20, weightUnit: 'kg' }))).toBeNull();
    expect(estimateDailyWater(input({ weight: 700, weightUnit: 'lb' }))).toBeNull();
  });
});

describe('weight helpers', () => {
  it('converts between lb and kg', () => {
    expect(toKg(100, 'kg')).toBe(100);
    expect(toKg(220.462, 'lb')).toBeCloseTo(100, 2);
    expect(convertWeight(150, 'lb', 'kg')).toBe(68);
    expect(convertWeight(68, 'kg', 'lb')).toBe(150);
    expect(convertWeight(70, 'kg', 'kg')).toBe(70);
  });

  it('validates weight', () => {
    expect(isValidWeight(150, 'lb')).toBe(true);
    expect(isValidWeight(60, 'lb')).toBe(false);
  });
});

describe('formatCups', () => {
  it('rounds to the nearest half cup', () => {
    expect(formatCups(236.6)).toBe('1 cup');
    expect(formatCups(355)).toBe('1.5 cups');
    expect(formatCups(473.2)).toBe('2 cups');
  });
});
