import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../src/state/settingsStore';
import { CalculatorForm } from '../src/ui/CalculatorForm';
import { Banner, Button } from '../src/ui/components';
import { ModalHeader } from '../src/ui/ModalHeader';
import { READABLE_WIDTH, makeStyles, spacing, useTheme } from '../src/ui/theme';

export default function CalculatorScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { dailyGoal, setDailyGoal } = useSettings();
  const [savedGoal, setSavedGoal] = useState<number | null>(null);

  const applyGoal = (cups: number) => {
    setDailyGoal(cups);
    setSavedGoal(cups);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ModalHeader title="Water calculator" action="Done" onAction={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.body, { color: colors.muted, lineHeight: 22 }]}>
          Update your details any time, for example if you start a new sport, and set the result as your goal.
        </Text>
        <CalculatorForm
          resultFooter={(estimate) =>
            savedGoal === estimate.cups ? (
              <Banner tone="success">Daily goal set to {estimate.cups} cups.</Banner>
            ) : (
              <Button
                label={
                  estimate.cups === dailyGoal
                    ? 'This is already your daily goal'
                    : `Set as my daily goal (${estimate.cups} cups)`
                }
                onPress={() => applyGoal(estimate.cups)}
                disabled={estimate.cups === dailyGoal}
              />
            )
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    content: { ...READABLE_WIDTH, padding: spacing.lg },
  }),
);
