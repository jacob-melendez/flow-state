import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CUP_OZ } from '../../src/config';
import { buddyState } from '../../src/domain/buddy';
import { TodayAssessment, assessToday } from '../../src/domain/today';
import { bestStreak, countsByDay, currentStreak, lastNDays } from '../../src/domain/streaks';
import { dateKey, parseDateKey } from '../../src/domain/time';
import { useLog } from '../../src/state/logStore';
import { useSettings } from '../../src/state/settingsStore';
import { Banner, Card, SectionTitle } from '../../src/ui/components';
import { supportsReminders } from '../../src/platform';
import { FriendsCard } from '../../src/ui/FriendsCard';
import { PersonalizeCard } from '../../src/ui/PersonalizeCard';
import { GetTheAppCard } from '../../src/ui/GetTheAppCard';
import { ProgressRing } from '../../src/ui/ProgressRing';
import { WaterBuddy } from '../../src/ui/WaterBuddy';
import { PauseControls, ReminderStatus } from '../../src/ui/ReminderStatus';
import { READABLE_WIDTH, makeStyles, radius, spacing, useTheme } from '../../src/ui/theme';
import { useNow } from '../../src/ui/useNow';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The line under the ring: pace or safety first, otherwise the buddy's cheer. */
function statusText(t: TodayAssessment, buddyCaption: string): string {
  if (t.intake.level === 'warning') return 'That’s plenty. Take a break 🫧';
  if (t.intake.level === 'caution') return 'Well past your goal. Ease off for now.';
  if (t.goalMet) return buddyCaption;
  if (t.pace === 'farBehind') return 'Far behind for this time of day. Time to catch up!';
  if (t.pace === 'behind') return 'A bit behind. Have a cup when you can.';
  return t.cups === 0 ? buddyCaption : 'On track for this time of day ✓';
}

export default function TodayScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { dailyGoal: goal, calculatorProfile, activeStartMin, activeEndMin, pausedUntil, afterGoal } = useSettings();
  const { entries, goalByDay, logCup, undoLastToday } = useLog();

  // Pace (on track for this time of day?) and safety (too much?) drive the ring color.
  const todayStatus = useMemo(
    () =>
      assessToday(
        { entries, goal, calculator: calculatorProfile, window: { activeStartMin, activeEndMin }, pausedUntil, afterGoal },
        now,
      ),
    [entries, goal, calculatorProfile, activeStartMin, activeEndMin, pausedUntil, afterGoal, now],
  );
  const ringColor = { good: colors.ringGood, caution: colors.ringCaution, alert: colors.ringAlert }[todayStatus.ring];
  const overfull = todayStatus.intake.level === 'warning';

  const stats = useMemo(() => {
    const counts = countsByDay(entries);
    return {
      today: counts[dateKey(now)] ?? 0,
      streak: currentStreak(counts, goalByDay, goal, now),
      best: bestStreak(counts, goalByDay, goal),
      week: lastNDays(7, counts, goalByDay, goal, now),
    };
  }, [entries, goalByDay, goal, now]);

  const statusColor = (ring: TodayAssessment['ring']) =>
    ring === 'alert' ? colors.danger : ring === 'caution' ? colors.warning : colors.success;

  const onLog = () => {
    logCup(goal);
    if (Platform.OS !== 'web') {
      const feedback =
        stats.today + 1 === goal
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      feedback.catch(() => {});
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={type.title}>Today</Text>

      <View style={{ marginTop: spacing.lg }}>
        <PersonalizeCard />
      </View>

      <View style={styles.ringWrap}>
        <ProgressRing progress={stats.today / goal} size={240} color={ringColor}>
          <WaterBuddy cups={stats.today} goal={goal} size={160} overfull={overfull} />
        </ProgressRing>
        <Text style={styles.count} accessibilityLabel={`${stats.today} of ${goal} cups today`}>
          {stats.today} <Text style={styles.countOf}>of {goal} cups</Text>
        </Text>
        <Text style={[type.caption, styles.caption, { color: statusColor(todayStatus.ring) }]}>
          {stats.today * CUP_OZ} oz · {statusText(todayStatus, buddyState(stats.today, goal).caption)}
        </Text>
      </View>

      {todayStatus.intake.level !== 'ok' ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Banner tone="warning">
            {todayStatus.intake.reason === 'fast'
              ? 'That’s a lot of water in a short time. Take a break for at least an hour; reminders are paused.'
              : todayStatus.intake.level === 'warning'
                ? 'You’re well past what you need today. Take a break and drink only when thirsty. Reminders are paused for today.'
                : 'You’re well past your goal. No need to push more water today; drink when you’re thirsty.'}
          </Banner>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a cup of water"
        onPress={onLog}
        style={({ pressed }) => [styles.logButton, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
      >
        <Text style={styles.logButtonText}>+1 cup 💧</Text>
      </Pressable>
      {stats.today > 0 ? (
        <Text accessibilityRole="button" onPress={() => undoLastToday()} style={styles.undo}>
          Undo last cup
        </Text>
      ) : null}

      <SectionTitle>Reminders</SectionTitle>
      {supportsReminders ? (
        <Card style={{ gap: spacing.md }}>
          <ReminderStatus />
          <PauseControls />
        </Card>
      ) : (
        <GetTheAppCard />
      )}

      <SectionTitle>Friends</SectionTitle>
      <FriendsCard />

      <SectionTitle>Streak</SectionTitle>
      <Card style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>🔥 {stats.streak}</Text>
          <Text style={type.caption}>day streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>{stats.best}</Text>
          <Text style={type.caption}>best streak</Text>
        </View>
      </Card>

      <SectionTitle>Last 7 days</SectionTitle>
      <Card>
        <View style={styles.week}>
          {stats.week.map((d) => {
            const fill = Math.min(1, d.count / d.goal);
            return (
              <View
                key={d.key}
                style={styles.dayCol}
                accessible
                accessibilityLabel={`${parseDateKey(d.key).toDateString()}: ${d.count} of ${d.goal} cups`}
              >
                <Text style={[type.caption, { fontSize: 11 }]}>{d.count}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(fill * 100, d.count > 0 ? 6 : 0)}%`, backgroundColor: d.met ? colors.success : colors.water },
                    ]}
                  />
                </View>
                <Text style={[type.caption, d.key === dateKey(now) && { color: colors.text, fontWeight: '700' }]}>
                  {WEEKDAY[parseDateKey(d.key).getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  content: { ...READABLE_WIDTH, padding: spacing.lg, paddingBottom: spacing.xxl },
  ringWrap: { alignItems: 'center', marginVertical: spacing.xl },
  count: { fontSize: 34, fontWeight: '800', color: colors.water, marginTop: spacing.md },
  countOf: { fontSize: 18, fontWeight: '600', color: colors.muted },
  caption: { marginTop: spacing.xs, fontSize: 15, textAlign: 'center' },
  metText: { color: colors.success, fontWeight: '600' },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + 2,
    alignItems: 'center',
  },
  logButtonText: { color: colors.onPrimary, fontSize: 20, fontWeight: '700' },
  undo: { textAlign: 'center', color: colors.primaryText, marginTop: spacing.md, fontSize: 15, padding: spacing.xs },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center' },
  streakValue: { fontSize: 26, fontWeight: '700', color: colors.text },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  week: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dayCol: { alignItems: 'center', flex: 1, gap: 4 },
  barTrack: {
    width: 18,
    height: 80,
    borderRadius: 9,
    backgroundColor: colors.waterSoft,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 9 },
}));
