/**
 * ExpenseTrack - Database Layer (Supabase / PostgreSQL)
 * ─────────────────────────────────────────────────────────────────────────────
 * All reads & writes for expenses, settings and profile names happen here.
 *
 * Rows in the database are mapped to the app's original camelCase shapes, so
 * the rest of the UI (dashboard.js, charts.js, settings.js) works exactly as
 * before — it just now talks to a real cloud database instead of
 * localStorage.
 *
 * Row Level Security (see supabase-schema.sql) guarantees a user can only
 * ever see / change their own rows.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
function db() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    showDbSetupNotice();
    return null;
}

function rowToExpense(r) {
    return {
        id: r.id,
        userId: r.user_id,
        amount: Number(r.amount),
        category: r.category,
        date: r.expense_date,
        paymentMethod: r.payment_method,
        description: r.description,
        createdAt: r.created_at
    };
}

function expenseToRow(e) {
    // NOTE: we do NOT send "id" — the client uses temporary ids like
    // "exp_<uuid>" which are not valid UUIDs, and Postgres rejects them
    // (column expenses.id is uuid type). Postgres generates the real
    // UUID (gen_random_uuid()); insert(...).select() returns it.
    return {
        user_id: e.userId,
        amount: Number(e.amount),
        category: e.category,
        expense_date: e.date,
        payment_method: e.paymentMethod,
        description: e.description
    };
}

function rowToSettings(r) {
    return {
        userId: r.user_id,
        theme: r.theme,
        currency: r.currency,
        monthlyBudget: Number(r.monthly_budget),
        notifications: {
            expenseReminder: !!r.expense_reminder,
            budgetWarning: !!r.budget_warning,
            monthlySummary: !!r.monthly_summary
        }
    };
}

function defaultSettings(userId) {
    return {
        userId: userId,
        theme: 'light',
        currency: 'INR',
        monthlyBudget: 0,
        notifications: { expenseReminder: true, budgetWarning: true, monthlySummary: true }
    };
}

function settingsToPatch(s) {
    const p = {};
    if (s.theme !== undefined) p.theme = s.theme;
    if (s.currency !== undefined) p.currency = s.currency;
    if (s.monthlyBudget !== undefined) p.monthly_budget = Number(s.monthlyBudget) || 0;
    if (s.notifications) {
        p.expense_reminder = !!s.notifications.expenseReminder;
        p.budget_warning = !!s.notifications.budgetWarning;
        p.monthly_summary = !!s.notifications.monthlySummary;
    }
    return p;
}

// ─── Expenses ───────────────────────────────────────────────────────────────
// Fetch ONLY the current user's expenses (newest date first)
async function fetchUserExpenses(userId) {
    const sb = db();
    if (!sb) return [];

    const { data, error } = await sb.from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
    return (data || []).map(rowToExpense);
}

// Insert one expense → returns the saved row (or null on failure)
async function dbAddExpense(expense) {
    const sb = db();
    if (!sb) return null;

    const { data, error } = await sb.from('expenses')
        .insert(expenseToRow(expense))
        .select()
        .single();

    if (error) {
        console.error('Error adding expense:', error);
        return null;
    }
    return rowToExpense(data);
}

// Insert several expenses at once (used by "Load sample data")
async function dbAddExpensesBulk(expenses) {
    const sb = db();
    if (!sb) return [];

    if (!expenses || expenses.length === 0) return [];

    const { data, error } = await sb.from('expenses')
        .insert(expenses.map(expenseToRow))
        .select();

    if (error) {
        console.error('Error adding expenses:', error);
        return [];
    }
    return (data || []).map(rowToExpense);
}

// Update one expense (by its own id) → true/false
async function dbUpdateExpense(id, expense) {
    const sb = db();
    if (!sb) return false;

    const { error } = await sb.from('expenses')
        .update(expenseToRow(expense))
        .eq('id', id);

    if (error) console.error('Error updating expense:', error);
    return !error;
}

// Delete one expense → true/false
async function dbDeleteExpense(id) {
    const sb = db();
    if (!sb) return false;

    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) console.error('Error deleting expense:', error);
    return !error;
}

// Delete ALL of a user's expenses → true/false
async function dbClearUserExpenses(userId) {
    const sb = db();
    if (!sb) return false;

    const { error } = await sb.from('expenses').delete().eq('user_id', userId);
    if (error) console.error('Error clearing expenses:', error);
    return !error;
}

// ─── Settings (self-heals: creates a defaults row if missing) ────────────────
async function fetchUserSettings(userId) {
    const sb = db();
    if (!sb) return null;

    const { data, error } = await sb.from('settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching settings:', error);
        return null;
    }

    if (!data) {
        // Self-heal: create the missing settings row with defaults
        const ins = await sb.from('settings').upsert({ user_id: userId }).select().maybeSingle();
        if (ins.data) return rowToSettings(ins.data);
        return defaultSettings(userId);
    }
    return rowToSettings(data);
}

// Upsert a (partial) settings object for the user → true/false
async function dbUpdateSettings(userId, settingsObj) {
    const sb = db();
    if (!sb) return false;

    const patch = Object.assign({ user_id: userId }, settingsToPatch(settingsObj));
    const { error } = await sb.from('settings').upsert(patch).select();
    if (error) console.error('Error saving settings:', error);
    return !error;
}

// ─── Profile ─────────────────────────────────────────────────────────────────
// Update display name: profiles table + auth session metadata
async function dbUpdateProfileName(userId, name) {
    const sb = db();
    if (!sb) return false;

    // 1) Keep the name in the auth session metadata (shown in the top bar)
    const { error: metaErr } = await sb.auth.updateUser({ data: { name } });
    if (metaErr) console.warn('Could not update profile metadata:', metaErr.message);

    // 2) Keep the profiles table in sync
    const { error } = await sb.from('profiles').upsert({ id: userId, name });
    if (error) {
        console.error('Error updating profile:', error);
        return false;
    }

    if (typeof _currentUser !== 'undefined' && _currentUser) {
        _currentUser = Object.assign({}, _currentUser, { name });
    }
    return true;
}

// ─── Password ────────────────────────────────────────────────────────────────
// Change password: verifies the CURRENT password first, then sets the new one
async function dbChangePassword(currentPassword, newPassword) {
    const sb = db();
    if (!sb) return { success: false, message: DB_SETUP_MESSAGE };

    const user = getCurrentUser();
    if (!user) return { success: false, message: 'Not logged in.' };

    // Verifying by signing in with the current password (same user — the
    // session is simply refreshed, which is harmless).
    const { error: verifyErr } = await sb.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    });
    if (verifyErr) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
        return { success: false, message: friendlyAuthError(error) };
    }
    return { success: true, message: 'Password changed successfully. 🔐' };
}

// Send a REAL email with a secure reset link (Supabase delivers it)
async function dbSendPasswordResetEmail(email) {
    const sb = db();
    if (!sb) return { success: false, message: DB_SETUP_MESSAGE };

    const redirectTo = window.location.origin +
        window.location.pathname.replace('forgot-password.html', 'reset-password.html');

    const { error } = await sb.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: redirectTo
    });

    if (error) return { success: false, message: friendlyAuthError(error) };

    // Supabase intentionally does not reveal whether an email exists,
    // so we show the same message in all cases.
    return {
        success: true,
        message: 'If an account exists for that email, a secure reset link has been sent. Check your inbox (and spam folder). 📧'
    };
}

// ─── Account Deletion ────────────────────────────────────────────────────────
// 1) Wipes all the user's data (expenses, settings, profile) — allowed by RLS.
// 2) Asks the OPTIONAL serverless function (see SETUP-SUPABASE.md step 8) to
//    also delete the auth account itself. If it is not deployed, the data
//    wipe still succeeds — only the login account would remain.
// 3) Signs the user out.
async function dbDeleteAccount() {
    const sb = db();
    if (!sb) return { success: false, message: DB_SETUP_MESSAGE };

    const user = getCurrentUser();
    if (!user) return { success: false, message: 'Not logged in.' };

    await sb.from('expenses').delete().eq('user_id', user.id);
    await sb.from('settings').delete().eq('user_id', user.id);
    await sb.from('profiles').delete().eq('id', user.id);

    let fullyDeleted = false;
    const endpoints = ['/api/delete-account', '/.netlify/functions/delete-account'];
    for (const endpoint of endpoints) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            if (res.ok) { fullyDeleted = true; break; }
        } catch (e) {
            /* endpoint not deployed — try the next one */
        }
    }

    await sb.auth.signOut();
    if (typeof _currentUser !== 'undefined') _currentUser = null;

    return { success: true, fullyDeleted };
}
