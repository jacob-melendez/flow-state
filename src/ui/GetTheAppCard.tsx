import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { APP_STORE_URL, PLAY_STORE_URL } from '../config';
import { WebTestResult, sendWebTestNotification, webNotificationSupport } from '../notifications/webTest';
import { Banner, Button, Card } from './components';
import { spacing, useTheme } from './theme';

const TEST_DELAY_SECONDS = 5;

const RESULT_TEXT: Record<Exclude<WebTestResult, 'sent'>, string> = {
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.',
  'needs-home-screen':
    'On iPhone, website notifications only work after adding the site to your Home Screen. Reminders will come with the Flow State app.',
  unsupported: 'This browser can’t show notifications. Try Chrome, Safari or Firefox on a computer, or Chrome on Android.',
  error: 'Couldn’t show the notification. Try again, or check your browser’s notification settings.',
};

/** Shown on the website where the phone apps would show reminder settings. */
export function GetTheAppCard({ showTestNotification = false }: { showTestNotification?: boolean }) {
  const { type } = useTheme();
  const appStore = APP_STORE_URL;
  const playStore = PLAY_STORE_URL;
  const hasLinks = appStore || playStore;
  const [status, setStatus] = useState<'idle' | 'waiting' | WebTestResult>('idle');

  const sendTest = async () => {
    setStatus('waiting');
    setStatus(await sendWebTestNotification(TEST_DELAY_SECONDS));
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={type.heading}>Reminders live on your phone</Text>
      <Text style={[type.body, { lineHeight: 22 }]}>
        Water reminders are sent by the Flow State app on iPhone and Android. Sign in with the same Stanford email on
        both, and your cups, goal and friends stay in sync.
      </Text>
      {hasLinks ? (
        <View style={{ gap: spacing.sm }}>
          {appStore ? <Button label="Get it on the App Store" onPress={() => Linking.openURL(appStore)} /> : null}
          {playStore ? (
            <Button variant="secondary" label="Get it on Google Play" onPress={() => Linking.openURL(playStore)} />
          ) : null}
        </View>
      ) : (
        <Text style={type.caption}>The iPhone and Android apps are coming soon.</Text>
      )}
      {showTestNotification ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            variant="secondary"
            label={status === 'waiting' ? `Arriving in ${TEST_DELAY_SECONDS} seconds…` : 'Send a test notification'}
            onPress={sendTest}
            disabled={status === 'waiting'}
          />
          {status === 'sent' ? (
            <Banner tone="success">Sent! This is what a reminder looks like.</Banner>
          ) : status !== 'idle' && status !== 'waiting' ? (
            <Banner tone="warning">{RESULT_TEXT[status]}</Banner>
          ) : (
            <Text style={type.caption}>
              {webNotificationSupport() === 'needs-home-screen'
                ? RESULT_TEXT['needs-home-screen']
                : 'Shows a preview of a reminder in this browser. Scheduled reminders need the app.'}
            </Text>
          )}
        </View>
      ) : null}
    </Card>
  );
}
