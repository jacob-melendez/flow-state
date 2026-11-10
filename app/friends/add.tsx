import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, Text, TextInput, View, StyleSheet } from 'react-native';

import { useAccount } from '../../src/cloud/account';
import { completeStanfordEmail, isStanfordEmail } from '../../src/cloud/email';
import { formatFriendCode, friendShareMessage, isValidFriendCode } from '../../src/cloud/friendCode';
import { sendFriendRequest } from '../../src/cloud/friends';
import { Banner, Button, Card, SectionTitle } from '../../src/ui/components';
import { ModalHeader } from '../../src/ui/ModalHeader';
import { makeStyles, radius, spacing, useTheme } from '../../src/ui/theme';

type Result = { ok: boolean; message: string } | null;

export default function AddFriendScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const { status, friendCode } = useAccount();
  const [code, setCode] = useState(params.code ? formatFriendCode(params.code) : '');
  const [email, setEmail] = useState('');
  const [codeResult, setCodeResult] = useState<Result>(null);
  const [emailResult, setEmailResult] = useState<Result>(null);
  const [busy, setBusy] = useState<'code' | 'email' | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/friends'));

  if (status !== 'signed-in') {
    return (
      <View style={{ flex: 1 }}>
        <ModalHeader title="Add friends" action="Close" onAction={close} />
        <View style={styles.content}>
          <Text style={type.heading}>Sign in to add friends</Text>
          {params.code ? (
            <Text style={styles.muted}>Your friend’s code is {formatFriendCode(params.code)}. Sign in, then come back to add them.</Text>
          ) : null}
          <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
        </View>
      </View>
    );
  }

  const addByCode = async () => {
    if (!isValidFriendCode(code)) {
      setCodeResult({ ok: false, message: 'Friend codes have 8 letters and numbers, like ABCD-EFGH.' });
      return;
    }
    setBusy('code');
    setCodeResult(await sendFriendRequest({ code }));
    setBusy(null);
  };

  const fullEmail = completeStanfordEmail(email);
  const addByEmail = async () => {
    if (!isStanfordEmail(fullEmail)) {
      setEmailResult({ ok: false, message: 'Enter their @stanford.edu email address.' });
      return;
    }
    setBusy('email');
    setEmailResult(await sendFriendRequest({ email: fullEmail }));
    setBusy(null);
  };

  const share = () => {
    if (friendCode) Share.share({ message: friendShareMessage(friendCode) }).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModalHeader title="Add friends" action="Done" onAction={close} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={type.caption}>Your friend code</Text>
          <Text style={styles.myCode} selectable accessibilityLabel={`Your friend code: ${friendCode ? formatFriendCode(friendCode).split('').join(' ') : 'loading'}`}>
            {friendCode ? formatFriendCode(friendCode) : '…'}
          </Text>
          <Button label="Share invite" onPress={share} disabled={!friendCode} style={{ alignSelf: 'stretch' }} />
          {!friendCode ? (
            <Text style={[type.caption, { textAlign: 'center' }]}>
              Friend codes aren’t available yet. Ask your app’s admin to finish the friends setup.
            </Text>
          ) : null}
        </Card>

        <SectionTitle>Add by friend code</SectionTitle>
        <Card style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Friend code"
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setCodeResult(null);
            }}
            onSubmitEditing={addByCode}
            placeholder="ABCD-EFGH"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
            returnKeyType="send"
            style={[styles.input, styles.codeInput]}
          />
          <Button label={busy === 'code' ? 'Sending…' : 'Send request'} onPress={addByCode} disabled={busy !== null || code.trim() === ''} />
          {codeResult ? <Banner tone={codeResult.ok ? 'success' : 'warning'}>{codeResult.message}</Banner> : null}
        </Card>

        <SectionTitle>Add by Stanford email</SectionTitle>
        <Card style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Friend's Stanford email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailResult(null);
            }}
            onSubmitEditing={addByEmail}
            placeholder="sunetid@stanford.edu"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="send"
            style={styles.input}
          />
          {email && !email.includes('@') ? <Text style={type.caption}>{fullEmail}</Text> : null}
          <Button
            label={busy === 'email' ? 'Sending…' : 'Send request'}
            onPress={addByEmail}
            disabled={busy !== null || email.trim() === ''}
          />
          {emailResult ? <Banner tone={emailResult.ok ? 'success' : 'warning'}>{emailResult.message}</Banner> : null}
        </Card>

        <Text style={[type.caption, { marginTop: spacing.lg, lineHeight: 19 }]}>
          Friends see your name, today’s cups and your streak, never your weight, calculator answers or history. Requests
          show your Stanford email so friends know it’s you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  muted: { ...type.body, color: colors.muted, lineHeight: 22 },
  myCode: { fontSize: 34, fontWeight: '800', letterSpacing: 3, color: colors.primaryText },
  input: {
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  codeInput: { fontSize: 22, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
}));
