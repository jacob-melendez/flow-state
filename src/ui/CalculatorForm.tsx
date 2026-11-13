import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  CalculatorInput,
  DEFAULT_CALCULATOR_INPUT,
  MAX_EXERCISE_MINUTES,
  Pregnancy,
  Sex,
  WaterEstimate,
  WeightUnit,
  convertWeight,
  estimateDailyWater,
  formatCups,
  isValidWeight,
  pregnancyApplies,
} from '../domain/waterCalculator';
import { useSettings } from '../state/settingsStore';
import { Card, Row, SectionTitle, Segmented, Stepper, Toggle } from './components';
import { makeStyles, radius, spacing, useTheme } from './theme';

const SEX_OPTIONS: readonly Sex[] = ['female', 'male', 'unspecified'];
const SEX_LABELS: Record<Sex, string> = { female: 'Female', male: 'Male', unspecified: 'Prefer not to say' };
const PREGNANCY_OPTIONS: readonly Pregnancy[] = ['none', 'pregnant', 'breastfeeding'];
const PREGNANCY_LABELS: Record<Pregnancy, string> = { none: 'Neither', pregnant: 'Pregnant', breastfeeding: 'Breastfeeding' };
const UNIT_OPTIONS: readonly WeightUnit[] = ['lb', 'kg'];

/**
 * The water calculator's questions and estimate. Answers are saved on this
 * device (never uploaded) so the form is prefilled next time.
 * Used by the calculator screen, onboarding and "Personalize your goal".
 */
export function CalculatorForm({
  onEstimateChange,
  resultFooter,
  showBreakdown = true,
}: {
  /** Called with the estimate whenever the answers change (null until a valid weight is entered). */
  onEstimateChange?: (estimate: WaterEstimate | null) => void;
  /** Extra content under the estimate, e.g. a "Set as my daily goal" button. */
  resultFooter?: (estimate: WaterEstimate) => ReactNode;
  showBreakdown?: boolean;
}) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const { calculatorProfile, setCalculatorProfile } = useSettings();

  const [input, setInput] = useState<CalculatorInput>(calculatorProfile ?? DEFAULT_CALCULATOR_INPUT);
  const [weightText, setWeightText] = useState(calculatorProfile ? String(calculatorProfile.weight) : '');

  const weight = Number(weightText.replace(',', '.'));
  const estimate = weightText.trim() === '' ? null : estimateDailyWater({ ...input, weight });

  useEffect(() => {
    if (isValidWeight(weight, input.weightUnit)) setCalculatorProfile({ ...input, weight });
  }, [input, weight, setCalculatorProfile]);

  const estimateCups = estimate?.cups ?? null;
  const estimateMl = estimate?.totalMl ?? null;
  useEffect(() => {
    onEstimateChange?.(estimate);
    // Only notify when the result actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateCups, estimateMl]);

  const update = (patch: Partial<CalculatorInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const changeUnit = (unit: WeightUnit) => {
    if (unit === input.weightUnit) return;
    if (weightText.trim() !== '' && Number.isFinite(weight)) setWeightText(String(convertWeight(weight, input.weightUnit, unit)));
    update({ weightUnit: unit });
  };

  const weightEntered = weightText.trim() !== '';

  return (
    <View>
      <SectionTitle>Weight</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <View style={styles.weightRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              accessibilityLabel={`Weight in ${input.weightUnit === 'lb' ? 'pounds' : 'kilograms'}`}
              value={weightText}
              onChangeText={(t) => setWeightText(t.replace(/[^0-9.,]/g, ''))}
              placeholder={input.weightUnit === 'lb' ? '150' : '68'}
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={5}
              style={styles.weightInput}
            />
          </View>
          <View style={{ width: 120 }}>
            <Segmented options={UNIT_OPTIONS} value={input.weightUnit} onChange={changeUnit} />
          </View>
        </View>
        {weightEntered && !estimate ? (
          <Text style={[type.caption, { color: colors.danger }]}>
            Enter a weight between {input.weightUnit === 'lb' ? '66 and 550 lb' : '30 and 250 kg'}.
          </Text>
        ) : null}
      </Card>

      <SectionTitle>Sex</SectionTitle>
      <Card style={{ gap: spacing.sm }}>
        <Segmented options={SEX_OPTIONS} value={input.sex} onChange={(sex) => update({ sex })} format={(s) => SEX_LABELS[s]} />
        <Text style={type.caption}>Guidelines differ for men and women. “Prefer not to say” uses the midpoint.</Text>
      </Card>

      <SectionTitle>Activity & conditions</SectionTitle>
      <Card style={{ gap: spacing.xs }}>
        <Row label="Exercise on a typical day" hint="Workouts, practice, long walks">
          <Stepper
            label="exercise minutes"
            value={input.exerciseMinutes}
            onChange={(exerciseMinutes) => update({ exerciseMinutes })}
            min={0}
            max={MAX_EXERCISE_MINUTES}
            step={15}
            format={(v) => `${v} min`}
          />
        </Row>
        <Row label="Hot weather" hint="Hot day or lots of time outside">
          <Toggle accessibilityLabel="Hot weather" value={input.hotWeather} onValueChange={(hotWeather) => update({ hotWeather })} />
        </Row>
        {pregnancyApplies(input.sex) ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Text style={type.body}>Pregnant or breastfeeding?</Text>
            <Segmented
              options={PREGNANCY_OPTIONS}
              value={input.pregnancy}
              onChange={(pregnancy) => update({ pregnancy })}
              format={(p) => PREGNANCY_LABELS[p]}
            />
          </View>
        ) : null}
      </Card>

      <SectionTitle>Your estimate</SectionTitle>
      {estimate ? (
        <Card style={{ gap: spacing.md }}>
          <View style={styles.result} accessible accessibilityLabel={`About ${estimate.cups} cups of water a day`}>
            <Text style={styles.resultCups}>{estimate.cups}</Text>
            <View>
              <Text style={type.heading}>cups a day</Text>
              <Text style={type.caption}>
                ≈ {estimate.oz} oz · {estimate.liters.toFixed(1)} L
              </Text>
            </View>
          </View>
          {showBreakdown ? (
            <View style={styles.breakdown}>
              {estimate.breakdown.map((line, i) => (
                <View key={line.label} style={styles.breakdownRow}>
                  <Text style={[type.caption, { flex: 1, color: colors.text }]}>{line.label}</Text>
                  <Text style={type.caption}>
                    {i === 0 ? '' : '+'}
                    {formatCups(line.ml)}
                  </Text>
                </View>
              ))}
              {estimate.limited ? (
                <Text style={type.caption}>Goals in the app range from 4 to 20 cups, so we adjusted this estimate.</Text>
              ) : null}
            </View>
          ) : null}
          {resultFooter?.(estimate)}
        </Card>
      ) : (
        <Card>
          <Text style={type.caption}>Enter your weight to see your estimate.</Text>
        </Card>
      )}

      <CalculatorDisclaimer />
    </View>
  );
}

export function CalculatorDisclaimer() {
  const { type } = useTheme();
  return (
    <Text style={[type.caption, { marginTop: spacing.lg, lineHeight: 19 }]}>
      This is a general estimate, not medical advice. Some health conditions (for example kidney or heart conditions)
      require limiting fluids. If that applies to you, ask a clinician what’s right for you. Your answers stay on this
      device.
    </Text>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    weightInput: {
      width: '100%',
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    resultCups: { fontSize: 56, fontWeight: '800', color: colors.water, lineHeight: 62 },
    breakdown: {
      gap: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  }),
);
