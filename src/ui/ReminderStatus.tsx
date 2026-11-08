import { Linking, StyleSheet, Text, View } from 'react-native';

import { formatMinuteOfDay, minuteOfDay } from '../domain/time';
import { buildSchedule, isPaused, nextReminderAt, pauseForHours, pauseUntilTomorrow } from '../scheduling/buildSchedule';
import { usePermission } from '../state/permissionStore';
import { reminderSettingsOf, useSettings } from '../state/settingsStore';
import { Banner, Button } from './components';
import { colors, radius, spacing, type } from './theme';
import { useNow } from './useNow';

function formatTime(t: number, now: number): string {
  const time = formatMinuteOfDay(minuteOfDay(new Date(t)));
  const sameDay = new Date(t).toDateString() === new Date(now).toDateString();
  return sameDay ? time : `tomorrow at ${time}`;
}

/** One-line summary of when the next reminder will arrive, plus fixes for problems. */
export function ReminderStatus() {
  const now = useNow();
  const settings = useSettings();
  const { permission, request } = usePermission();

  if (permission === 'denied') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Banner tone="warning">Notifications are turned off for this app, so reminders can’t be delivered.</Banner>
        <Button variant="secondary" label="Open Settings" onPress={() => Linking.openSettings()} />
      </View>
    );
  }
  if (permission === 'undetermined') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Banner tone="info">Allow notifications so we can remind you to drink water.</Banner>
        <Button label="Allow notifications" onPress={request} />
      </View>
    );
  }
  if (!settings.enabled) {
    return <Banner tone="info">Reminders are off. Turn them on in Settings.</Banner>;
  }

  const next = nextReminderAt(buildSchedule(reminderSettingsOf(settings), now), now);
  const paused = isPaused(settings, now);
  let message = 'No reminders scheduled.';
  if (paused) {
    message = `Paused until ${formatTime(settings.pausedUntil!, now)}.`;
  } else if (next) {
    const when = formatTime(next, now);
    message = `Next reminder ${when.startsWith('tomorrow') ? when : `at ${when}`}.`;
  }
  return <Banner tone={paused ? 'warning' : 'info'}>{message}</Banner>;
}

/** Pause/resume chips. */
export function PauseControls() {
  const now = useNow();
  const { enabled, pausedUntil, activeStartMin, pauseUntil, resume } = useSettings();
  if (!enabled) return null;
  const paused = isPaused({ pausedUntil }, now);

  if (paused) {
    return <Button variant="secondary" label="Resume reminders" onPress={resume} />;
  }

  const options: { label: string; until: () => number }[] = [
    { label: '1 hr', until: () => pauseForHours(Date.now(), 1) },
    { label: '2 hr', until: () => pauseForHours(Date.now(), 2) },
    { label: 'Rest of today', until: () => pauseUntilTomorrow(Date.now(), activeStartMin) },
  ];
  return (
    <View>
      <Text style={[type.caption, { marginBottom: spacing.sm }]}>Pause reminders (in class, exams, sleeping in…)</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Text
            key={o.label}
            accessibilityRole="button"
            accessibilityLabel={`Pause reminders for ${o.label}`}
            onPress={() => pauseUntil(o.until())}
            style={styles.chip}
          >
            {o.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
