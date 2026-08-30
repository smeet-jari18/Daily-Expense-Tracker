/**
 * ExpenseTrack - Supabase Database Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  PASTE YOUR OWN VALUES HERE (2 lines) — then refresh the page.
 *
 * How to get them (5 minutes, free):
 *   1. Sign up at https://supabase.com (free "Free" plan is enough)
 *   2. Click "New project" → pick a name, password, region
 *      (choose "Asia South (Mumbai)" if you are in India)
 *   3. In Supabase, open  SQL Editor  → paste the ENTIRE content of
 *      supabase-schema.sql  → click "Run"
 *   4. Open  Project Settings → API
 *   5. Copy "Project URL"  → paste it as SUPABASE_URL below
 *      Copy "anon public" key → paste it as SUPABASE_ANON_KEY below
 *
 * Full walkthrough: open SETUP-SUPABASE.md
 *
 * 🔒 The anon key is safe to put in frontend code — Supabase Row Level
 *    Security (enabled in supabase-schema.sql) makes sure every user can
 *    only read/write their own data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Example: "https://abcdefg.supabase.co"
const SUPABASE_URL = "https://ygdjnuwvkoupdodnnxet.supabase.co";

// Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIs..."
const SUPABASE_ANON_KEY = "sb_publishable_mNuh2JPqrr8hVV525vaRVQ_gezvkAqj";
