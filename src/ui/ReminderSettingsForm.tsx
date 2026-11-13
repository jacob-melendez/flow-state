import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MAX_GOAL_CUPS, MIN_GOAL_CUPS } from '../config';
import { formatDuration, slotCount, windowLength } from '../domain/time';
import { maxWindowMinutes } from '../scheduling/buildSchedule';
import { useSettings } from '../state/settingsStore';
import { Banner, Row, Segmented, Stepper } from './components';
import { IntervalPicker, intervalLabel } from './IntervalPicker';
import { TimeField } from './TimeField';
import { spacing, useTheme } from './theme';

export function IntervalField() {
  const { intervalMinutes, setInterval } = useSettings();
  return <IntervalPicker value={intervalMinutes} onChange={setInterval} />;
}

const AFTER_GOAL_OPTIONS = ['keep', 'stop'] as const;
const AFTER_GOAL_LABELS = { keep: 'Keep reminding me', stop: 'Stop until tomorrow' } as const;

/** What happens to reminders once the day's goal is reached. */
export function AfterGoalField() {
  const { type } = useTheme();
  const { afterGoal, setAfterGoal } = useSettings();
  return (
    <View style={{ gap: spacing.sm }}>
      <Segmented
        options={AFTER_GOAL_OPTIONS}
        value={afterGoal}
        onChange={setAfterGoal}
        format={(o) => AFTER_GOAL_LABELS[o]}
      />
      <Text style={type.caption}>
        {afterGoal === 'stop'
          ? 'Once you reach your goal, reminders pause until your active hours start tomorrow.'
          : 'Reminders keep coming after you reach your goal.'}
      </Text>
    </View>
  );
}

export function ActiveHoursFields() {
  const { type } = useTheme();
  const { activeStartMin, activeEndMin, intervalMinutes, windowWasClamped, setActiveWindow } = useSettings();
  const count = slotCount(activeStartMin, activeEndMin, intervalMinutes);
  return (
    <View style={{ gap: spacing.xs }}>
      <Row label="Start">
        <TimeField label="Start time" minute={activeStartMin} onChange={(m) => setActiveWindow(m, activeEndMin)} />
      </Row>
      <Row label="End">
        <TimeField label="End time" minute={activeEndMin} onChange={(m) => setActiveWindow(activeStartMin, m)} />
      </Row>
      <Text style={type.caption}>
        {formatDuration(windowLength(activeStartMin, activeEndMin))} window · {count} reminder{count === 1 ? '' : 's'} a day
      </Text>
      {windowWasClamped ? (
        <View style={{ marginTop: spacing.sm }}>
          <Banner tone="warning">
            {`With ${intervalLabel(intervalMinutes)} reminders, active hours can be up to ${formatDuration(
              maxWindowMinutes(intervalMinutes),
            )} (phones limit how many reminders an app can schedule). We adjusted your end time.`}
          </Banner>
        </View>
      ) : null}
    </View>
  );
}

export function GoalField({ showCalculatorLink = true }: { showCalculatorLink?: boolean }) {
  const { colors } = useTheme();
  const { dailyGoal, setDailyGoal } = useSettings();
  return (
    <View>
      <Row label="Daily goal" hint="1 cup = 8 oz">
        <Stepper
          label="daily goal"
          value={dailyGoal}
          onChange={setDailyGoal}
          min={MIN_GOAL_CUPS}
          max={MAX_GOAL_CUPS}
          format={(v) => `${v} cups`}
        />
      </Row>
      {showCalculatorLink ? (
        <Text
          accessibilityRole="button"
          accessibilityHint="Opens the water calculator"
          onPress={() => router.push('/calculator')}
          style={{ color: colors.primaryText, fontSize: 15, fontWeight: '600', paddingTop: spacing.sm }}
        >
          Update my details in the calculator →
        </Text>
      ) : null}
    </View>
  );
}
