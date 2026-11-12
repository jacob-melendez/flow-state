import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';

import { sendCode } from '../../src/cloud/account';
import { completeStanfordEmail, isStanfordEmail } from '../../src/cloud/email';
import { Banner, Button, Card } from '../../src/ui/components';
import { ModalHeader } from '../../src/ui/ModalHeader';
import { READABLE_WIDTH, makeStyles, radius, spacing, useTheme } from '../../src/ui/theme';

export default function SignInScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const email = completeStanfordEmail(input);
  const valid = isStanfordEmail(email);

  const submit = async () => {
    if (!valid) {
      setError('Use your @stanford.edu email address.');
      return;
    }
    setSending(true);
    setError(null);
    const err = await sendCode(email);
    setSending(false);
    if (err) setError(err);
    else router.push({ pathname: '/auth/verify', params: { email } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ModalHeader title="Sign in" action="Cancel" onAction={() => router.dismissAll()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>☁️</Text>
        <Text style={type.title}>Back up your progress</Text>
        <Text style={styles.body}>
          Sign in with your Stanford email to keep your water log safe, use it on more than one device, and add friends.
          No password needed: we’ll email you a 6-digit code.
        </Text>

        <Card style={{ gap: spacing.sm }}>
          <Text style={type.caption}>Stanford email</Text>
          <TextInput
            accessibilityLabel="Stanford email"
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(null);
            }}
            onSubmitEditing={submit}
            placeholder="sunetid@stanford.edu"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            style={styles.input}
          />
          {input && !input.includes('@') ? <Text style={type.caption}>We’ll send the code to {email}</Text> : null}
        </Card>

        {error ? <Banner tone="warning">{error}</Banner> : null}

        <View style={{ gap: spacing.sm }}>
          <Button label={sending ? 'Sending…' : 'Email me a code'} onPress={submit} disabled={sending || input.trim() === ''} />
          <Text style={[type.caption, { textAlign: 'center' }]}>
            Only @stanford.edu addresses can create accounts. Your water log stays on this phone either way.
          </Text>
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
