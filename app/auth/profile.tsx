import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';

import { updateDisplayName, useAccount } from '../../src/cloud/account';
import { Banner, Button, Card } from '../../src/ui/components';
import { ModalHeader } from '../../src/ui/ModalHeader';
import { READABLE_WIDTH, makeStyles, radius, spacing, useTheme } from '../../src/ui/theme';

/** Sets the display name (shown on first sign-in, and from Settings to edit it). */
export default function ProfileScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const current = useAccount((s) => s.displayName);
  const [name, setName] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const err = await updateDisplayName(name);
    setSaving(false);
    if (err) setError(err);
    else router.dismissAll();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ModalHeader title="Your name" action={current ? 'Cancel' : 'Skip'} onAction={() => router.dismissAll()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>👋</Text>
        <Text style={type.title}>{current ? 'Change your name' : 'You’re signed in!'}</Text>
        <Text style={styles.body}>
          What should we call you? Friends will see this name. Use a first name or nickname.
        </Text>
        <Card>
          <TextInput
            accessibilityLabel="Display name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            onSubmitEditing={save}
            placeholder="e.g. Alex"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="done"
            maxLength={30}
            autoFocus
            style={styles.input}
          />
        </Card>
        {error ? <Banner tone="warning">{error}</Banner> : null}
        <View>
          <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving || name.trim() === ''} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  content: { ...READABLE_WIDTH, padding: spacing.lg, gap: spacing.lg },
  emoji: { fontSize: 48 },
  body: { ...type.body, color: colors.muted, lineHeight: 23 },
  input: {
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
}));
