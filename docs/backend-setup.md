# Backend setup (Supabase)

This guide connects Flow State to your Supabase project so students can sign in with their Stanford email and back up their water log. It takes about 20 minutes. Without these steps, the app still works fully offline, just without accounts.

You'll need:
- the Supabase project you created;
- this repository on your Mac;
- a phone with the app running (Expo Go is fine).

## 1. Point the app at your project

1. In the Supabase dashboard, open your project, then **Project Settings → API**, or click **Connect** at the top.
2. Copy the **Project URL** and the **publishable key**, which starts with `sb_publishable_`. Older projects call it the **anon public** key; that works too.
   - **Don't** use the *secret* or *service_role* key; it bypasses all security.
3. In the repository folder, create your local settings file:

   ```bash
   cp .env.example .env.local
   ```

4. Open `.env.local` and paste in the two values:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxxxxxx
   ```

5. Restart the dev server so it picks up the file (`Ctrl+C`, then `npx expo start`). An **Account** section now appears at the top of the app's Settings tab.

`.env.local` is ignored by git, so each teammate creates their own. The publishable key is designed to ship inside the app; the database's access rules (row-level security) protect each student's data.

## 2. Create the database tables

1. In the dashboard, open **SQL Editor → New query**.
2. Open `supabase/migrations/20261110000000_accounts_sync.sql` from this repository, copy **all** of it, paste it into the editor, and click **Run**. You should see "Success. No rows returned".
3. Check **Table Editor**. You should now see `profiles`, `drink_entries` and `daily_goals`, each marked as protected by RLS.

The script can safely be run more than once. It:
- creates the tables;
- turns on row-level security, so each student can only see their own rows;
- **only allows `@stanford.edu` emails** to create accounts, enforced in the database;
- keeps the newest change when two phones edit the same thing;
- adds the `delete_my_account` function that the app's "Delete account" button uses.

### 2b. Add friends support

Do the same with `supabase/migrations/20261111000000_friends.sql`: open a new query, paste the **whole** file, and click **Run**. Always run the files in order (accounts first, then friends). This one:
- gives every student a friend code;
- adds the `friendships` table;
- adds the functions behind friend requests, which enforce who can see what.

Sign-in and backup keep working if you haven't run it yet; the Friends tab just can't load.

### 2c. Add anonymous impact stats

Run `supabase/migrations/20261112000000_impact_stats.sql` the same way, third in order. It creates:
- a `usage_daily` table, which nobody can read through the app;
- a `report_usage` function the app uses to send daily totals;
- two dashboard-only report views, described under **Viewing impact stats** below.

Until you run it, the app retries quietly each day and nothing breaks.

<details>
<summary>Prefer the command line? Use the Supabase CLI instead.</summary>

```bash
npx supabase login
```

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

```bash
npx supabase db push
```

`YOUR_PROJECT_REF` is the part of the Project URL before `.supabase.co`. `db push` runs every file in `supabase/migrations/` that hasn't run yet.
</details>

## 3. Make sign-in emails contain a 6-digit code

By default Supabase emails a *link*. Flow State asks for a *code* instead, because it's easier on a phone and works with iOS code autofill.

**Do step 4 first.** Supabase only lets you edit email templates once a custom email sender (SMTP) is set up; until then the template page says "Set up custom SMTP to edit templates". For testing, a personal Gmail account with an app password works (host `smtp.gmail.com`, port `465`); switch to a real sending domain before students use it.

1. Go to **Authentication → Sign In / Providers**. Make sure **Email** is enabled and **Allow new users to sign up** is on.
2. Go to **Authentication → Emails → Templates**.
3. Edit the **Magic Link** template. Replace its body with something like this:

   ```html
   <h2>Your Flow State code</h2>
   <p>Enter this code in the app to sign in:</p>
   <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">{{ .Token }}</p>
   <p>It expires in 1 hour. If you didn't request it, you can ignore this email.</p>
   ```

   Subject: `Your Flow State sign-in code`
4. Do the same for the **Confirm signup** template. New students receive this one the first time they sign in.
5. Make sure neither template contains `{{ .ConfirmationURL }}`. The app doesn't use links.

If the code length setting is offered (Authentication → Providers → Email → *Email OTP length*), keep it at **6**.

## 4. Set up an email sender (before real students use it)

Supabase's built-in email is only for testing. It sends a **few emails per hour**, and only to addresses of your project's team members. Before inviting students, connect a real email service. [Resend](https://resend.com) is a simple option with a free tier (3,000 emails/month):

1. Create a Resend account.
2. Verify a sending domain you control. Resend shows the DNS records to add.
3. Create an API key in Resend.
4. In Supabase, go to **Authentication → Emails → SMTP Settings**, turn on **Custom SMTP**, and enter:

   | Field | Value |
   | --- | --- |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |
   | Sender email | e.g. `no-reply@yourdomain.org` |
   | Sender name | `Flow State` |

5. Under **Authentication → Rate Limits**, raise *emails per hour* to fit your launch, e.g. 100.

Any SMTP provider works (SendGrid, Postmark, Amazon SES, …). Stanford-hosted options would need University IT.

## 5. Test it

**Mail delivery.** On your phone, open the app, go to **Settings → Account → Sign in**, and enter your `@stanford.edu` address. Check that the email arrives, including your spam / quarantine folder. Stanford's mail filters sometimes hold new senders. If emails land in spam, ask the sender service to help with domain authentication (SPF/DKIM), which Resend sets up for you.

**Checklist:**
1. A non-Stanford email (e.g. Gmail) is refused with "Only @stanford.edu email addresses can sign up."
2. A Stanford email gets a code; entering it signs you in and asks for a display name.
3. Log a few cups. Settings shows "Backed up just now". In the dashboard's Table Editor, rows appear in `drink_entries`.
4. Delete the app, reinstall it (or use a second phone), and sign in with the same email. Your cups and goal come back.
5. With two phones signed in, log on one and open the app on the other. The count updates.
6. **Friends** (needs two Stanford accounts, e.g. two phones or a phone plus a simulator):
   1. On phone A, go to Friends → **+ Add** and note the friend code.
   2. On phone B, enter that code. Phone A sees a request with B's name and email; accept it.
   3. Log cups on B, then pull down to refresh the Friends tab on A. B's cups and streak update.
   4. Try adding by Stanford email. Then turn off Settings → Account → *Let friends find me by email* and check that the email no longer finds you.
   5. Remove the friend, then try **Remove & block**: the blocked account's requests now say "No one found".
7. Settings → Account → **Delete account** removes your rows from every table, including friendships.
8. **Impact stats:** log a cup today, then open the app again tomorrow (or change your phone's date forward a day). A row appears in `usage_daily` (Table Editor) for yesterday. With Settings → Privacy → *Share anonymous usage stats* off, nothing is sent.

## Viewing impact stats

In the dashboard, open **SQL Editor** and run:

```sql
select * from impact_weekly;   -- per week: active installs, active days, total cups, avg cups/day, % of days goal met
```

```sql
select * from impact_daily;    -- the same, per day
```

**What the numbers mean:**
- A row is sent for each day a student logged **at least one cup**, so *active installs* means phones where someone logged water that week.
- Students who turned stats off aren't counted.
- Reinstalling the app creates a new random ID, so totals are approximate.
- Because the app's key is public, someone determined could submit fake rows. Treat the numbers as indicators, not exact counts.

To export, click **Download CSV** under the results. These views and the table can't be read through the app or API, only by project members in the dashboard.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| No Account section in Settings | `.env.local` is missing or misnamed, or the dev server wasn't restarted after creating it. |
| The email contains a link instead of a code | Edit **both** the *Magic Link* and *Confirm signup* templates (step 3). |
| "Too many attempts" | Supabase rate limits; wait a minute, or raise them under Authentication → Rate Limits. |
| Emails never arrive | You're still on Supabase's built-in email (step 4), or Stanford's filter quarantined it. |
| "Something went wrong" on sign-in | Check **Authentication → Logs** in the dashboard; make sure the SQL script ran (step 2). |
| "Delete account" fails | Make sure the SQL script ran completely; it creates `delete_my_account`. |
| Friends tab says "Couldn't refresh", or there's no friend code | Run `20261111000000_friends.sql` (step 2b). |
| `usage_daily` stays empty | Run `20261112000000_impact_stats.sql` (step 2c). Only *completed* days with at least one cup are sent, so check the day after logging. Also check the Settings → Privacy switch. |
| A friend's cups look out of date | Their phone uploads about 2 seconds after they log a cup, but only while online. Pull down to refresh. |
| Sign-in works but nothing backs up | Check **Database → Logs** for permission errors; re-run the SQL script. |

## For developers

- **Database tests:** `npm run test:db` runs the migration in an in-process Postgres (PGlite) with a stand-in for Supabase's `auth` schema (`supabase/tests/auth-stub.sql`). They check the Stanford-only rule, row-level security, newest-wins, account deletion, every friends rule (requests, privacy of what friends see, streaks, blocking), and that impact stats can be sent anonymously but never read through the API. Add a test there whenever you change the SQL.
- **Schema changes:** add a **new** file in `supabase/migrations/` (don't edit one that has already run), run it in each project, and update the tests.
- **How the app syncs** is described in `README.md` → *Accounts & sync*.
