/**
 * OPTIONAL — full account deletion (Vercel)
 * ─────────────────────────────────────────────────────────────────────────────
 * Same as netlify/functions/delete-account.js, in Vercel format.
 *
 * To enable (5 minutes):
 *   1. Vercel → your project → Settings → Environment Variables
 *   2. Add:  SUPABASE_URL = your project URL
 *            SUPABASE_SERVICE_ROLE_KEY = Supabase → Project Settings → API
 *            (the "service_role" key — keep it secret, never put it in the
 *             frontend!)
 *   3. Redeploy. After that, "Delete account" in Settings removes the
 *      account 100%. Without this function, data deletion still works —
 *      only the login account would remain.
 *
 * No dependencies needed (uses built-in fetch, Node 18+).
 */
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.' });
        return;
    }

    const userId = req.body && req.body.userId;
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        res.status(400).json({ error: 'Invalid userId' });
        return;
    }

    try {
        const response = await fetch(url + '/auth/v1/admin/users/' + userId, {
            method: 'DELETE',
            headers: { apikey: key, Authorization: 'Bearer ' + key }
        });
        const text = await response.text();
        res.status(response.ok ? 200 : response.status).send(text || JSON.stringify({ ok: response.ok }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
