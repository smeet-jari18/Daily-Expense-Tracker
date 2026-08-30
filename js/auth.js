/**
 * ExpenseTrack - Authentication (Supabase)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles login, signup, logout and session — powered by Supabase Auth.
 * All persistent data lives in the Supabase (PostgreSQL) cloud database,
 * so data survives page refreshes, browser restarts, and works across
 * devices and browsers for the same account.
 *
 * Only cosmetic, non-sensitive preferences (pre-login theme) are cached
 * in localStorage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Storage Keys (cosmetic local cache only) ───────────────────────────────
const STORAGE_KEY_THEME = 'expensetrack_theme';

// ─── Supabase Client ─────────────────────────────────────────────────────────
// SUPABASE_URL / SUPABASE_ANON_KEY are defined in js/supabase-config.js
const SUPABASE_CONFIGURED =
    typeof SUPABASE_URL === 'string' &&
    /^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(SUPABASE_URL) &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.length > 40;

let supabaseClient = null;
if (SUPABASE_CONFIGURED && typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Friendly message shown while the database is not connected yet
const DB_SETUP_MESSAGE = "Database is not connected yet. Open js/supabase-config.js, paste your Supabase URL + anon key (see SETUP-SUPABASE.md), then refresh this page.";

// In-memory cache of the logged-in user: { id, name, email }
let _currentUser = null;

function mapAuthUser(u) {
    const meta = (u && u.user_metadata) || {};
    return {
        id: u.id,
        name: meta.name || (u.email ? u.email.split('@')[0] : 'User'),
        email: u.email || ''
    };
}

function getCurrentUser() {
    return _currentUser;
}

// ─── "Not configured" notice ────────────────────────────────────────────────
function showDbSetupNotice() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('db-setup-notice')) return;
    const notice = document.createElement('div');
    notice.id = 'db-setup-notice';
    notice.style.cssText = [
        'position: fixed', 'top: 0', 'left: 0', 'right: 0', 'z-index: 999999',
        'background: #b45309', 'color: #fff', 'padding: 10px 16px',
        'font: 600 14px/1.5 system-ui, sans-serif', 'text-align: center'
    ].join(';');
    notice.innerHTML = '⚠️ <strong>Database not connected.</strong> Open <code>js/supabase-config.js</code>, paste your Supabase URL + anon key (step-by-step in <code>SETUP-SUPABASE.md</code>), then refresh.';
    document.body.appendChild(notice);
}

function requireDb() {
    if (!supabaseClient) {
        showDbSetupNotice();
        return null;
    }
    return supabaseClient;
}

// ─── Session Resolution ─────────────────────────────────────────────────────
// Returns the current user (from cache or Supabase session), or null.
async function resolveCurrentUser() {
    if (_currentUser) return _currentUser;
    const sb = requireDb();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    if (data && data.session && data.session.user) {
        _currentUser = mapAuthUser(data.session.user);
    }
    return _currentUser;
}

async function initAuth() {
    await resolveCurrentUser();
    if (supabaseClient) {
        // Keep the in-memory user in sync (token refresh, sign-out, etc.)
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            _currentUser = (session && session.user) ? mapAuthUser(session.user) : null;
        });
    }
    return _currentUser;
}

// ─── Route Protection (async) ───────────────────────────────────────────────
// Call at the very top of protected pages. Redirects if not logged in.
async function checkAuthentication() {
    const user = await resolveCurrentUser();
    if (!user) {
        window.location.replace("login.html");
        return null;
    }
    return user;
}

// Redirect logged-in users away from login/signup pages
async function checkAlreadyLoggedIn() {
    const user = await resolveCurrentUser();
    if (user) {
        window.location.replace("dashboard.html");
    }
    return user;
}

// ─── Register New User ──────────────────────────────────────────────────────
async function registerUser(name, email, password) {
    const sb = requireDb();
    if (!sb) return { success: false, message: DB_SETUP_MESSAGE };

    const { data, error } = await sb.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: { data: { name: name.trim() } }
    });

    if (error) {
        return { success: false, message: friendlyAuthError(error) };
    }

    // If email confirmation is disabled in Supabase, a session exists right away
    if (data.session && data.user) {
        _currentUser = mapAuthUser(data.user);
        return { success: true, message: "Account created successfully! 🎉", autoLoggedIn: true };
    }

    return {
        success: true,
        message: "Account created! We've sent a verification link to your email — click it, then come back and login.",
        needsVerification: true
    };
}

// ─── Login ─────────────────────────────────────────────────────────────────
async function loginUser(email, password) {
    const sb = requireDb();
    if (!sb) return { success: false, message: DB_SETUP_MESSAGE };

    const { data, error } = await sb.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
    });

    if (error) {
        return { success: false, message: friendlyAuthError(error) };
    }

    _currentUser = mapAuthUser(data.user);
    return { success: true, user: _currentUser };
}

function friendlyAuthError(error) {
    const msg = (error && error.message) || "Something went wrong. Please try again.";
    if (/invalid login credentials/i.test(msg)) return "Invalid email or password.";
    if (/email not confirmed/i.test(msg)) return "Please verify your email first — check your inbox for the confirmation link.";
    if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
    return msg;
}

// ─── Logout ────────────────────────────────────────────────────────────────
async function logoutUser() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    _currentUser = null;
    window.location.replace("login.html?message=logged_out");
}

// ─── Unique ID Generator (kept for client-generated IDs) ────────────────────
function generateId(prefix) {
    let uuid;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        uuid = crypto.randomUUID();
    } else {
        uuid = 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
    }
    return prefix ? prefix + '_' + uuid : uuid;
}

// ─── Theme (cosmetic; pre-login cached in localStorage) ─────────────────────
// Pass a theme name to skip the database lookup (avoids a double fetch).
async function loadTheme(themeOverride) {
    let savedTheme = (typeof themeOverride === 'string' && themeOverride) ? themeOverride : null;

    if (!savedTheme) {
        const user = await resolveCurrentUser();
        if (user && typeof fetchUserSettings === 'function') {
            const settings = await fetchUserSettings(user.id);
            if (settings && settings.theme) savedTheme = settings.theme;
        }
    }

    if (!savedTheme) {
        try { savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light'; }
        catch (e) { savedTheme = 'light'; }
    }

    try { localStorage.setItem(STORAGE_KEY_THEME, savedTheme); } catch (e) { /* ignore */ }

    let isDark = false;
    if (savedTheme === 'dark') {
        isDark = true;
    } else if (savedTheme === 'system') {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// ─── Password Toggle Helper ─────────────────────────────────────────────────
function setupPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.password-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = '👁️‍🗨️';
                    btn.setAttribute('title', 'Hide Password');
                } else {
                    input.type = 'password';
                    btn.textContent = '👁️';
                    btn.setAttribute('title', 'Show Password');
                }
            }
        });
    });
}

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        setupPasswordToggles();
        await initAuth();
        if (!supabaseClient) {
            showDbSetupNotice();
            return;
        }
        // Theme: logged-in → cloud settings; not logged in → local cache
        await loadTheme();
    })();
});
