import { APP_STORE_URL, PLAY_STORE_URL } from '../config';
import { isWeb } from '../platform';
import { Banner } from './components';

/** Website-only note that the phone apps aren't out yet (hidden once store links are set). */
export function ComingSoonBanner() {
  if (!isWeb || APP_STORE_URL || PLAY_STORE_URL) return null;
  return (
    <Banner tone="info">
      Flow State for iPhone and Android is coming soon. Reminders will live in the app; this website tracks your water
      and friends.
    </Banner>
  );
}
