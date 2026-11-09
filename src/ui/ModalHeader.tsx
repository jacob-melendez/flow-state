import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from './theme';

/** Title bar for screens presented as modals, with a text button on the right. */
export function ModalHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? spacing.lg : insets.top + spacing.md }]}>
      <Text style={type.heading}>{title}</Text>
      <Text accessibilityRole="button" onPress={onAction} style={styles.action}>
        {action}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  action: { color: colors.primary, fontSize: 17, fontWeight: '600', padding: spacing.xs },
});
