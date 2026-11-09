import { Text, View } from 'react-native';

import { INTERVAL_OPTIONS, MAX_GOAL_CUPS, MIN_GOAL_CUPS } from '../config';
import { formatDuration, slotCount, windowLength } from '../domain/time';
import { maxWindowMinutes } from '../scheduling/buildSchedule';
import { useSettings } from '../state/settingsStore';
import { Banner, Row, Segmented, Stepper } from './components';
import { TimeField } from './TimeField';
import { spacing, type } from './theme';

const intervalLabel = (m: number) => (m === 60 ? '1 hour' : `${m} min`);

export function IntervalField() {
  const { intervalMinutes, setInterval } = useSettings();
  return <Segmented options={INTERVAL_OPTIONS} value={intervalMinutes} onChange={setInterval} format={intervalLabel} />;
}

export function ActiveHoursFields() {
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
            )} (iPhone limits how many reminders an app can schedule). We adjusted your end time.`}
          </Banner>
        </View>
      ) : null}
    </View>
  );
}

export function GoalField() {
  const { dailyGoal, setDailyGoal } = useSettings();
  return (
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
  );
}
