import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { deleteAccount, requestCloudSync, signOut, useAccount } from '../cloud/account';
import { replaceLocalDataWith } from '../cloud/cloudSync';
import { setDiscoverableByEmail } from '../cloud/friends';
import { useLog } from '../state/logStore';
import { Banner, Button, Card, Row } from './components';
import { colors, spacing, type } from './theme';
import { useNow } from './useNow';

function ago(t: number, now: number): string {
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(t).toLocaleDateString();
}

/** Settings → Account. Hidden entirely when the app has no backend configured. */
export function AccountCard() {
  const now = useNow(30_000);
  const { status, email, displayName, syncing, syncError, userId, friendCode, discoverableByEmail } = useAccount();
  const { lastSyncedAt, ownerUserId, dirtyEntryIds } = useLog();
  const [deleting, setDeleting] = useState(false);

  if (status === 'disabled') return null;

  if (status === 'loading') {
    return (
      <Card>
        <ActivityIndicator />
      </Card>
    );
  }

  if (status === 'signed-out') {
    return (
      <Card style={{ gap: spacing.md }}>
        <Text style={type.heading}>Back up your progress</Text>
        <Text style={[type.body, { color: colors.muted, lineHeight: 22 }]}>
          Sign in with your Stanford email to keep your water log safe if you lose or switch phones.
        </Text>
        <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
      </Card>
    );
  }

  const otherAccountData = ownerUserId !== null && ownerUserId !== userId;

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your water log stays on this phone. Sign in again any time to keep backing it up.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: () => signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and your backed-up water log from our servers. The log on this phone stays. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const err = await deleteAccount();
            setDeleting(false);
            if (err) Alert.alert('Couldn’t delete account', err);
          },
        },
      ],
    );

  const confirmReplace = () =>
    Alert.alert('Replace data on this phone?', 'This phone’s water log belongs to a different account. Replace it with this account’s data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: () => {
          if (userId) replaceLocalDataWith(userId);
          requestCloudSync();
        },
      },
    ]);

  let status_line: string;
  if (syncing) status_line = 'Backing up…';
  else if (syncError) status_line = syncError;
  else if (lastSyncedAt) status_line = `Backed up ${ago(lastSyncedAt, now)}${dirtyEntryIds.length ? ' · changes waiting' : ''}`;
  else status_line = 'Not backed up yet';

  return (
    <Card style={{ gap: spacing.sm }}>
      <Row label={displayName ?? 'Add your name'} hint={email ?? undefined}>
        <Text accessibilityRole="button" onPress={() => router.push('/auth/profile')} style={styles.link}>
          Edit
        </Text>
      </Row>

      {otherAccountData ? (
        <View style={{ gap: spacing.sm }}>
          <Banner tone="warning">This phone’s water log belongs to another account, so it isn’t being backed up.</Banner>
          <Button variant="secondary" label="Use this account’s data" onPress={confirmReplace} />
        </View>
      ) : (
        <View style={styles.syncRow}>
          <Text style={[type.caption, { flex: 1 }, syncError ? { color: colors.warning } : null]}>☁️ {status_line}</Text>
          <Text accessibilityRole="button" onPress={() => requestCloudSync()} style={styles.link}>
            Sync now
          </Text>
        </View>
      )}

      {friendCode ? (
        <Row label="Let friends find me by email" hint="Friends can always add you with your friend code.">
          <Switch
            accessibilityLabel="Let friends find me by email"
            value={discoverableByEmail}
            onValueChange={async (v) => {
              const err = await setDiscoverableByEmail(v);
              if (err) Alert.alert('Couldn’t update setting', err);
            }}
            trackColor={{ true: colors.primary }}
          />
        </Row>
      ) : null}

      <View style={styles.divider} />
      <Button variant="ghost" label="Sign out" onPress={confirmSignOut} />
      <Text
        accessibilityRole="button"
        onPress={deleting ? undefined : confirmDelete}
        style={[styles.danger, deleting && { opacity: 0.5 }]}
      >
        {deleting ? 'Deleting…' : 'Delete account'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', fontSize: 15, padding: spacing.xs },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  danger: { color: colors.danger, textAlign: 'center', fontSize: 15, paddingVertical: spacing.sm },
});
