import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccount } from '../cloud/account';
import { FriendRow, useFriends } from '../cloud/friends';
import { Button, Card } from './components';
import { ProgressRing } from './ProgressRing';
import { makeStyles, spacing, useTheme } from './theme';

const MAX_SHOWN = 3;

/** Today screen: friends at a glance, or the next step to get started with friends. */
export function FriendsCard() {
  const styles = useStyles();
  const { type } = useTheme();
  const { status, displayName } = useAccount();
  const { friends, incoming, loaded, refresh } = useFriends();

  useFocusEffect(
    useCallback(() => {
      if (status === 'signed-in') refresh();
    }, [status, refresh]),
  );

  const intro = (text: string) => <Text style={[type.body, styles.intro]}>{text}</Text>;

  if (status === 'disabled') {
    return (
      <Card style={{ gap: spacing.md }}>
        {intro('Stay hydrated with friends: see each other’s cups today and streaks.')}
        <Button variant="secondary" label="Learn more" onPress={() => router.push('/friends')} />
      </Card>
    );
  }
  if (status === 'loading') return null;
  if (status === 'signed-out') {
    return (
      <Card style={{ gap: spacing.md }}>
        {intro('Add friends and cheer each other on. Sign in with your Stanford email to get started.')}
        <Button label="Sign in to add friends" onPress={() => router.push('/auth/sign-in')} />
      </Card>
    );
  }
  if (!displayName) {
    return (
      <Card style={{ gap: spacing.md }}>
        {intro('Add your name so friends know who you are.')}
        <Button label="Add your name" onPress={() => router.push('/auth/profile')} />
      </Card>
    );
  }

  const requests =
    incoming.length > 0 ? (
      <Text accessibilityRole="button" onPress={() => router.push('/friends')} style={styles.requests}>
        {incoming.length === 1 ? '1 friend request' : `${incoming.length} friend requests`} →
      </Text>
    ) : null;

  if (loaded && friends.length === 0) {
    return (
      <Card style={{ gap: spacing.md }}>
        {requests}
        {intro('Share your friend code or add someone by their Stanford email.')}
        <Button label="Add friends" onPress={() => router.push('/friends/add')} />
      </Card>
    );
  }

  // Closest to (or past) their goal first, so the list feels lively.
  const shown = [...friends]
    .sort((a, b) => (b.today_cups ?? 0) / (b.today_goal || 8) - (a.today_cups ?? 0) / (a.today_goal || 8))
    .slice(0, MAX_SHOWN);

  return (
    <Card style={{ gap: spacing.sm }}>
      {requests}
      {shown.map((f) => (
        <FriendMini key={f.user_id} row={f} />
      ))}
      <View style={styles.footer}>
        <Text accessibilityRole="button" onPress={() => router.push('/friends')} style={styles.link}>
          {friends.length > MAX_SHOWN ? `See all ${friends.length} friends` : 'See all'}
        </Text>
        <Text accessibilityRole="button" onPress={() => router.push('/friends/add')} style={styles.link}>
          + Add
        </Text>
      </View>
    </Card>
  );
}

function FriendMini({ row }: { row: FriendRow }) {
  const styles = useStyles();
  const { type } = useTheme();
  const cups = row.today_cups ?? 0;
  const goal = row.today_goal ?? 8;
  const met = cups >= goal;
  const name = row.display_name ?? 'Friend';
  return (
    <Pressable
      onPress={() => router.push('/friends')}
      accessibilityLabel={`${name}: ${cups} of ${goal} cups today, ${row.streak ?? 0} day streak`}
      style={styles.row}
    >
      <ProgressRing progress={cups / goal} size={36} stroke={5}>
        <Text style={styles.ringText}>{met ? '✓' : cups}</Text>
      </ProgressRing>
      <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[type.caption, met && styles.met]}>
        {cups}/{goal} cups
      </Text>
      {row.streak ? <Text style={styles.streak}>🔥 {row.streak}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    intro: { lineHeight: 22 },
    requests: { color: colors.primaryText, fontWeight: '700', fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
    ringText: { fontSize: 13, fontWeight: '700', color: colors.text },
    met: { color: colors.success, fontWeight: '600' },
    streak: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 40, textAlign: 'right' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
    link: { color: colors.primaryText, fontWeight: '600', fontSize: 15, padding: spacing.xs },
  }),
);
