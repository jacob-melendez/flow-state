# Flow State on Android

Flow State runs on Android from the same code as iOS. This page covers testing on Android and, later, publishing to Google Play.

## Try it on an Android phone (quickest)

1. Install **Expo Go** from the Google Play Store.
2. On your computer, in the project folder, run:

   ```bash
   npx expo start
   ```

3. In Expo Go, tap **Scan QR code** and scan the code in the terminal.
   - The phone and computer must be on the same Wi-Fi. On campus Wi-Fi, use `npx expo start --tunnel`.

Expo Go is enough to test reminders, logging, dark mode, sign-in and friends. It shows Expo Go's icon, not Flow State's.

## Install a real build without the Play Store (APK)

This gives testers the real app (Flow State icon, launch screen, notification icon). Builds run in the cloud with [EAS](https://expo.dev/eas); the free plan is enough.

1. Create a free Expo account, then sign in:

   ```bash
   npx eas-cli@latest login
   ```

2. Build an installable APK:

   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```

   The first run sets up the project and an Android signing key (let EAS manage it).
3. When it finishes (about 10–20 minutes), EAS gives a link and QR code. Open it on the Android phone and install the APK. Android may ask you to allow installs from your browser.

If you have a backend set up, put `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in the build's environment. Use `eas env:create`, or the project's *Environment variables* page on expo.dev, for the `preview` environment. `.env.local` isn't uploaded.

## Android emulator on a Mac (optional)

1. Install [Android Studio](https://developer.android.com/studio). Open **Device Manager** and create a phone emulator (e.g. Pixel, recent Android version).
2. Start the emulator, then press `a` in the `npx expo start` terminal. Expo Go installs and opens automatically.

## What to check on Android

- **Notification permission:** on Android 13+, the system asks during onboarding ("Allow notifications"). If you tap "Don't allow", Today shows a button to open Settings.
- **Reminders arrive:** use Settings → "Send a test reminder", then a 15-minute interval.
  - Android may hold reminders a few minutes when the phone is idle (Doze / battery saver). This is normal for non-alarm apps.
  - If reminders are very late, check Settings → Apps → Flow State → Battery and allow background activity.
- **Reminders after a restart:** turn the phone off and on. Reminders should continue (Android reschedules them after boot).
- **Action buttons:** expand a reminder and tap "I drank a cup" or "Snooze 1 hr".
- **Back button:**
  - in onboarding it goes to the previous step;
  - in the calculator, sign-in and Add friends it closes the screen.
- **Dark mode:** follows the phone's setting, unless changed in Settings → Appearance.
- **Keyboard:** text fields stay visible above the keyboard (calculator weight, sign-in, friend code).

## Publishing to Google Play (later)

1. **Developer account:** create a [Google Play Console](https://play.google.com/console) account ($25 one time). Organizations need a D-U-N-S number; an individual account works for a student project.
2. **Package name:** the app ID in `app.json` is `org.sensaimpactlabs.flowstate`. It's a placeholder: change it **before the first upload**, because Google never lets it change afterwards.
3. **Build:**

   ```bash
   npx eas-cli@latest build -p android --profile production
   ```

   This produces an `.aab` file for Play.
4. **Upload:** start with *Internal testing* in Play Console, then *Closed testing*.
   - New personal developer accounts must run a closed test with at least 12 testers for 14 days before going public.
   - `npx eas-cli@latest submit -p android` can upload for you.
5. **Store listing requirements:**
   - a **privacy policy URL** (host `PRIVACY.md`);
   - the **Data safety** form; answers are in `PRIVACY.md` → Appendix;
   - a content rating questionnaire;
   - target audience (18+ students, or 13+ if you expect younger users; not designed for children).

## Notes for developers

- **Permissions** (see `app.json` → `android.blockedPermissions`): Flow State uses only `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`. The template's storage and overlay permissions are blocked.
- **Notification look:** the status-bar icon is `assets/notification-icon.png` (white on transparent), with the accent color Cardinal `#8C1515` (`expo-notifications` plugin in `app.json`).
- **Regenerating icons:** run `node scripts/render-icons.mjs` after changing the icon artwork.
- **Exact alarms:** reminders use normal scheduled notifications, not exact alarms. Exact alarms would need the `SCHEDULE_EXACT_ALARM` permission, which Google restricts to alarm and calendar apps.
