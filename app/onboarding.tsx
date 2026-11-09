import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_FULL_NAME, ORG_NAME } from '../src/config';
import { usePermission } from '../src/state/permissionStore';
import { useSettings } from '../src/state/settingsStore';
import { Button, Card } from '../src/ui/components';
import { ActiveHoursFields, GoalField, IntervalField } from '../src/ui/ReminderSettingsForm';
import { colors, spacing, type } from '../src/ui/theme';

const STEPS = ['welcome', 'interval', 'hours', 'goal', 'notifications'] as const;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const requestPermission = usePermission((s) => s.request);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
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
            Staying hydrated helps your focus, mood and energy. We’ll send gentle reminders to drink water throughout your
            day, and you can track your cups toward a daily goal.
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
            Next, your iPhone will ask whether to allow notifications. Tap “Allow” so we can remind you to drink water.
            Everything stays on your phone.
          </Text>
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
        {last ? (
          <>
            <Button label="Allow notifications" onPress={() => finish(true)} />
            <Button variant="ghost" label="Not now" onPress={() => finish(false)} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  emoji: { fontSize: 56 },
  body: { ...type.body, lineHeight: 24 },
});
