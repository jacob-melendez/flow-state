import { Stack } from 'expo-router';

import { useTheme } from '../../src/ui/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
