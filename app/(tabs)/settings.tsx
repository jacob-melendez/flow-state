import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_FULL_NAME, ORG_NAME } from '../../src/config';
import { sendTestReminder } from '../../src/notifications/adapter';
import { usePermission } from '../../src/state/permissionStore';
import { useSettings } from '../../src/state/settingsStore';
import { Button, Card, Row, SectionTitle } from '../../src/ui/components';
import { PauseControls, ReminderStatus } from '../../src/ui/ReminderStatus';
import { ActiveHoursFields, GoalField, IntervalField } from '../../src/ui/ReminderSettingsForm';
import { colors, spacing, type } from '../../src/ui/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { enabled, setEnabled } = useSettings();
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

      <SectionTitle>Reminders</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Row label="Water reminders">
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} />
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

      <SectionTitle>About</SectionTitle>
      <Card style={{ gap: spacing.xs }}>
        <Text style={type.heading}>{APP_FULL_NAME}</Text>
        <Text style={[type.caption, { color: colors.cardinal }]}>{ORG_NAME}</Text>
        <Text style={[type.body, { marginTop: spacing.sm, lineHeight: 22 }]}>
          Built to make water awareness and access part of everyday student life.
        </Text>
        <Text style={[type.caption, { marginTop: spacing.sm }]}>
          Your settings and water log are stored only on this device. Nothing is sent anywhere.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
