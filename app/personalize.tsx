import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supportsReminders } from '../src/platform';
import { useSettings } from '../src/state/settingsStore';
import { CalculatorForm } from '../src/ui/CalculatorForm';
import { Banner, Button, Card, SectionTitle } from '../src/ui/components';
import { ModalHeader } from '../src/ui/ModalHeader';
import { AfterGoalField, GoalField } from '../src/ui/ReminderSettingsForm';
import { READABLE_WIDTH, makeStyles, spacing, useTheme } from '../src/ui/theme';

/** For students who onboarded before the calculator was part of setup. */
export default function PersonalizeScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { dailyGoal, setDailyGoal, dismissPersonalize } = useSettings();
  const [applied, setApplied] = useState<number | null>(null);

  const done = () => {
    dismissPersonalize();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ModalHeader title="Personalize your goal" action="Done" onAction={done} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.body, { color: colors.muted, lineHeight: 22 }]}>
          Answer a few questions for a daily goal that fits you. You can still adjust it whenever you like.
        </Text>

        <CalculatorForm
          showBreakdown={false}
          resultFooter={(estimate) =>
            applied === estimate.cups ? (
              <Banner tone="success">Daily goal set to {estimate.cups} cups.</Banner>
            ) : (
              <Button
                label={estimate.cups === dailyGoal ? 'This is already your goal' : `Use ${estimate.cups} cups as my goal`}
                onPress={() => {
                  setDailyGoal(estimate.cups);
                  setApplied(estimate.cups);
                }}
                disabled={estimate.cups === dailyGoal}
              />
            )
          }
        />

        <SectionTitle>Fine-tune your goal</SectionTitle>
        <Card>
          <GoalField showCalculatorLink={false} />
        </Card>

        {supportsReminders ? (
          <>
            <SectionTitle>After you reach your goal</SectionTitle>
            <Card>
              <AfterGoalField />
            </Card>
          </>
        ) : null}

        <Button label="Done" onPress={done} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    content: { ...READABLE_WIDTH, padding: spacing.lg },
  }),
);
