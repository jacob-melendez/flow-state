import { Linking, Text, View } from 'react-native';

import { APP_STORE_URL, PLAY_STORE_URL } from '../config';
import { Button, Card } from './components';
import { spacing, useTheme } from './theme';

/** Shown on the website where the phone apps would show reminder settings. */
export function GetTheAppCard() {
  const { type } = useTheme();
  const appStore = APP_STORE_URL;
  const playStore = PLAY_STORE_URL;
  const hasLinks = appStore || playStore;
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
    </Card>
  );
}
