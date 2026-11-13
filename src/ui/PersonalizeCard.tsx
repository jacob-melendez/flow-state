import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { supportsReminders } from '../platform';
import { useSettings } from '../state/settingsStore';
import { Button, Card } from './components';
import { spacing, useTheme } from './theme';

/**
 * One-time card on Today for students who set up the app before the
 * calculator was part of onboarding. Hidden once they personalize or dismiss it.
 */
export function PersonalizeCard() {
  const { type } = useTheme();
  const { calculatorProfile, personalizeDismissed, dismissPersonalize } = useSettings();
  if (calculatorProfile || personalizeDismissed) return null;
  return (
    <Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <Text style={type.heading}>Personalize your goal ✨</Text>
      <Text style={[type.body, { lineHeight: 22 }]}>
        Answer a few quick questions for a daily goal that fits you
        {supportsReminders ? ', and choose whether reminders stop once you reach it.' : '.'}
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Button label="Personalize" onPress={() => router.push('/personalize')} />
        <Button variant="ghost" label="Not now" onPress={dismissPersonalize} />
      </View>
    </Card>
  );
}
