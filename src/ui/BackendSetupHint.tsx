import { StyleSheet, Text, View } from 'react-native';

import { makeStyles, radius, spacing, useTheme } from './theme';

/**
 * Development builds only: explains how to turn on accounts and friends by
 * connecting the app to Supabase. Never shown to students in release builds.
 */
export function BackendSetupHint() {
  const styles = useStyles();
  const { type } = useTheme();
  if (!__DEV__) return null;
  return (
    <View style={styles.box} accessibilityLabel="Developer setup instructions">
      <Text style={styles.label}>For the dev team: connect Supabase</Text>
      <Text style={type.caption}>1. In the project folder, run:</Text>
      <Text style={styles.code} selectable>
        cp .env.example .env.local
      </Text>
      <Text style={type.caption}>
        2. Paste your Supabase Project URL and publishable key into .env.local (EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_KEY).
      </Text>
      <Text style={type.caption}>3. Restart with:</Text>
      <Text style={styles.code} selectable>
        npx expo start --clear
      </Text>
      <Text style={type.caption}>Full steps (database, email codes): docs/backend-setup.md</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    box: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    label: { fontSize: 13, fontWeight: '700', color: colors.text },
    code: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
  }),
);
