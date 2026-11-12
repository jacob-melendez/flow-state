import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '../config';
import { SensaLogo } from './SensaLogo';
import { makeStyles, spacing, useTheme } from './theme';
import { WaterBuddy } from './WaterBuddy';

/** Shortest time the launch screen stays up, so it doesn't just flash. */
export const MIN_LAUNCH_MS = 900;

/**
 * Branded screen shown while the app loads: the water buddy, "Flow State",
 * and SENSA's logo. Takes over from the native splash (same background color),
 * then fades out once `ready` is true.
 */
export function LaunchScreen({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_LAUNCH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start(() =>
      onDone(),
    );
  }, [ready, minElapsed, opacity, onDone]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, { opacity, backgroundColor: colors.background }]}
      // Hide the native splash once this identical-looking screen is on screen.
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
      accessibilityLabel={`${APP_NAME}, by SENSA, a Stanford student organization. Loading.`}
    >
      <View style={styles.center}>
        <WaterBuddy cups={1} goal={2} size={120} />
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.by}>by</Text>
        <SensaLogo width={72} />
      </View>
      <Text style={styles.footer}>A Stanford student organization</Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    center: { alignItems: 'center', gap: spacing.sm },
    title: { fontSize: 36, fontWeight: '800', color: colors.primaryText, letterSpacing: 0.5, marginTop: spacing.sm },
    by: { fontSize: 14, color: colors.muted, marginTop: spacing.md },
    footer: { position: 'absolute', bottom: 48, fontSize: 13, color: colors.muted, letterSpacing: 0.3 },
  }),
);
