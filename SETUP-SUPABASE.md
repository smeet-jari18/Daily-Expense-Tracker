# 🗄️ ExpenseTrack — Connect Your Database (Supabase)

This guide connects your app to a **real cloud database** (Supabase = free PostgreSQL + secure login). After this:

- ✅ Expenses **survive refresh** — and even survive browser restarts, other browsers, other devices
- ✅ Each person has **their own account** (real email + password login, passwords stored securely — not in the browser)
- ✅ **Real "Forgot password"** emails with secure reset links
- ✅ Data stays safe: **Row Level Security** makes sure nobody can see another user's expenses

> **No server to run, no Node.js, nothing to install.** Your site stays a normal static site on Netlify/Vercel.

Total time: **~10 minutes**.

---

## Step 1 — Create a free Supabase account (2 min)

1. Go to **https://supabase.com** → click **Start your project** → sign up (Google/GitHub is fine).
2. Click **New project**.
   - **Name:** e.g. `expensetrack`
   - **Database password:** pick something and save it (only used for the dashboard)
   - **Region:** choose **Asia South (Mumbai)** if you're in India (fastest for you)
3. Wait ~1 minute for the project to build.

## Step 2 — Create the database tables (2 min)

1. In your Supabase project, open the **SQL Editor** (left menu → SQL Editor → New query).
2. Copy the **entire content** of the file `supabase-schema.sql` (in this project folder).
3. Paste it into the SQL Editor and click **Run**.
4. You should see a success message. (The tables `profiles`, `expenses`, `settings` now exist.)

## Step 3 — Paste your keys into the app (1 min)

1. In Supabase open **Project Settings → API** (left menu).
2. Copy **Project URL** — looks like `https://abcdefgh.supabase.co`
3. Copy the **`anon` `public`** key — a long `eyJ...` string
4. Open the file **`js/supabase-config.js`** in this project and paste them in:

```js
const SUPABASE_URL = "https://abcdefgh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

5. Save the file. The app is now connected! 🎉
   (The `anon` key is *designed* to be public — your data is protected by the security rules in `supabase-schema.sql`.)

## Step 4 — (Optional but recommended) Instant login after signup

By default Supabase asks new users to confirm their email before the first login.
If you want users to log in **immediately** (e.g. while testing):

1. Supabase → **Authentication → Providers → Email**
2. Turn **OFF** "Confirm email" → Save.

(You can turn it back on any time — the app handles both cases automatically.)

## Step 5 — (Optional) Enable email password reset on YOUR domain

For the "Forgot password" link to open **your** site (instead of a default Supabase page):

1. Supabase → **Project Settings → General → Site URL**
2. Set it to your deployed URL, e.g. `https://your-app-name.netlify.app`
3. Save.

## Step 6 — Deploy (3 min)

Push these files to your GitHub repo, then:

**Netlify:**
1. https://app.netlify.com → **Add new site → Import an existing project → GitHub**
2. Pick your `Daily-Expense-Tracker` repo → **Deploy**
3. That's it — Netlify serves the folder root.

**Vercel:**
1. https://vercel.com → **Add New → Project** → import the same repo → **Deploy**
2. Vercel also auto-detects the optional `api/` function (step 8).

## Step 7 — Test it! 🚀

1. Open your deployed site → **Sign Up** with your email/password.
2. Add 2–3 expenses, set a budget.
3. **Refresh the page** → everything is still there. ✅
4. **Log out → log in again** → still there. ✅
5. **Open the same account in another browser or your phone** → still there. ✅
6. Want to see charts fast? Use the **"Load sample data"** button on the empty dashboard.

---

## Step 8 — (Optional) 100% account deletion

"Delete account" in Settings already wipes all expenses/settings and signs you out.
To **also delete the login account itself**, deploy the included serverless function:

- **Netlify:** create the env vars below in *Site configuration → Environment variables*:
  ```
  SUPABASE_URL = your project URL
  SUPABASE_SERVICE_ROLE_KEY = the "service_role" key (Project Settings → API)
  ```
  Netlify picks up `netlify/functions/delete-account.js` automatically on the next deploy.
- **Vercel:** add the same two env vars in *Settings → Environment Variables*; `api/delete-account.js` is deployed automatically.

> ⚠️ Never put the `service_role` key in the frontend — it bypasses security. Only the serverless function may use it.

---

## How the data is stored now

| Data | Before (localStorage) | Now (Supabase) |
|---|---|---|
| Accounts & passwords | Plaintext in browser ⚠️ | Supabase Auth (hashed, secure) ✅ |
| Expenses | Browser memory only | `expenses` table (PostgreSQL) ✅ |
| Budget / theme / currency / notifications | Browser memory only | `settings` table ✅ |
| Session (who's logged in) | Browser only | Secure session token (survives refresh) ✅ |

Every query is automatically filtered by your account, and Row Level Security
enforces it inside the database itself.

## Troubleshooting

| Problem | Fix |
|---|---|
| Amber banner "Database not connected" | You didn't finish step 3 (keys in `js/supabase-config.js`), or the page was opened without internet (CDN blocked). |
| "Invalid email or password" | Typo, or (if you left email confirmation ON) your email isn't verified yet — check inbox/spam. |
| Signup works but login says "email not confirmed" | Verify via the email, or turn off "Confirm email" (step 4). |
| Forgot-password link opens a Supabase page instead of your site | Set the Site URL (step 5) and redeploy is not needed — next email uses the new URL. |
| Old data from before this update is gone | That data lived only in your browser's localStorage and was not a real database — it couldn't be shared or guaranteed. Start fresh; use "Load sample data" if you want practice numbers. |
| Charts/Excel buttons do nothing in some sandboxes | Some preview sandboxes block external CDNs (Chart.js/SheetJS). Works normally on Netlify/Vercel. |
