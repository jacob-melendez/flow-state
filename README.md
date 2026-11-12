# Flow State

SENSA Impact Labs Fall 2026, Health & Wellness Group (Stanford Flow State). This repository holds the Flow State app.

Flow State reminds Stanford students to drink water every **15 minutes, 30 minutes or 1 hour** during the hours they choose. Students can log cups toward a daily goal, watch their water buddy fill up, and build streaks with friends.

It runs on **iPhone, Android and the web**. The website is a companion without reminders; see [docs/deploy-web.md](docs/deploy-web.md).

The app works fully offline. Students can optionally **sign in with their Stanford email** to back up their water log and use it on more than one phone. Reminder settings and calculator answers never leave the phone. Version 1 (tag `v1.0.0`) was entirely on-device.

## Features

- **Interval reminders**: every 15 min, 30 min or 1 hour.
- **Active hours**: reminders only arrive within a daily window, e.g. 9:00 AM–9:00 PM. The window can cross midnight.
- **Log a drink**: a "+1 cup" button in the app, with undo. Each cup is 8 oz, and the default goal is 8 cups.
  - Notifications also have **"I drank a cup 💧"** and **"Snooze 1 hr"** buttons. To see them, press and hold a notification, or swipe it left and tap View. Test them in a development build; they may not appear in Expo Go.
- **Water buddy**: a droplet character in the Today ring. It grows, fills with water and gets happier with each cup, from thirsty to thrilled with sparkles at the goal.
- **Light and dark mode**: follows the device by default; Settings → Appearance can force Light or Dark. The design uses Stanford Cardinal for actions and Stanford teal for water.
- **Branding**: a launch screen with Flow State and SENSA's logo, and an About section that names Flow State as a SENSA student-organization project. See *Design and brand rules* below.
- **Daily goal and streaks**: a progress ring, the current and best streaks, and a 7-day chart. The goal is recorded for each day, so changing it doesn't rewrite past streaks.
- **Water calculator**: suggests a daily goal from weight, sex, exercise, hot weather, and pregnancy/breastfeeding, with a breakdown and a one-tap "Set as my daily goal". Answers stay on the phone. To open it, tap "Not sure? Calculate my goal" (in onboarding or Settings → Goal). The method and all its numbers are documented at the top of `src/domain/waterCalculator.ts` so the health team can review them. It is an estimate, not medical advice.
- **Pause**: for 1 hour, 2 hours, or the rest of today. The Settings switch turns reminders off entirely.
- **Onboarding**: interval, then active hours, then goal, then the notification permission prompt. On the website: welcome, then goal.
- **Test reminder**: Settings → "Send a test reminder" fires one 10 seconds later.
- **Friends (with an account)**: add friends by friend code, an invite link, or their exact Stanford email. The Friends tab shows each friend's cups today vs their goal and their streak, plus requests to accept or decline. Friends see only your name, today's cups and your streak; incoming requests also show the sender's Stanford email. Students can remove or block anyone, and can turn off being found by email.
- **Anonymous impact stats (optional, on by default)**: daily cup totals with a random ID, never linked to an account, for SENSA's impact reports. Students can turn it off in Settings → Privacy.
- **Accounts & backup (optional)**: sign in with a 6-digit code emailed to a `@stanford.edu` address. The water log and goal sync across phones, and Settings → Account offers sign out and delete account. This needs a Supabase project; see [docs/backend-setup.md](docs/backend-setup.md).

## Tech stack

- [Expo](https://expo.dev) SDK 58 and React Native, in TypeScript, with Expo Router for navigation.
- `expo-notifications` schedules **local** notifications on the phone. No push server is involved.
- `zustand` with AsyncStorage stores data on the device.
- [Supabase](https://supabase.com) (Postgres, sign-in, row-level security) provides the optional accounts and backup. With no Supabase settings, the app runs offline.
- Jest tests the app logic. The database rules are tested with `node --test` and [PGlite](https://pglite.dev), an in-process Postgres.

One codebase covers iOS, Android and web. Phones schedule reminders themselves; the website has everything except reminders. See [docs/android.md](docs/android.md) and [docs/deploy-web.md](docs/deploy-web.md).

## Getting started

### Prerequisites

- Node.js 20 or newer.
- An iPhone or Android phone with the **Expo Go** app (App Store / Google Play). This is the quickest way to try the app.
- To install a real build on an iPhone you need a Mac with Xcode (a free Apple ID is enough). Android builds need no Mac; see [docs/android.md](docs/android.md). See *Running on your iPhone without Expo Go* below.

### Run with Expo Go (quickest)

```bash
npm install
```

```bash
npx expo start
```

Scan the QR code (iPhone: the Camera app; Android: the Expo Go app) to open the project in Expo Go. The phone and the computer must be on the same Wi-Fi network. If they can't connect, for example on campus Wi-Fi, run `npx expo start --tunnel`.

Expo Go is fine for trying the UI, scheduled reminders, logging and pausing. Test notification **action buttons** and the background refresh in a development build, described next. Expo Go may not support them.

### Turn on accounts and friends (`.env.local`)

Sign-in, backup and friends need the app to know your Supabase project. Without that, the Friends tab and Settings → Account explain that accounts aren't available, and everything else works offline.

1. **Get your two values from Supabase.** In the [Supabase dashboard](https://supabase.com/dashboard), open your project, then **Project Settings → API**, or click **Connect** at the top. Copy:
   - the **Project URL**, like `https://abcdefghijklmnop.supabase.co`;
   - the **publishable key**, starting with `sb_publishable_` (older projects call it the **anon public** key). Never use the *secret* / *service_role* key.
2. **Create the file.** In Terminal, go to the project folder (the one containing `package.json`) and copy the template:

   ```bash
   cp .env.example .env.local
   ```

3. **Fill it in.** Open it in a text editor:

   ```bash
   open -e .env.local
   ```

   (or `code .env.local` in VS Code). Paste your values after the `=` signs, with no quotes or spaces, then save:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxxxxxx
   ```

   In Finder, files starting with a dot are hidden; press **Cmd+Shift+.** to show them.
4. **Restart the dev server** (stop it with Ctrl+C) with a cleared cache, so the app picks up the new values:

   ```bash
   npx expo start --clear
   ```

5. **Check it worked:** Settings → Account shows **Sign in**, and the Friends tab and Today's Friends card offer to sign in.
6. **Set up the database and email codes:** follow [docs/backend-setup.md](docs/backend-setup.md) from step 2. That covers running the SQL files, the email templates, and an email sender.

`.env.local` is ignored by git, so each teammate creates their own. For EAS builds, add the same two values as EAS environment variables; see [docs/android.md](docs/android.md).

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

**Android:** see [docs/android.md](docs/android.md) to install a real APK without the Play Store (`npx eas-cli@latest build -p android --profile preview`).

**Website:** `npx expo start --web` runs it locally. `npm run build:web` builds it for hosting; see [docs/deploy-web.md](docs/deploy-web.md).

### Later: TestFlight and the App Store

Once the team has an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/yr):

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios
```

`eas.json` already has `preview` and `production` profiles, and EAS handles signing. The bundle identifier in `app.json` (`org.sensaimpactlabs.flowstate`) is a **placeholder**. Change it to a domain the team controls before the first App Store build, because it can't be changed afterwards.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm test` | Run unit tests (in `America/Los_Angeles`, so daylight-saving cases are real) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Expo config) |
| `npm run build:web` | Build the website into `dist/` |
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
  _layout.tsx                Startup: theme, launch screen, notification setup, sync on foreground
  onboarding.tsx             First-run setup
  (tabs)/index.tsx           Today: water buddy, +1 cup, reminders, streaks, 7-day chart
  (tabs)/friends.tsx         Friends: requests, friends' progress, pending requests
  (tabs)/settings.tsx        Account, appearance, reminder settings, goal, privacy, about
  friends/add.tsx            Add friends: your code + share, add by code or email
  add-friend/[code].tsx      Invite links (flowstate://add-friend/CODE)
  calculator.tsx             Water calculator (modal)
  auth/                      Sign-in: email → 6-digit code → display name
src/
  cloud/                     Supabase client, sign-in, sync engine, merge rules (+ tests)
  config.ts                  Product constants (names, defaults, limits)
  domain/                    Pure logic: time helpers, streaks, water calculator, water buddy, impact days
  scheduling/                Pure reminder scheduler (+ tests)
  notifications/             expo-notifications adapter, reminder copy
  state/                     On-device stores (settings, drink log, permission)
  sync.ts                    Settings → schedule → OS; notification action handling
  background.ts              Best-effort background re-sync
  platform.ts                What each platform supports (no reminders on web)
  ui/                        Theme (light/dark), shared components, water buddy, SENSA logo, launch screen
supabase/
  migrations/                Database tables, security rules (run once per Supabase project)
  tests/                     Database tests (npm run test:db)
docs/backend-setup.md        Step-by-step Supabase setup, and how to view impact stats
docs/android.md              Testing on Android, APK builds, Google Play
docs/deploy-web.md           Building and hosting the website
scripts/render-icons.mjs     Regenerates the app icons from the water-buddy artwork
PRIVACY.md                   Draft privacy policy + App Store privacy answers
```

## Privacy

- **[PRIVACY.md](PRIVACY.md):** a draft privacy policy matching how 3.0.0 works, plus the App Store "App Privacy" and Google Play "Data safety" answers. Review it, fill in the placeholders, host it publicly, and set `PRIVACY_POLICY_URL` in `src/config.ts` to show it in Settings.
- **Anonymous impact stats (opt-out):** with a backend configured, the app sends, once a day, each recent completed day's cup count and whether the goal was met. It uses a random install ID and never the student's login (`src/cloud/impact.ts`).
  - The switch is Settings → Privacy, and it's disclosed in onboarding.
  - To make it opt-in instead (e.g. if an IRB requires it), set `IMPACT_STATS_DEFAULT = false` in `src/config.ts`.
  - The team views the results in the Supabase dashboard; see [docs/backend-setup.md](docs/backend-setup.md#viewing-impact-stats).

## Design and brand rules

- **Colors:** everything uses the theme in `src/ui/theme.ts`, with a light and a dark palette.
  - Stanford Cardinal Red (`#8C1515`) for buttons and links; a lighter Cardinal-family red in dark mode so it stays visible.
  - Stanford Lagunita teal for water visuals.
  - Stanford neutrals for backgrounds and text.
  - `src/ui/__tests__/theme.test.ts` checks every text/background pair against WCAG AA contrast.
- **Stanford name and logo:** SENSA is approved by Stanford Trademarks. Within that approval:
  - Use only official **Block S with tree** artwork, never the seal. Don't redraw, recolor, stretch, outline or add effects.
  - **Never combine it with another logo**: keep it separate from SENSA's logo, with clear space.
  - Don't put Stanford logos in the app icon.
  - Always make clear Flow State is a SENSA student-organization project.
  - To show the Block S in About, add the approved files to `assets/brand/` and enable them in `src/ui/brandAssets.ts`.
  - Questions on scope go to trademark_use@stanford.edu or DesignIdentity@stanford.edu.
- **SENSA's logo:** `src/ui/SensaLogo.tsx` is redrawn as a vector from SENSA's logo image. Swap in official artwork if SENSA has it.
- **App icon:** the water buddy on Cardinal, generated by `node scripts/render-icons.mjs`.

## Coming next

- Push "nudges" between friends (needs server push and a paid Apple Developer account).

## Things to check on a real device

- **Notification buttons when the app is fully closed.** Tapping "I drank a cup" or "Snooze 1 hr" opens the app, because iOS only reliably passes the tap to a closed app if the app opens. To try silent buttons, set `ACTIONS_OPEN_APP = false` in `src/config.ts`. Those taps then work while the app is in the background, but are lost if the app was swiped away.
- **Reminders while the phone is in a Focus mode or Do Not Disturb.** iOS may hold them back. This is expected behaviour.
- **Android:** see the checklist in [docs/android.md](docs/android.md#what-to-check-on-android): permission prompt, back button, reminders after a restart, and battery saver delays.
