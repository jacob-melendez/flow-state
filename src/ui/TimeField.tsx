import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';

import { formatMinuteOfDay, minuteOfDay, normalizeMinuteOfDay } from '../domain/time';
import { makeStyles, radius, spacing, useTheme } from './theme';

/** Picks a time of day (minutes after midnight) in 15-minute steps. */
export function TimeField({ label, minute, onChange }: { label: string; minute: number; onChange: (m: number) => void }) {
  const styles = useStyles();
  const { scheme, colors } = useTheme();
  const value = new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60);
  const roundTo15 = (d: Date) => normalizeMinuteOfDay(Math.round(minuteOfDay(d) / 15) * 15);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        accessibilityLabel={label}
        value={value}
        mode="time"
        display="compact"
        themeVariant={scheme}
        accentColor={colors.primaryText}
        minuteInterval={15}
        onValueChange={(_, date) => onChange(roundTo15(date))}
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatMinuteOfDay(minute)}`}
        style={styles.pill}
        onPress={() =>
          DateTimePickerAndroid.open({
            value,
            mode: 'time',
            minuteInterval: 15,
            onValueChange: (_, date) => onChange(roundTo15(date)),
          })
        }
      >
        <Text style={styles.pillText}>{formatMinuteOfDay(minute)}</Text>
      </Pressable>
    );
  }

  // Web and other platforms: simple ±15 min controls.
  return (
    <View style={styles.webRow}>
      <Pressable accessibilityLabel={`Earlier ${label}`} onPress={() => onChange(normalizeMinuteOfDay(minute - 15))} style={styles.pill}>
        <Text style={styles.pillText}>−</Text>
      </Pressable>
      <Text style={[styles.pillText, { minWidth: 84, textAlign: 'center' }]}>{formatMinuteOfDay(minute)}</Text>
      <Pressable accessibilityLabel={`Later ${label}`} onPress={() => onChange(normalizeMinuteOfDay(minute + 15))} style={styles.pill}>
        <Text style={styles.pillText}>+</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillText: { fontSize: 16, color: colors.onPrimarySoft, fontWeight: '600' },
  webRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
