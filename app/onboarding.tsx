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
import { ActiveHoursFields, GoalField, IntervalField } from '../src/ui/ReminderSettingsForm';
import { READABLE_WIDTH, makeStyles, spacing, useTheme } from '../src/ui/theme';

const ALL_STEPS = ['welcome', 'interval', 'hours', 'goal', 'notifications'] as const;
// The website has no reminders, so it skips the reminder and notification steps.
const STEPS = supportsReminders ? ALL_STEPS : (['welcome', 'goal'] as const);

export default function OnboardingScreen() {
  const styles = useStyles();
  const { type } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const requestPermission = usePermission((s) => s.request);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
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
    case 'interval':
      content = (
        <Step emoji="⏰" title="How often should we remind you?" subtitle="You can change this any time.">
          <IntervalField />
        </Step>
      );
      break;
    case 'hours':
      content = (
        <Step emoji="🌙" title="When are you awake?" subtitle="We’ll only send reminders during these hours.">
          <Card>
            <ActiveHoursFields />
          </Card>
        </Step>
      );
      break;
    case 'goal':
      content = (
        <Step emoji="🎯" title="Set a daily goal" subtitle="8 cups (64 oz) is a common starting point.">
          <Card>
            <GoalField />
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
              To help SENSA Impact Labs measure impact, Flow State shares anonymous daily totals (cups and whether you met
              your goal) with a random ID that isn’t linked to you. You can turn this off any time in Settings → Privacy.
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
            <Button label="Start tracking" onPress={() => finish(false)} />
            <Button variant="ghost" label="Back" onPress={back} />
          </>
        ) : (
          <>
            <Button label={step === 0 ? 'Get started' : 'Continue'} onPress={next} />
            {step > 0 ? <Button variant="ghost" label="Back" onPress={back} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

function Step({ emoji, title, subtitle, children }: { emoji: string; title: string; subtitle?: string; children: ReactNode }) {
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
}));
