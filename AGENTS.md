This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) in `src/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project (Flow State)

- Hydration reminder app for Stanford students (SENSA Impact Labs). Offline-first: the app must work fully without an account or a configured backend (no `EXPO_PUBLIC_SUPABASE_*` env vars → `supabase` is `null`).
- Optional accounts/backup use Supabase (`src/cloud/`). Keep merge rules pure in `src/cloud/merge.ts` and test sync changes against the fake server in `src/cloud/__tests__/cloudSync.test.ts`. Never upload reminder settings or water-calculator answers.
- Friends rules live only in the database functions in `supabase/migrations/20261111000000_friends.sql`; the app never writes `friendships` directly. Friends may see only display name, today's cups/goal and streak (incoming requests also show email). Keep `current_streak` (SQL) and `currentStreak` (`src/domain/streaks.ts`) in sync.
- Anonymous impact stats (`src/cloud/impact.ts`, `src/domain/impact.ts`) must stay unlinkable: send only through `anonymousClient` (never the signed-in client), only the fields in `report_usage`, and only when `shareImpactStats` is on. Update `PRIVACY.md` whenever data collection changes.
- Design: use theme tokens only (`useTheme()` / `makeStyles` from `src/ui/theme.ts`), never raw colors. Cardinal (`primary`/`primaryText`) is for brand and actions; `water` is for water visuals. Every new text/background pairing must be added to `src/ui/__tests__/theme.test.ts` (WCAG AA). Support light and dark.
- Stanford brand rules: only official Block S artwork (via `src/ui/brandAssets.ts`), never redrawn, recolored, stretched or combined with another logo (keep it separate from SENSA's logo); never the seal; no Stanford logo in the app icon. Make clear Flow State is a SENSA student-organization project. SENSA's logo is `src/ui/SensaLogo.tsx`. Regenerate icons with `node scripts/render-icons.mjs`.
- Database changes go in a NEW file in `supabase/migrations/` (never edit one that may have run) with tests in `supabase/tests/` (`npm run test:db`). Every table needs row-level security.
- Reminder scheduling logic is the pure function `buildSchedule` in `src/scheduling/buildSchedule.ts`. Keep OS calls in `src/notifications/adapter.ts` and orchestration in `src/sync.ts`.
- iOS allows at most 64 pending local notifications. The budget is `MAX_DAILY_SLOTS` (58, in `src/config.ts`) reminders + 2 check-ins + 1 test reminder + spare. Don't add notifications without accounting for it.
- Pace, hydration-safety and quiet-time rules are pure functions in `src/domain/pace.ts`, `src/domain/hydrationSafety.ts` and `src/domain/today.ts`, with tests. Conditional notifications work by rescheduling when today's cups change (`bindStoreSync`), never by background code at reminder time. Safety thresholds are defaults for the health team; keep the copy "not medical advice".
- Run `npm test` (runs in America/Los_Angeles so daylight-saving cases are real), `npm run test:db`, `npm run typecheck` and `npm run lint` before finishing.
