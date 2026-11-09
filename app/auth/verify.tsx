import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { requestCloudSync, sendCode, signOut, verifyCode } from '../../src/cloud/account';
import { replaceLocalDataWith } from '../../src/cloud/cloudSync';
import { Banner, Button, Card } from '../../src/ui/components';
import { ModalHeader } from '../../src/ui/ModalHeader';
import { colors, radius, spacing, type } from '../../src/ui/theme';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Asks whether to replace another account's data on this phone. Resolves true to continue. */
function confirmReplace(email: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      'Replace data on this phone?',
      `This phone has a water log from a different account. Signing in as ${email} replaces it with that account’s data. The other account’s data is still backed up in the cloud.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ],
    ),
  );
}

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const submit = async (value = code) => {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyCode(email, value);
    if (result.error !== null) {
      setBusy(false);
      setError(result.error);
      return;
    }
    if (result.ownership === 'other-account') {
      if (!(await confirmReplace(email))) {
        await signOut();
        setBusy(false);
        router.dismissAll();
        return;
      }
      replaceLocalDataWith(result.userId);
    }
    requestCloudSync();
    setBusy(false);
    if (result.needsName) router.replace('/auth/profile');
    else router.dismissAll();
  };

  const resend = async () => {
    setError(null);
    setResendIn(RESEND_SECONDS);
    const err = await sendCode(email);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModalHeader title="Enter code" action="Cancel" onAction={() => router.dismissAll()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>📬</Text>
        <Text style={type.title}>Check your email</Text>
        <Text style={styles.body}>
          We sent a {CODE_LENGTH}-digit code to <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>. It may
          take a minute; check your spam folder if you don’t see it.
        </Text>

        <Card>
          <TextInput
            accessibilityLabel="6-digit code"
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
              setCode(digits);
              setError(null);
              if (digits.length === CODE_LENGTH) submit(digits);
            }}
            placeholder="123456"
            placeholderTextColor={colors.border}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={CODE_LENGTH}
            style={styles.code}
          />
        </Card>

        {error ? <Banner tone="warning">{error}</Banner> : null}

        <View style={{ gap: spacing.sm }}>
          <Button label={busy ? 'Checking…' : 'Sign in'} onPress={() => submit()} disabled={busy || code.length !== CODE_LENGTH} />
          <Button
            variant="ghost"
            label={resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            onPress={resend}
            disabled={resendIn > 0}
          />
          <Button variant="ghost" label="Use a different email" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  emoji: { fontSize: 48 },
  body: { ...type.body, color: colors.muted, lineHeight: 23 },
  code: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
});
