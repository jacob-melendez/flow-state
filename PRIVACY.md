# Flow State Privacy Policy

> **DRAFT for review.** Written by the development team to match how the app actually works (version 2.0.0). It is not legal advice. Before publishing:
> - fill in the bracketed placeholders;
> - have it reviewed (e.g. by your faculty advisor and, if the app will carry Stanford's name, the appropriate Stanford office);
> - host it at a public URL. The App Store requires one. Then set `PRIVACY_POLICY_URL` in `src/config.ts` so it appears in the app.

**Effective date:** [DATE]

Flow State is a water-reminder app built by the Health & Wellness team of SENSA Impact Labs, a student organization at Stanford University ("we", "us"). [If applicable: Flow State is not an official Stanford University service.] This policy explains what information the app uses, where it goes, and the choices you have.

**In short:**
- The app works without an account, and then your data stays on your phone.
- If you sign in, your water log is backed up so you can use it on other phones and share progress with friends.
- If you leave anonymous stats on, we receive daily cup totals that aren't linked to you.
- We don't sell data, show ads, or track you across other apps or websites.

## 1. Information that stays on your phone

These are stored only on your device and are never sent to us:

- **Reminder settings:** interval, active hours, pause state.
- **Water calculator answers:** weight, sex, exercise, hot weather, pregnancy/breastfeeding.
- **Your water log and daily goal**, unless you sign in (see section 2).

Notifications are scheduled by your phone itself; no server sends them. Deleting the app deletes this information.

## 2. If you create an account (optional)

You can sign in with your Stanford (`@stanford.edu`) email address to back up your progress and use friends. We then store:

| Information | Why |
| --- | --- |
| Your Stanford email address | To sign you in (we email you a one-time code) and, if you allow it, to let friends find you by exact email |
| A display name you choose | Shown to your friends |
| Your water log (each cup's time, and if you removed it), daily goals, and current goal | To back up and sync your progress across your phones, and to show friends your progress |
| Your time zone | So "today" and streaks are counted in your local day |
| A friend code, and your friend requests, friends and blocks | To run the friends feature |
| Technical sign-in data (account ID, sign-in times) | Kept by our hosting provider to operate accounts securely |

**What friends can see:** only your display name, how many cups you've had today compared with your goal, and your current streak. They can't see your history, weight, calculator answers or email. When you send someone a friend request, they see your display name and Stanford email so they know who it is. You can remove or block anyone, and you can turn off "Let friends find me by email" in Settings; friends can then add you only with your friend code.

## 3. Anonymous usage statistics (optional, on by default)

To measure whether Flow State helps students drink more water, the app sends us, once a day, a summary of each recent day on which you logged water:
- the date;
- the number of cups;
- your goal and whether you met it;
- the app version;
- your phone type (iOS/Android).

These summaries carry a **random ID created on your phone** and are sent **without your account login**, so they are not linked to your name, email or account. We use them only in aggregate (for example, "average cups per day this week") for SENSA Impact Labs' reports.

You can turn this off any time in **Settings → Privacy → Share anonymous usage stats**. Because these summaries aren't linked to you, we can't find or delete the ones already sent.

## 4. How we use information

We use information only to:
- provide the app's features (sign-in, backup and sync, friends);
- keep the service secure;
- produce aggregate statistics about the program's impact.

We don't use it for advertising, we don't sell or rent it, and we don't share it with anyone except as described here.

## 5. Service providers

- **Supabase** hosts our database and sign-in system and stores account data on our behalf. [Region: e.g. United States]
- **[Email provider, e.g. Resend]** delivers sign-in code emails, so it receives your email address and the code.
- **Apple / Google** deliver the app and may provide crash reports to us if you've allowed that in your phone settings.

These providers process data only to provide their services to us.

## 6. Keeping and deleting your data

- **Delete your account any time** in the app: **Settings → Account → Delete account**. This permanently deletes your account, email, display name, backed-up water log, goals, friend code and friendships from our database. Your water log on your phone stays until you delete the app.
- **Retention:** account data is kept until you delete your account. [Optional: or until the program ends / after [N] months of inactivity.] Anonymous statistics are kept for the program's reporting [for up to N years].
- **Signing out** stops backups from that phone; it doesn't delete anything.

## 7. Security

- Data is sent over encrypted connections (HTTPS).
- Database rules allow each student to access only their own data. Friends get only the limited information described in section 2.
- No system is perfectly secure, but we take reasonable steps to protect your information.

## 8. Health information

Flow State is a wellness tool, not a medical service. The water calculator gives a general estimate and is not medical advice. Calculator answers never leave your phone. Your water log is stored on our servers only if you choose to sign in.

## 9. Children

Flow State is intended for Stanford students and is not directed at children under 13. We don't knowingly collect information from children under 13.

## 10. Your choices and rights

You can:
- use the app without an account;
- turn off anonymous statistics and email search;
- change your display name;
- remove or block friends;
- delete your account at any time.

You may also contact us to ask what account data we hold or to request corrections. Depending on where you live, you may have additional rights under laws such as the CCPA or GDPR.

## 11. Changes to this policy

If we change this policy, we'll update the effective date above and, for significant changes, let you know in the app.

## 12. Contact

SENSA Impact Labs, Health & Wellness team
[team contact email]
[mailing address, if required]

---

## Appendix (for the team): App Store "App Privacy" answers

App Store Connect asks what data the app collects. Based on version 2.0.0 (data that stays on the phone isn't "collected" in Apple's terms):

| Apple data type | Collected? | Linked to the user? | Used for tracking? | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info → Email Address | Yes (only with an account) | Yes | No | App Functionality |
| Contact Info → Name (display name) | Yes (only with an account) | Yes | No | App Functionality |
| Health & Fitness → Health (water log, goals) | Yes (with an account) | Yes | No | App Functionality |
| Health & Fitness → Health (anonymous daily totals) | Yes (if stats on) | No | No | Analytics |
| Identifiers → User ID (account ID) | Yes (only with an account) | Yes | No | App Functionality |
| Identifiers → Device ID (random install ID for stats) | Yes (if stats on) | No | No | Analytics |
| Usage Data → Product Interaction (days used, app version) | Yes (if stats on) | No | No | Analytics |
| Other User Content (friends list) | Yes (only with an account) | Yes | No | App Functionality |

Everything else (location, contacts, photos, browsing, purchases, financial info, diagnostics from us) is **not collected**. Also confirm in App Store Connect that the app supports **account deletion in-app** (it does: Settings → Account → Delete account).
