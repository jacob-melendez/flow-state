# Flow State

SENSA Impact Labs Fall 2026, Health & Wellness Group (Stanford Flow State). This repository holds the Flow State app.

Flow State reminds Stanford students to drink water every **15 minutes, 30 minutes or 1 hour** during the hours they choose. Students can log cups toward a daily goal and build streaks.

The app works fully offline. Students can optionally **sign in with their Stanford email** to back up their water log and use it on more than one phone. Reminder settings and calculator answers never leave the phone. Version 1 (tag `v1.0.0`) was entirely on-device.

## Features

- **Interval reminders**: every 15 min, 30 min or 1 hour.
- **Active hours**: reminders only arrive within a daily window, e.g. 9:00 AM–9:00 PM. The window can cross midnight.
- **Log a drink**: a "+1 cup" button in the app, with undo. Each cup is 8 oz, and the default goal is 8 cups.
  - Notifications also have **"I drank a cup 💧"** and **"Snooze 1 hr"** buttons. To see them, press and hold a notification, or swipe it left and tap View. Test them in a development build; they may not appear in Expo Go.
- **Daily goal and streaks**: a progress ring, the current and best streaks, and a 7-day chart. The goal is recorded for each day, so changing it doesn't rewrite past streaks.
- **Water calculator**: suggests a daily goal from weight, sex, exercise, hot weather, and pregnancy/breastfeeding, with a breakdown and a one-tap "Set as my daily goal". Answers stay on the phone. To open it, tap "Not sure? Calculate my goal" (in onboarding or Settings → Goal). The method and all its numbers are documented at the top of `src/domain/waterCalculator.ts` so the health team can review them. It is an estimate, not medical advice.
- **Pause**: for 1 hour, 2 hours, or the rest of today. The Settings switch turns reminders off entirely.
- **Onboarding**: interval, then active hours, then goal, then the notification permission prompt.
- **Test reminder**: Settings → "Send a test reminder" fires one 10 seconds later.
- **Friends (with an account)**: add friends by friend code, an invite link, or their exact Stanford email. The Friends tab shows each friend's cups today vs their goal and their streak, plus requests to accept or decline. Friends see only your name, today's cups and your streak; incoming requests also show the sender's Stanford email. Students can remove or block anyone, and can turn off being found by email.
- **Accounts & backup (optional)**: sign in with a 6-digit code emailed to a `@stanford.edu` address. The water log and goal sync across phones, and Settings → Account offers sign out and delete account. This needs a Supabase project; see [docs/backend-setup.md](docs/backend-setup.md).

## Tech stack

- [Expo](https://expo.dev) SDK 58 and React Native, in TypeScript, with Expo Router for navigation.
- `expo-notifications` schedules **local** notifications on the phone. No push server is involved.
- `zustand` with AsyncStorage stores data on the device.
- [Supabase](https://supabase.com) (Postgres, sign-in, row-level security) provides the optional accounts and backup. With no Supabase settings, the app runs offline.
- Jest tests the app logic. The database rules are tested with `node --test` and [PGlite](https://pglite.dev), an in-process Postgres.

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
| `npm run test:db` | Database tests: runs `supabase/migrations` in an in-process Postgres and checks the security rules |

## How reminders are scheduled

iOS lets an app have at most **64 pending local notifications**. The app also can't run code at each reminder time, because iOS only wakes apps occasionally. The design works within those limits:

- **Each reminder time is a daily repeating notification.** Each time of day in the window (9:00, 9:15, …) is registered once as a `DAILY` trigger. iOS then delivers it every day, even if the student never opens the app again.
- **The window is capped at 61 times a day** (`MAX_DAILY_SLOTS`). At 15-minute intervals that's a 15-hour window, and the app explains this when it shortens one. At 30 minutes the window can be up to 23.5 hours; at 1 hour, up to 23 hours.
- **Pausing only affects the times inside the pause.** Each such time gets a one-time trigger at its first occurrence after the pause ends. All other times keep their daily triggers. When the app next opens (or the background task runs) after the pause, everything goes back to daily triggers. If the app is never reopened, only the paused times stop; the rest keep firing.
- **Sync** (`src/sync.ts`) runs at launch, when the app returns to the foreground, after any settings change, and in a best-effort background task. It compares the desired plan to what's scheduled and only reschedules when they differ.

All of these rules live in one pure function, `buildSchedule` in `src/scheduling/buildSchedule.ts`, which the unit tests cover.

## Accounts & sync

Accounts are optional and the app is **offline-first**: the phone's copy of the log is what the app always shows, and syncing happens in the background.

- **Setup:** create a Supabase project and follow [docs/backend-setup.md](docs/backend-setup.md). The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` from `.env.local` (copy `.env.example`). With them empty, there's no Account section and nothing is sent anywhere.
- **Sign-in:** students enter their Stanford email (or just their SUNet ID) and type the 6-digit code from their inbox. The database rejects any non-`@stanford.edu` sign-up, not just the app.
- **What syncs:** each cup (with its own ID and timestamps), the goal for each day, and the current goal. **What doesn't:** reminder times and pause state (per phone), and calculator answers.
- **How:** each change is marked "waiting to upload". A sync uploads those, then downloads anything changed on the server since the last download. When two phones edit the same thing, the newer change wins. The server enforces this too, so an out-of-date phone can't overwrite newer data. Undo marks a cup as deleted rather than erasing it, so the removal reaches other phones.
- **When:** after sign-in, when the app opens, about 2 seconds after logging a cup or changing the goal, and in the background task. Failed syncs keep everything and retry next time.
- **First sign-in** uploads everything already logged on the phone, including v1 data. If the phone holds a *different* account's log, the app asks before replacing it.
- **Friends:** all the rules live in database functions (`supabase/migrations/20261111000000_friends.sql`): requests, accepting, blocking, and a `get_friends` that returns only name, today's cups/goal and streak. Streaks are computed on the server with the same rules as the app, so friends never receive anyone's history. Students can't write to the friendships table directly. A "not found" reply looks the same whether the person doesn't exist, has turned off email search, or blocked you.
- **Code:** pure merge rules in `src/cloud/merge.ts`; the sync steps in `src/cloud/cloudSync.ts` (tested against a fake server in `src/cloud/__tests__/`); sign-in and scheduling in `src/cloud/account.ts`; database schema and rules in `supabase/migrations/`.

## Project layout

```
app/                         Screens (Expo Router)
  _layout.tsx                Startup: load data, notification setup, sync on foreground
  onboarding.tsx             First-run setup
  (tabs)/index.tsx           Today: progress ring, +1 cup, reminders, streaks, 7-day chart
  (tabs)/friends.tsx         Friends: requests, friends' progress, pending requests
  (tabs)/settings.tsx        Account, reminder settings, goal, pause, test reminder, about
  friends/add.tsx            Add friends: your code + share, add by code or email
  add-friend/[code].tsx      Invite links (flowstate://add-friend/CODE)
  calculator.tsx             Water calculator (modal)
  auth/                      Sign-in: email → 6-digit code → display name
src/
  cloud/                     Supabase client, sign-in, sync engine, merge rules (+ tests)
  config.ts                  Product constants (names, defaults, limits)
  domain/                    Pure logic: time helpers, streaks, water calculator
  scheduling/                Pure reminder scheduler (+ tests)
  notifications/             expo-notifications adapter, reminder copy
  state/                     On-device stores (settings, drink log, permission)
  sync.ts                    Settings → schedule → OS; notification action handling
  background.ts              Best-effort background re-sync
  ui/                        Theme and shared components
supabase/
  migrations/                Database tables, security rules (run once per Supabase project)
  tests/                     Database tests (npm run test:db)
docs/backend-setup.md        Step-by-step Supabase setup
```

## Coming next

- Push "nudges" between friends (needs server push and a paid Apple Developer account).
- **Anonymous impact stats** for SENSA's reports (opt-out, no account link).
- Privacy policy and the 2.0.0 release.

## Things to check on a real device

- **Notification buttons when the app is fully closed.** Tapping "I drank a cup" or "Snooze 1 hr" opens the app, because iOS only reliably passes the tap to a closed app if the app opens. To try silent buttons, set `ACTIONS_OPEN_APP = false` in `src/config.ts`. Those taps then work while the app is in the background, but are lost if the app was swiped away.
- **Reminders while the phone is in a Focus mode or Do Not Disturb.** iOS may hold them back. This is expected behaviour.
