# Demo day: Flow State on the website

For the pitch, the audience uses the **website**: they scan a QR code, sign in with their Stanford email and add you as a friend. The iPhone and Android apps are shown from Expo Go; the website says they're coming soon.

## 1. Deploy the website (about 15 minutes, on your Mac)

1. Get the latest code and its packages:

   ```bash
   git pull
   ```

   ```bash
   npm install
   ```

2. Check that `.env.local` has your Supabase **Project URL** and **publishable key**. They're built into the website.
3. Log in to Expo (create a free account at expo.dev if you don't have one):

   ```bash
   npx eas-cli@latest login
   ```

4. Build the website into `dist/`:

   ```bash
   npm run build:web
   ```

5. Deploy it:

   ```bash
   npx eas-cli@latest deploy --prod
   ```

   The first time, it asks to create or link an EAS project and to choose a name for the site's address. Pick something short like `flowstate`. If it asks whether to set the site up as a single-page app (rewrite all URLs to `/index.html`), answer **Yes**. At the end it prints the site's address, for example `https://flowstate.expo.app`.
6. Put that address in `src/config.ts` → `WEB_URL`. The website doesn't need it, but Expo Go on your phone uses it for its invite links and "Scan to add me" QR. Then build and deploy again (steps 4 and 5).
7. Make the QR code for your slide from the site's address, with any QR generator.

**Check the deploy:**
- Open the address on your phone and on your laptop.
- Open `<address>/settings` directly. If that shows an error page instead of Flow State, the host isn't sending every page to the app. Invite links still work, because they use `<address>/?add=CODE`, but you can also put the `dist/` folder on Netlify (drag it into app.netlify.com/drop), which uses the included `public/_redirects`.

**If `eas deploy` doesn't work:** use Netlify instead. Run `npm run build:web`, then drag the `dist/` folder into app.netlify.com/drop. You get an address straight away.

## 2. Supabase settings for a room full of sign-ins

Sign-in codes are sent from your personal Gmail through Supabase. In the Supabase dashboard → **Authentication → Rate Limits**:
- **Emails sent per hour:** raise to about **200**.
- **Sign-ups and sign-ins** and **token verifications** (counted per IP address): raise to about **150 per 5 minutes**. Everyone on the venue Wi-Fi can share one IP address.

Also:
- **Wake the project.** Free Supabase projects pause after a week without use, so open the dashboard the day before and the morning of the demo.
- **Gmail limits.** A personal Gmail account sends a few hundred emails a day, which is plenty for a demo. A sudden burst can make Google pause sending briefly, which is one more reason to stagger sign-ins (below).

If a limit is reached, the student sees "Too many attempts" or "We couldn't send the email right now" and can try again a minute later. Nobody who's already signed in is affected, and the website works without an account (logging cups, calculator, water buddy). Only friends need sign-in.

## 3. Dry run (the day before)

With 4–5 teammates and their **Stanford** emails:
1. Scan the slide QR. The site opens.
2. Sign in. Check how long the code email takes, and look in spam and Stanford's quarantine if it doesn't arrive.
3. Open your **Add friends** screen and have them scan your **Scan to add me** QR. It opens Add friends with your code filled in. They sign in, then tap **Send request**.
4. On your Friends tab, requests appear within about 15 seconds without refreshing. Accept them; their cups and streaks appear.
5. In Settings on the laptop, tap **Send a test notification**. "Take a Drink of Water💧" pops up about 5 seconds later. Allow notifications when the browser asks.

## 4. During the pitch

- Show the slide QR (the website) and give people **2–3 minutes** to sign in. That spreads the emails out. Teammates sign in beforehand.
- Project your Friends tab and accept requests live.
- For people to add you, show your **Scan to add me** QR (Friends → **+ Add**).
- Send a website test notification from the laptop.
- Show the phone app in Expo Go: the interval wheel, ring colors, the water buddy, a test reminder.

**What the website test notification can do:**
- **Laptops, and Chrome on Android:** it works. The browser asks for permission the first time.
- **iPhone:** Safari only allows website notifications for sites added to the Home Screen. The button explains this, and real reminders come with the app.
- **Only while the site is open:** scheduled reminders need the phone app.

## 5. Backup plan

- Sign in on the demo phone and laptop beforehand, and have a couple of teammates already added as friends.
- Record a short screen video of the full flow (scan → sign in → add → accept) in case the venue Wi-Fi or email is slow.
- If emails stall, carry on with the signed-in devices and invite people to join after the pitch.
