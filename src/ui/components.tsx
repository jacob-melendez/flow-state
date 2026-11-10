import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useTheme } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, variant === 'primary' ? { color: colors.onPrimary } : { color: colors.primaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  format = String,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={String(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{format(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  format = String,
  label,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format?: (v: number) => string;
  label: string;
  step?: number;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepperButton, value <= min && { opacity: 0.3 }]}
      >
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue} accessibilityLabel={`${label}: ${format(value)}`}>
        {format(value)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepperButton, value >= max && { opacity: 0.3 }]}
      >
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

/** On/off switch in the app's colors (Cardinal when on). */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Switch
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.primary, false: colors.border }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.border}
    />
  );
}

export function Banner({ tone, children }: { tone: 'info' | 'warning' | 'success'; children: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = tone === 'warning' ? colors.warningSoft : tone === 'success' ? colors.successSoft : colors.primarySoft;
  const fg = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.onPrimarySoft;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const styles = useStyles();
  const { type } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={type.body}>{label}</Text>
        {hint ? <Text style={[type.caption, { marginTop: 2 }]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm + 2 },
  segmentSelected: { backgroundColor: colors.segmentSelected, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentLabel: { fontSize: 15, color: colors.onPrimarySoft, fontWeight: '500', textAlign: 'center' },
  segmentLabelSelected: { fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 22, color: colors.onPrimarySoft, fontWeight: '600', marginTop: -2 },
  stepperValue: { minWidth: 72, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text },
  banner: { borderRadius: radius.md, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, minHeight: 48 },
}));
