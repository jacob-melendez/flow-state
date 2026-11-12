import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Importing this module also defines the background task, which must happen at startup.
import { registerBackgroundSync } from '../src/background';
import { requestCloudSync, startCloud } from '../src/cloud/account';
import { reportImpactStats } from '../src/cloud/impact';
import { configureNotifications } from '../src/notifications/adapter';
import { useHydrated } from '../src/state/hydration';
import { usePermission } from '../src/state/permissionStore';
import { bindStoreSync, handleNotificationResponse, syncReminders } from '../src/sync';
import { useTheme } from '../src/ui/theme';
import { LaunchScreen } from '../src/ui/LaunchScreen';
import { ThemeProvider } from '../src/ui/ThemeProvider';

// Keep the native splash up until the branded launch screen takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { colors, scheme } = useTheme();
  const hydrated = useHydrated();
  const [launchDone, setLaunchDone] = useState(false);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primaryText,
        background: colors.background,
        card: colors.chrome,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  useEffect(() => {
    // Notification action buttons only exist on iOS/Android.
    const native = Platform.OS !== 'web';
    const responseSub = native
      ? Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)
      : null;

    startCloud();
    reportImpactStats();

    (async () => {
      // Reminders exist only in the phone apps (the website is a companion).
      if (!native) return;
      await configureNotifications();
      bindStoreSync();
      // An action tapped while the app was closed is delivered here on launch.
      const last = native ? await Notifications.getLastNotificationResponseAsync() : null;
      if (last) await handleNotificationResponse(last);
      await usePermission.getState().refresh();
      await syncReminders();
      await registerBackgroundSync();
    })();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (native) {
          usePermission.getState().refresh();
          syncReminders();
        }
        requestCloudSync();
        reportImpactStats();
      }
    });

    return () => {
      responseSub?.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {hydrated ? <AppStack /> : <View style={{ flex: 1, backgroundColor: colors.background }} />}
      {launchDone ? null : <LaunchScreen ready={hydrated} onDone={finishLaunch} />}
    </NavigationThemeProvider>
  );
}

function AppStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="friends/add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
