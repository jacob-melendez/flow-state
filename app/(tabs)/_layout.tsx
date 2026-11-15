import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Tabs } from 'expo-router/js-tabs';

import { takeWebInviteCode } from '../../src/cloud/friendCode';
import { useSettings } from '../../src/state/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  // Website invite links (https://…/?add=CODE) open Add friends first, even
  // before onboarding, so people scanning a friend's QR can add them right away.
  const [inviteCode] = useState(takeWebInviteCode);
  if (inviteCode) return <Redirect href={{ pathname: '/friends/add', params: { code: inviteCode } }} />;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.chrome, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
