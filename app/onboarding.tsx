import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { BackHandler, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cloudEnabled } from '../src/cloud/client';
import { supportsReminders } from '../src/platform';
import { APP_FULL_NAME, ORG_NAME } from '../src/config';
import { usePermission } from '../src/state/permissionStore';
import { useSettings } from '../src/state/settingsStore';
import { Button, Card } from '../src/ui/components';
import { WaterEstimate } from '../src/domain/waterCalculator';
import { CalculatorForm } from '../src/ui/CalculatorForm';
import { ActiveHoursFields, AfterGoalField, GoalField, IntervalField } from '../src/ui/ReminderSettingsForm';
import { READABLE_WIDTH, makeStyles, spacing, useTheme } from '../src/ui/theme';

const ALL_STEPS = ['welcome', 'about', 'goal', 'reminders', 'afterGoal', 'notifications'] as const;
// The website has no reminders, so it skips the reminder and notification steps.
const STEPS: readonly (typeof ALL_STEPS)[number][] = supportsReminders ? ALL_STEPS : ['welcome', 'about', 'goal'];

export default function OnboardingScreen() {
  const styles = useStyles();
  const { type } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const setDailyGoal = useSettings((s) => s.setDailyGoal);
  const [estimate, setEstimate] = useState<WaterEstimate | null>(null);
  // The estimate last applied as the goal, so going Back and Continue again
  // doesn't overwrite an adjustment made on the goal step.
  const [appliedCups, setAppliedCups] = useState<number | null>(null);
  const requestPermission = usePermission((s) => s.request);

  const next = () => {
    // Leaving "About you": the calculator's estimate becomes the starting goal.
    if (STEPS[step] === 'about' && estimate && estimate.cups !== appliedCups) {
      setDailyGoal(estimate.cups);
      setAppliedCups(estimate.cups);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  // The calculator is required: no moving on without a valid estimate.
  const canContinue = STEPS[step] !== 'about' || estimate !== null;
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Android back button: go back a step instead of leaving the app mid-setup.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((s) => Math.max(s - 1, 0));
      return true;
    });
    return () => sub.remove();
  }, [step]);
  const finish = async (ask: boolean) => {
    if (ask) await requestPermission();
    completeOnboarding();
    router.replace('/');
  };

  let content: ReactNode;
  switch (STEPS[step]) {
    case 'welcome':
      content = (
        <Step emoji="💧" title={`Welcome to ${APP_FULL_NAME}`} subtitle={ORG_NAME}>
          <Text style={styles.body}>
            {supportsReminders
              ? 'Staying hydrated helps your focus, mood and energy. We’ll send gentle reminders to drink water throughout your day, and you can track your cups toward a daily goal.'
              : 'Staying hydrated helps your focus, mood and energy. Track your cups toward a daily goal here, and get reminders with the Flow State app on your phone.'}
          </Text>
        </Step>
      );
      break;
    case 'about':
      content = (
        <Step emoji="🧮" title="About you" subtitle="A few quick questions to set a daily water goal that fits you.">
          <CalculatorForm onEstimateChange={setEstimate} showBreakdown={false} />
        </Step>
      );
      break;
    case 'goal':
      content = (
        <Step
          emoji="🎯"
          title="Your daily goal"
          subtitle={
            estimate
              ? `Based on your answers: ${estimate.cups} cups (${estimate.oz} oz). Adjust it if it feels too high or low; you can change it any time in Settings.`
              : 'Adjust it any time in Settings.'
          }
        >
          <Card>
            <GoalField showCalculatorLink={false} />
          </Card>
        </Step>
      );
      break;
    case 'reminders':
      content = (
        <Step
          emoji="⏰"
          title="Your reminders"
          subtitle="How often, and only while you’re awake. Change these any time."
        >
          <Card>
            <IntervalField />
          </Card>
          <Card>
            <ActiveHoursFields />
          </Card>
        </Step>
      );
      break;
    case 'afterGoal':
      content = (
        <Step
          emoji="🏁"
          title="After you reach your goal"
          subtitle="Do you still want reminders once you’ve hit your goal for the day?"
        >
          <Card>
            <AfterGoalField />
          </Card>
        </Step>
      );
      break;
    case 'notifications':
      content = (
        <Step emoji="🔔" title="Turn on reminders" subtitle="Reminders need notification permission.">
          <Text style={styles.body}>
            Next, your phone will ask whether to allow notifications. Tap “Allow” so we can remind you to drink water.
            {cloudEnabled ? '' : ' Everything stays on your phone.'}
          </Text>
          {cloudEnabled ? (
            <Text style={[type.caption, { lineHeight: 19 }]}>
              To help SENSA Impact Labs measure impact, Flow State shares anonymous daily totals (cups and whether you
              met your goal) with a random ID that isn’t linked to you. You can turn this off any time in Settings →
              Privacy.
            </Text>
          ) : null}
        </Step>
      );
      break;
  }

  const last = step === STEPS.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>{content}</ScrollView>

      <View style={{ gap: spacing.sm }}>
        {last && supportsReminders ? (
          <>
            <Button label="Allow notifications" onPress={() => finish(true)} />
            <Button variant="ghost" label="Not now" onPress={() => finish(false)} />
          </>
        ) : last ? (
          <>
            <Button label="Start tracking" onPress={() => finish(false)} disabled={!canContinue} />
            <Button variant="ghost" label="Back" onPress={back} />
          </>
        ) : (
          <>
            <Button label={step === 0 ? 'Get started' : 'Continue'} onPress={next} disabled={!canContinue} />
            {step > 0 ? <Button variant="ghost" label="Back" onPress={back} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

function Step({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const { type } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={{ gap: spacing.xs }}>
        <Text style={type.title}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { fontSize: 15 }]}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
    screen: { ...READABLE_WIDTH, flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary, width: 24 },
    emoji: { fontSize: 56 },
    body: { ...type.body, lineHeight: 24 },
  }),
);
