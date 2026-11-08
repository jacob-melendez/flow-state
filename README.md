# Flow State

SENSA Impact Labs Fall 2026, Health & Wellness Group (Stanford Flow State). This repository holds the Flow State app.

Flow State reminds Stanford students to drink water every **15 minutes, 30 minutes or 1 hour** during the hours they choose. Students can log cups toward a daily goal and build streaks.

**Version 1 is entirely on-device:** no accounts, no server, no analytics. Settings and the water log never leave the phone.

## Features (v1)

- **Interval reminders**: every 15 min, 30 min or 1 hour.
- **Active hours**: reminders only arrive within a daily window, e.g. 9:00 AM–9:00 PM. The window can cross midnight.
- **Log a drink**: a "+1 cup" button in the app, with undo. Each cup is 8 oz, and the default goal is 8 cups.
  - Notifications also have **"I drank a cup 💧"** and **"Snooze 1 hr"** buttons. To see them, press and hold a notification, or swipe it left and tap View. Test them in a development build; they may not appear in Expo Go.
- **Daily goal and streaks**: a progress ring, the current and best streaks, and a 7-day chart. The goal is recorded for each day, so changing it doesn't rewrite past streaks.
- **Pause**: for 1 hour, 2 hours, or the rest of today. The Settings switch turns reminders off entirely.
- **Onboarding**: interval, then active hours, then goal, then the notification permission prompt.
- **Test reminder**: Settings → "Send a test reminder" fires one 10 seconds later.

## Tech stack

- [Expo](https://expo.dev) SDK 58 and React Native, in TypeScript, with Expo Router for navigation.
- `expo-notifications` schedules **local** notifications on the phone. No push server is involved.
- `zustand` with AsyncStorage stores data on the device.
- Jest tests the scheduling and streak logic.

One codebase covers iOS, Android and web. iOS is the focus for v1; Android should mostly work as is. Web runs the app UI, but reminders don't work on web.

## Getting started

### Prerequisites

- Node.js 20 or newer.
- An iPhone with the **Expo Go** app from the App Store. This is the quickest way to try the app.
- To install a real build on your phone you also need a Mac with Xcode. A free Apple ID is enough. See *Running on your iPhone without Expo Go* below.

### Run with Expo Go (quickest)

```bash
npm install
```

```bash
npx expo start
```

Scan the QR code with the iPhone Camera app to open the project in Expo Go. The phone and the computer must be on the same Wi-Fi network. If they can't connect, for example on campus Wi-Fi, run `npx expo start --tunnel`.

Expo Go is fine for trying the UI, scheduled reminders, logging and pausing. Test notification **action buttons** and the background refresh in a development build, described next. Expo Go may not support them.

### Running on your iPhone without Expo Go (Mac + free Apple ID)

1. Install Xcode from the Mac App Store and open it once to accept the license.
2. In Xcode, go to Settings → Accounts and sign in with your Apple ID. This gives you a free "Personal Team".
3. Connect your iPhone with a cable. Turn on **Developer Mode** under Settings → Privacy & Security → Developer Mode.
4. Run:

   ```bash
   npx expo run:ios --device
   ```

   If Xcode reports a signing error, open the `.xcworkspace` file in the generated `ios/` folder, select your Personal Team under *Signing & Capabilities*, and run the command again.
5. The first time, trust the developer on the iPhone: Settings → General → VPN & Device Management.

Free Apple ID builds expire after 7 days; run the command again to reinstall. Remote push is turned off in `app.json` (`enableRemoteNotifications: false`). This lets a free account sign the app, and v1 doesn't use push anyway.

### Later: TestFlight and the App Store

Once the team has an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/yr):

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios
```

The first build creates `eas.json` and handles signing. The bundle identifier in `app.json` (`org.sensaimpactlabs.flowstate`) is a **placeholder**. Change it to a domain the team controls before the first App Store build, because it can't be changed afterwards.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm test` | Run unit tests (in `America/Los_Angeles`, so daylight-saving cases are real) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Expo config) |

## How reminders are scheduled

iOS lets an app have at most **64 pending local notifications**. The app also can't run code at each reminder time, because iOS only wakes apps occasionally. The design works within those limits:

- **Each reminder time is a daily repeating notification.** Each time of day in the window (9:00, 9:15, …) is registered once as a `DAILY` trigger. iOS then delivers it every day, even if the student never opens the app again.
- **The window is capped at 61 times a day** (`MAX_DAILY_SLOTS`). At 15-minute intervals that's a 15-hour window, and the app explains this when it shortens one. At 30 minutes the window can be up to 23.5 hours; at 1 hour, up to 23 hours.
- **Pausing only affects the times inside the pause.** Each such time gets a one-time trigger at its first occurrence after the pause ends. All other times keep their daily triggers. When the app next opens (or the background task runs) after the pause, everything goes back to daily triggers. If the app is never reopened, only the paused times stop; the rest keep firing.
- **Sync** (`src/sync.ts`) runs at launch, when the app returns to the foreground, after any settings change, and in a best-effort background task. It compares the desired plan to what's scheduled and only reschedules when they differ.

All of these rules live in one pure function, `buildSchedule` in `src/scheduling/buildSchedule.ts`, which the unit tests cover.

## Project layout

```
app/                         Screens (Expo Router)
  _layout.tsx                Startup: load data, notification setup, sync on foreground
  onboarding.tsx             First-run setup
  (tabs)/index.tsx           Today: progress ring, +1 cup, reminders, streaks, 7-day chart
  (tabs)/settings.tsx        Reminder settings, goal, pause, test reminder, about
src/
  config.ts                  Product constants (names, defaults, limits)
  domain/                    Pure logic: time helpers, streaks
  scheduling/                Pure reminder scheduler (+ tests)
  notifications/             expo-notifications adapter, reminder copy
  state/                     On-device stores (settings, drink log, permission)
  sync.ts                    Settings → schedule → OS; notification action handling
  background.ts              Best-effort background re-sync
  ui/                        Theme and shared components
```

## Ready for future versions

The team plans to add accounts and social features later, such as following friends' water intake. v1 is already shaped for that:

- **Sync-ready drink log:** each logged cup is stored with a UUID and a timestamp (`src/state/logStore.ts`), so logs can later be uploaded and merged.
- **Versioned storage:** stored data has a version number, so a `migrate` function can upgrade existing installs when accounts arrive.
- **Separate layers:** the pure domain and scheduling logic is kept apart from storage and UI. A future sync service can be added alongside it without a rewrite.

## Things to check on a real device

- **Notification buttons when the app is fully closed.** Tapping "I drank a cup" or "Snooze 1 hr" opens the app, because iOS only reliably passes the tap to a closed app if the app opens. To try silent buttons, set `ACTIONS_OPEN_APP = false` in `src/config.ts`. Those taps then work while the app is in the background, but are lost if the app was swiped away.
- **Reminders while the phone is in a Focus mode or Do Not Disturb.** iOS may hold them back. This is expected behaviour.
