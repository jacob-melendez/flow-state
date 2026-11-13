import { Picker } from '@react-native-picker/picker';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { INTERVAL_CHOICES } from '../config';
import { makeStyles, radius, spacing, useTheme } from './theme';

/** "45 min", "1 hr", "1 hr 15 min", "3 hr". */
export function intervalLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Reminder interval: a scroll wheel on iPhone, a picker on Android, a menu on the web (15 min – 3 hr). */
export function IntervalPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[type.caption, styles.caption]}>Remind me every {intervalLabel(value)}</Text>
      <View style={styles.pickerBox}>
        <Picker
          accessibilityLabel="Reminder interval"
          selectedValue={value}
          onValueChange={(v) => onChange(Number(v))}
          mode="dialog"
          prompt="Remind me every"
          dropdownIconColor={colors.primaryText}
          style={[styles.picker, { color: colors.text }]}
          itemStyle={[styles.item, { color: colors.text }]}
        >
          {INTERVAL_CHOICES.map((m) => (
            <Picker.Item key={m} label={intervalLabel(m)} value={m} color={Platform.OS === 'ios' ? colors.text : undefined} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs },
    caption: { textAlign: 'center' },
    pickerBox: {
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      overflow: 'hidden',
      // Web renders a <select>; give it room and padding.
      ...(Platform.OS === 'web' ? { padding: spacing.sm } : null),
    },
    picker: Platform.select({
      ios: { height: 160 },
      web: { fontSize: 17, borderWidth: 0, backgroundColor: 'transparent', padding: spacing.xs },
      default: {},
    }),
    item: { fontSize: 20, height: 160 },
  }),
);
