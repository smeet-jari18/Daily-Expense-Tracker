/**
 * OPTIONAL — full account deletion (Netlify)
 * ─────────────────────────────────────────────────────────────────────────────
 * The frontend already wipes all user data (expenses/settings/profile).
 * This function additionally deletes the AUTH account itself (the login),
 * which requires the service-role key and therefore must run server-side.
 *
 * To enable (5 minutes):
 *   1. Netlify → your site → Site configuration → Environment variables
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
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: headers, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.' })
        };
    }

    let userId = null;
    try {
        userId = JSON.parse(event.body || '{}').userId;
    } catch (e) { /* ignore */ }

    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid userId' }) };
    }

    try {
        const res = await fetch(url + '/auth/v1/admin/users/' + userId, {
            method: 'DELETE',
            headers: { apikey: key, Authorization: 'Bearer ' + key }
        });
        const text = await res.text();
        return { statusCode: res.ok ? 200 : res.status, headers: headers, body: text || JSON.stringify({ ok: res.ok }) };
    } catch (err) {
        return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
    }
};
