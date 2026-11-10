# Flow State website

The website is the same app running in a browser, as a **companion** to the phone apps. Students can:
- log cups and see the water buddy, streaks and 7-day chart;
- use the water calculator;
- sign in with their Stanford email;
- sync with their phone;
- manage friends.

**Reminders only exist in the iPhone/Android apps**, because phones schedule them themselves. On the website, the reminder settings are replaced by a card pointing to the apps.

## Build

```bash
npm run build:web
```

This runs `expo export --platform web --clear` and writes a static site to `dist/`. It's a single-page app (`index.html` plus JavaScript), so any static host works.

- **Supabase settings:** put `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in `.env.local` *before* building; they're baked into the site. They're public by design; row-level security protects the data. Without them, the site works offline-only in the browser.
- **Why `--clear`:** it makes sure the build picks up the current version and settings from `app.json`.

## Host it

### Option A: EAS Hosting (recommended)

Free tier, made for Expo apps, with HTTPS included.

```bash
npx eas-cli@latest login
```

```bash
npm run build:web
```

```bash
npx eas-cli@latest deploy --prod
```

The first deploy asks you to pick a subdomain, e.g. `flowstate.expo.app`. You can add a custom domain later in the expo.dev dashboard.

### Option B: Netlify or Vercel

Upload or connect the repo with:
- **build command:** `npm run build:web`;
- **output folder:** `dist`.

Because it's a single-page app, every path must serve `index.html`:
- **Netlify:** add a file `public/_redirects` containing `/*  /index.html  200` (Expo copies `public/` into `dist/`).
- **Vercel:** add `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

## After the first deploy

1. Put the site's address in `src/config.ts` → `WEB_URL`, e.g. `"https://flowstate.expo.app"`. Friend invites then include a link like `https://flowstate.expo.app/add-friend/K7MNP2Q9`, which opens the Add friends screen with the code filled in, for anyone, with or without the app.
2. Once the apps are published, set `APP_STORE_URL` and `PLAY_STORE_URL` in `src/config.ts`, so the website's "Reminders live on your phone" card links to them.
3. Rebuild and redeploy.

## Things to know

- **Data lives in that browser** (local storage) until the student signs in. Signing in syncs it with their account, the same as on a phone. Clearing browser data or using a private window starts fresh.
- **Anonymous impact stats** from the website are reported with platform `web`, and the same Settings → Privacy switch controls them.
- **Light/dark mode** follows the computer's setting unless changed in Settings → Appearance.
- **Sign-in** uses the same 6-digit email code. No extra Supabase setup is needed for the website, since codes don't use redirect links.
