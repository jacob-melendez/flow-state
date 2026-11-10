import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CalculatorInput,
  DEFAULT_CALCULATOR_INPUT,
  MAX_EXERCISE_MINUTES,
  Pregnancy,
  Sex,
  WeightUnit,
  convertWeight,
  estimateDailyWater,
  formatCups,
  isValidWeight,
  pregnancyApplies,
} from '../src/domain/waterCalculator';
import { useSettings } from '../src/state/settingsStore';
import { Banner, Button, Card, Row, SectionTitle, Segmented, Stepper, Toggle } from '../src/ui/components';
import { READABLE_WIDTH, makeStyles, radius, spacing, useTheme } from '../src/ui/theme';

const SEX_OPTIONS: readonly Sex[] = ['female', 'male', 'unspecified'];
const SEX_LABELS: Record<Sex, string> = { female: 'Female', male: 'Male', unspecified: 'Prefer not to say' };
const PREGNANCY_OPTIONS: readonly Pregnancy[] = ['none', 'pregnant', 'breastfeeding'];
const PREGNANCY_LABELS: Record<Pregnancy, string> = { none: 'Neither', pregnant: 'Pregnant', breastfeeding: 'Breastfeeding' };
const UNIT_OPTIONS: readonly WeightUnit[] = ['lb', 'kg'];

export default function CalculatorScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { dailyGoal, setDailyGoal, calculatorProfile, setCalculatorProfile } = useSettings();

  const [input, setInput] = useState<CalculatorInput>(calculatorProfile ?? DEFAULT_CALCULATOR_INPUT);
  const [weightText, setWeightText] = useState(calculatorProfile ? String(calculatorProfile.weight) : '');
  const [savedGoal, setSavedGoal] = useState<number | null>(null);

  const weight = Number(weightText.replace(',', '.'));
  const estimate = estimateDailyWater({ ...input, weight });

  // Remember answers on this device so the form is prefilled next time.
  useEffect(() => {
    if (isValidWeight(weight, input.weightUnit)) setCalculatorProfile({ ...input, weight });
  }, [input, weight, setCalculatorProfile]);

  const update = (patch: Partial<CalculatorInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const changeUnit = (unit: WeightUnit) => {
    if (unit === input.weightUnit) return;
    if (weightText.trim() !== '' && Number.isFinite(weight)) setWeightText(String(convertWeight(weight, input.weightUnit, unit)));
    update({ weightUnit: unit });
  };

  const applyGoal = () => {
    if (!estimate) return;
    setDailyGoal(estimate.cups);
    setSavedGoal(estimate.cups);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const weightEntered = weightText.trim() !== '';
  const isCurrentGoal = estimate?.cups === dailyGoal;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? spacing.lg : insets.top + spacing.md }]}>
        <Text style={type.heading}>Water calculator</Text>
        <Text accessibilityRole="button" onPress={() => router.back()} style={styles.done}>
          Done
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.body, { color: colors.muted, lineHeight: 22 }]}>
          Answer a few questions for a personal daily water estimate. Your answers stay on this phone.
        </Text>

        <SectionTitle>Weight</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.weightRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                accessibilityLabel={`Weight in ${input.weightUnit === 'lb' ? 'pounds' : 'kilograms'}`}
                value={weightText}
                onChangeText={(t) => setWeightText(t.replace(/[^0-9.,]/g, ''))}
                placeholder={input.weightUnit === 'lb' ? '150' : '68'}
                placeholderTextColor={colors.muted}
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
            <Toggle
              accessibilityLabel="Hot weather"
              value={input.hotWeather}
              onValueChange={(hotWeather) => update({ hotWeather })}
            />
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

            {savedGoal === estimate.cups ? (
              <Banner tone="success">Daily goal set to {estimate.cups} cups.</Banner>
            ) : (
              <Button
                label={isCurrentGoal ? 'This is already your daily goal' : `Set as my daily goal (${estimate.cups} cups)`}
                onPress={applyGoal}
                disabled={isCurrentGoal}
              />
            )}
          </Card>
        ) : (
          <Card>
            <Text style={type.caption}>Enter your weight to see your estimate.</Text>
          </Card>
        )}

        <Text style={[type.caption, styles.disclaimer]}>
          This is a general estimate, not medical advice. Some health conditions (for example kidney or heart conditions)
          require limiting fluids. If that applies to you, ask a clinician what’s right for you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  done: { color: colors.primaryText, fontSize: 17, fontWeight: '600', padding: spacing.xs },
  content: { ...READABLE_WIDTH, padding: spacing.lg },
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
  breakdown: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  disclaimer: { marginTop: spacing.lg, lineHeight: 19 },
}));
