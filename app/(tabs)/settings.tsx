import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_FULL_NAME, ORG_NAME, PRIVACY_POLICY_URL } from '../../src/config';
import { sendTestReminder } from '../../src/notifications/adapter';
import { usePermission } from '../../src/state/permissionStore';
import { useSettings } from '../../src/state/settingsStore';
import { cloudEnabled } from '../../src/cloud/client';
import { AccountCard } from '../../src/ui/AccountCard';
import { Button, Card, Row, SectionTitle, Segmented, Toggle } from '../../src/ui/components';
import { PauseControls, ReminderStatus } from '../../src/ui/ReminderStatus';
import { ActiveHoursFields, GoalField, IntervalField } from '../../src/ui/ReminderSettingsForm';
import { makeStyles, spacing, useTheme } from '../../src/ui/theme';
import type { AppearancePreference } from '../../src/ui/theme';

const APPEARANCE_OPTIONS = ['system', 'light', 'dark'] as const;
const APPEARANCE_LABELS: Record<AppearancePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { enabled, setEnabled, shareImpactStats, setShareImpactStats, appearance, setAppearance } = useSettings();
  const permission = usePermission((s) => s.permission);
  const [testSent, setTestSent] = useState(false);

  const onTest = async () => {
    if (permission !== 'granted') {
      Alert.alert('Notifications are off', 'Allow notifications first so the test reminder can appear.');
      return;
    }
    await sendTestReminder(10);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 12_000);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={type.title}>Settings</Text>

      {cloudEnabled ? (
        <>
          <SectionTitle>Account</SectionTitle>
          <AccountCard />
        </>
      ) : null}

      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <Segmented
          options={APPEARANCE_OPTIONS}
          value={appearance}
          onChange={setAppearance}
          format={(o) => APPEARANCE_LABELS[o]}
        />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Row label="Water reminders">
          <Toggle value={enabled} onValueChange={setEnabled} />
        </Row>
        <ReminderStatus />
      </Card>

      {enabled ? (
        <>
          <SectionTitle>Remind me every</SectionTitle>
          <Card>
            <IntervalField />
          </Card>

          <SectionTitle>Active hours</SectionTitle>
          <Card>
            <ActiveHoursFields />
          </Card>

          <SectionTitle>Pause</SectionTitle>
          <Card>
            <PauseControls />
          </Card>
        </>
      ) : null}

      <SectionTitle>Goal</SectionTitle>
      <Card>
        <GoalField />
      </Card>

      <SectionTitle>Try it</SectionTitle>
      <Card style={{ gap: spacing.sm }}>
        <Button
          variant="secondary"
          label={testSent ? 'Sent! Arriving in ~10 seconds…' : 'Send a test reminder'}
          onPress={onTest}
          disabled={testSent}
          accessibilityHint="Schedules a sample reminder 10 seconds from now"
        />
        <Text style={type.caption}>Lock your phone after tapping to see how reminders look.</Text>
      </Card>

      {cloudEnabled || PRIVACY_POLICY_URL ? (
        <>
          <SectionTitle>Privacy</SectionTitle>
          <Card style={{ gap: spacing.sm }}>
            {cloudEnabled ? (
              <>
                <Row label="Share anonymous usage stats">
                  <Toggle
                    accessibilityLabel="Share anonymous usage stats"
                    value={shareImpactStats}
                    onValueChange={setShareImpactStats}
                  />
                </Row>
                <Text style={[type.caption, { lineHeight: 19 }]}>
                  Helps SENSA Impact Labs measure whether Flow State works. Once a day, the app sends each past day’s cup
                  count and whether you met your goal, with a random ID that isn’t linked to your name, email or account.
                  Nothing is sent while this is off.
                </Text>
              </>
            ) : null}
            {PRIVACY_POLICY_URL ? (
              <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_POLICY_URL!)} style={styles.link}>
                Privacy policy
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionTitle>About</SectionTitle>
      <Card style={{ gap: spacing.xs }}>
        <Text style={type.heading}>{APP_FULL_NAME}</Text>
        <Text style={[type.caption, { color: colors.primaryText }]}>{ORG_NAME}</Text>
        <Text style={[type.body, { marginTop: spacing.sm, lineHeight: 22 }]}>
          Built to make water awareness and access part of everyday student life.
        </Text>
        <Text style={[type.caption, { marginTop: spacing.sm }]}>
          {cloudEnabled
            ? 'Your water log stays on this phone unless you sign in to back it up. Reminder settings and calculator answers never leave your phone.'
            : 'Your settings and water log are stored only on this device. Nothing is sent anywhere.'}
        </Text>
        <Text style={type.caption}>Version {Constants.expoConfig?.version ?? '–'}</Text>
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  link: { color: colors.primaryText, fontWeight: '600', fontSize: 15, paddingVertical: spacing.xs },
}));
