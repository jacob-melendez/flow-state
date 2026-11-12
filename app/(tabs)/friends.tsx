import { router, useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '../../src/cloud/account';
import { isWeb } from '../../src/platform';
import { FriendRow, removeFriend, respondToRequest, useFriends } from '../../src/cloud/friends';
import { BackendSetupHint } from '../../src/ui/BackendSetupHint';
import { Banner, Button, Card, SectionTitle } from '../../src/ui/components';
import { ProgressRing } from '../../src/ui/ProgressRing';
import { READABLE_WIDTH, makeStyles, radius, spacing, useTheme } from '../../src/ui/theme';

export default function FriendsScreen() {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { status, displayName } = useAccount();
  const { friends, incoming, outgoing, loaded, loading, error, refresh } = useFriends();

  // Refresh whenever the tab is opened, and as soon as a restored login finishes
  // loading (the tab can be opened before that happens).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    if (status === 'signed-in') refresh();
  }, [status, refresh]);

  const header = (
    <View style={styles.headerRow}>
      <Text style={type.title}>Friends</Text>
      {status === 'signed-in' && displayName ? (
        <Text accessibilityRole="button" onPress={() => router.push('/friends/add')} style={styles.addLink}>
          + Add
        </Text>
      ) : null}
    </View>
  );

  let body: ReactNode;
  if (status === 'disabled') {
    // This build isn't connected to a backend, so there are no accounts yet.
    body = (
      <Card style={{ gap: spacing.md }}>
        <Text style={styles.bigEmoji}>🤝</Text>
        <Text style={type.heading}>Stay hydrated together</Text>
        <Text style={styles.muted}>
          Add friends with a friend code, an invite link or their Stanford email, then cheer each other on. Friends see
          only your name, today’s cups and your streak.
        </Text>
        <Banner tone="info">Friends need a Flow State account, which isn’t available in this version yet.</Banner>
        <BackendSetupHint />
      </Card>
    );
  } else if (status === 'loading') {
    body = null;
  } else if (status !== 'signed-in') {
    body = (
      <Card style={{ gap: spacing.md }}>
        <Text style={styles.bigEmoji}>🤝</Text>
        <Text style={type.heading}>Stay hydrated together</Text>
        <Text style={styles.muted}>
          Sign in with your Stanford email to add friends and cheer each other on. Friends see only your name, today’s cups
          and your streak.
        </Text>
        <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
      </Card>
    );
  } else if (!displayName) {
    body = (
      <Card style={{ gap: spacing.md }}>
        <Text style={type.heading}>Add your name first</Text>
        <Text style={styles.muted}>Friends will see this name, so they know who you are.</Text>
        <Button label="Add your name" onPress={() => router.push('/auth/profile')} />
      </Card>
    );
  } else {
    const empty = loaded && friends.length + incoming.length + outgoing.length === 0;
    body = (
      <>
        {error ? <Banner tone="warning">{`Couldn’t refresh. ${error}`}</Banner> : null}

        {incoming.length > 0 ? (
          <>
            <SectionTitle>Requests</SectionTitle>
            <Card style={{ gap: spacing.md }}>
              {incoming.map((r) => (
                <IncomingRequest key={r.request_id} row={r} />
              ))}
            </Card>
          </>
        ) : null}

        {friends.length > 0 ? (
          <>
            <SectionTitle>Today</SectionTitle>
            <Card style={{ gap: spacing.xs }}>
              {friends.map((f, i) => (
                <FriendItem key={f.user_id} row={f} last={i === friends.length - 1} />
              ))}
            </Card>
          </>
        ) : null}

        {outgoing.length > 0 ? (
          <>
            <SectionTitle>Waiting for a reply</SectionTitle>
            <Card style={{ gap: spacing.sm }}>
              {outgoing.map((r) => (
                <View key={r.request_id} style={styles.pendingRow}>
                  <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
                    {r.display_name ?? 'New student'}
                  </Text>
                  <Text
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel request to ${r.display_name ?? 'this student'}`}
                    onPress={() => removeFriend(r.user_id)}
                    style={styles.cancel}
                  >
                    Cancel
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {empty ? (
          <Card style={{ gap: spacing.md, alignItems: 'center' }}>
            <Text style={styles.bigEmoji}>💧</Text>
            <Text style={[type.heading, { textAlign: 'center' }]}>No friends yet</Text>
            <Text style={[styles.muted, { textAlign: 'center' }]}>
              Share your friend code or add someone by their Stanford email. You’ll see each other’s cups today and streaks.
            </Text>
            <Button label="Add friends" onPress={() => router.push('/friends/add')} style={{ alignSelf: 'stretch' }} />
          </Card>
        ) : null}

        {friends.length > 0 ? (
          <Text style={[type.caption, { marginTop: spacing.md, textAlign: 'center' }]}>
            Friends see your name, today’s cups and your streak.{isWeb ? '' : ' Pull down to refresh.'}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={
        status === 'signed-in' ? <RefreshControl refreshing={loading && loaded} onRefresh={refresh} tintColor={colors.muted} colors={[colors.primary]} /> : undefined
      }
    >
      {header}
      {body}
    </ScrollView>
  );
}

function IncomingRequest({ row }: { row: FriendRow }) {
  const styles = useStyles();
  const { type } = useTheme();
  const [busy, setBusy] = useState(false);
  const answer = async (accept: boolean) => {
    setBusy(true);
    const err = await respondToRequest(row.request_id, accept);
    setBusy(false);
    if (err) Alert.alert('Couldn’t update request', err);
  };
  const block = () =>
    Alert.alert('Block this student?', 'They won’t be able to send you requests. They aren’t told they’re blocked.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => removeFriend(row.user_id, true) },
    ]);
  return (
    <View style={{ gap: spacing.sm }}>
      <View>
        <Text style={type.heading}>{row.display_name ?? 'New student'}</Text>
        {row.email ? <Text style={type.caption}>{row.email}</Text> : null}
      </View>
      <View style={styles.requestButtons}>
        <Button label="Accept" onPress={() => answer(true)} disabled={busy} style={{ flex: 1 }} />
        <Button variant="secondary" label="Decline" onPress={() => answer(false)} disabled={busy} style={{ flex: 1 }} />
      </View>
      <Text accessibilityRole="button" onPress={block} style={styles.blockLink}>
        Block
      </Text>
    </View>
  );
}

function FriendItem({ row, last }: { row: FriendRow; last: boolean }) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const name = row.display_name ?? 'Friend';
  const cups = row.today_cups ?? 0;
  const goal = row.today_goal ?? 8;
  const met = cups >= goal;
  const streak = row.streak ?? 0;

  const menu = () =>
    Alert.alert(name, undefined, [
      {
        text: 'Remove friend',
        onPress: () =>
          Alert.alert(`Remove ${name}?`, 'You’ll stop seeing each other’s progress.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeFriend(row.user_id) },
          ]),
      },
      {
        text: 'Remove & block',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Block ${name}?`, 'You’ll stop being friends and they can’t send you requests. They aren’t told.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block', style: 'destructive', onPress: () => removeFriend(row.user_id, true) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <View
      style={[styles.friendRow, !last && styles.friendDivider]}
      accessible
      accessibilityLabel={`${name}: ${cups} of ${goal} cups today, ${streak} day streak`}
    >
      <ProgressRing progress={cups / goal} size={48} stroke={6}>
        <Text style={styles.ringText}>{met ? '✓' : cups}</Text>
      </ProgressRing>
      <View style={{ flex: 1 }}>
        <Text style={type.body} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.caption, met && { color: colors.success, fontWeight: '600' }]}>
          {met ? `Goal reached · ${cups} cups` : `${cups} of ${goal} cups today`}
        </Text>
      </View>
      {streak > 0 ? <Text style={styles.streak}>🔥 {streak}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${name}`} onPress={menu} hitSlop={10}>
        <Text style={styles.more}>⋯</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors, type) =>
  StyleSheet.create({
  content: { ...READABLE_WIDTH, padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  addLink: { color: colors.primaryText, fontSize: 17, fontWeight: '700', padding: spacing.xs },
  bigEmoji: { fontSize: 40 },
  muted: { ...type.body, color: colors.muted, lineHeight: 22 },
  requestButtons: { flexDirection: 'row', gap: spacing.sm },
  blockLink: { color: colors.muted, fontSize: 14, alignSelf: 'flex-start', paddingVertical: spacing.xs },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  cancel: { color: colors.primaryText, fontWeight: '600', fontSize: 15, padding: spacing.xs },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  friendDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ringText: { fontSize: 15, fontWeight: '700', color: colors.text },
  streak: { fontSize: 15, fontWeight: '700', color: colors.text },
  more: { fontSize: 22, color: colors.muted, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
}));
