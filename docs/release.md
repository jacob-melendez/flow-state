# Releasing Flow State: website, App Store and Google Play

One checklist from "works in Expo Go" to "students can download it". Each part links to the detailed guide where one exists. Do the parts in order; the website and the two stores can then run in parallel.

## 0. Decide these first

Some of these can never be changed later, so settle them before building anything for a store.

1. **App ID (permanent).** `app.json` uses the placeholder `org.sensaimpactlabs.flowstate` for both `ios.bundleIdentifier` and `android.package`. Apple and Google lock it in at the first upload. Use a reversed domain the team controls, e.g. `org.yourdomain.flowstate`.
2. **Who publishes (the "seller").**
   - **Apple Developer Program:** $99 a year. Enrolling as an *organization* needs a legal entity and a D-U-N-S number; a student group usually isn't its own legal entity, so check with SENSA (and whether Stanford or SENSA already has an account). Enrolling as an *individual* works, but that person's name appears as the seller on the App Store.
   - **Google Play Console:** $25 once. A *personal* account created today must run a closed test with at least 12 testers for 14 days in a row before it can publish to everyone. An *organization* account skips that but needs a D-U-N-S number.
3. **Email domain.** Sign-in codes must come from a real sending domain (Resend or similar), not personal Gmail. See [backend-setup.md](backend-setup.md) step 4. The same domain can host the privacy policy and support page.
4. **Privacy policy URL.** Fill in the placeholders in [PRIVACY.md](../PRIVACY.md) and publish it at a public URL. Both stores require it, and the app shows it once `PRIVACY_POLICY_URL` is set in `src/config.ts`.
5. **Support contact.** An email or page for the store listings, e.g. a SENSA address.
6. **How app reviewers sign in.** Apple asks for a working demo login for any feature behind sign-in, and our sign-in is a code emailed to a Stanford address that reviewers can't read. Options:
   - say in the review notes that accounts are optional, everything except backup and friends works without one, and sign-in is limited to Stanford students; or
   - add a reviewer-only sign-in (not built yet; needs a small app and backend change).

## 1. Production backend

Follow [backend-setup.md](backend-setup.md) for the project you'll launch with:
1. Run the three files in `supabase/migrations/` in order.
2. Set up the sending domain and SMTP, then the **Magic link or OTP** and **Confirm signup** templates with `{{ .Token }}`.
3. Raise **Authentication → Rate Limits → emails per hour**.
4. Add the app's settings to EAS so cloud builds include them (`.env.local` is never uploaded): on expo.dev → your project → **Environment variables**, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the publishable key) for **Preview** and **Production**, visibility *Plain text*.

## 2. Website

Details: [deploy-web.md](deploy-web.md).

1. Put the production values in `.env.local` (the website is built on your computer).
2. Build and deploy:

   ```bash
   npx eas-cli@latest login
   ```

   ```bash
   npm run build:web
   ```

   ```bash
   npx eas-cli@latest deploy --prod
   ```

3. Set `WEB_URL` in `src/config.ts` to the site's address, optionally add a custom domain on expo.dev, then build and deploy again.

## 3. iPhone: App Store

1. **Enroll** in the Apple Developer Program (allow a few days for approval).
2. **Link the project to EAS** once (it adds the project ID to `app.json`; commit that change):

   ```bash
   npx eas-cli@latest init
   ```

3. **Build** (EAS creates and stores the signing certificates for you):

   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

4. **Upload** to App Store Connect (it creates the app record if needed):

   ```bash
   npx eas-cli@latest submit --platform ios
   ```

5. **TestFlight:** add the team as internal testers right away. External testers (e.g. a pilot group of students) need a short beta review first.
6. **Store listing** in App Store Connect:
   - name, subtitle, description, keywords, support URL, privacy policy URL;
   - screenshots for the 6.9-inch iPhone size (iPad isn't needed; the app is iPhone-only);
   - **App Privacy** answers: copy them from the appendix of [PRIVACY.md](../PRIVACY.md);
   - age rating questionnaire;
   - review notes: Flow State is a SENSA student-organization project with Stanford trademark approval; water amounts are general guidance, not medical advice; accounts are optional (see decision 6).
7. **Submit for review.** Reviews usually take a day or two. Choose manual or automatic release.

## 4. Android: Google Play

Details: [android.md](android.md).

1. **Create** a Play Console account and a new app.
2. **Build** an `.aab`:

   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```

3. **Upload** to *Internal testing* first. The first upload must be done by hand in Play Console; after that, EAS can do it:

   ```bash
   npx eas-cli@latest submit --platform android
   ```

4. **Closed testing:** on a personal account, at least 12 testers opted in for 14 days in a row before you can apply for production.
5. **Store listing and forms:** description, screenshots, feature graphic (1024×500), privacy policy URL, **Data safety** (answers in the [PRIVACY.md](../PRIVACY.md) appendix), content rating, target audience (not for children), and an **account deletion** web link: Google requires a web page explaining how to delete an account, in addition to the app's own "Delete account" button.
6. **Production:** apply for production access, then roll out (a staged rollout, e.g. 20% first, is a good habit).

## 5. After launch

1. Set `APP_STORE_URL` and `PLAY_STORE_URL` in `src/config.ts`, so the website links to the apps; rebuild and redeploy the website.
2. **Updates:**
   - JavaScript-only changes (most fixes): ship over the air with `npx eas-cli@latest update`, no store review needed. (This needs `expo-updates` set up the first time.)
   - Changes that add native code or packages, or change `app.json` permissions: bump `version` in `app.json` and `package.json`, then build and submit again. Store build numbers increase automatically (`autoIncrement` in `eas.json`).
3. Switch the Supabase SMTP sender from any personal account to the real domain before inviting students, if you haven't already.
