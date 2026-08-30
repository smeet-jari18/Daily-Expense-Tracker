/**
 * Reset Password Controller (Supabase)
 * ─────────────────────────────────────────────────────────────────────────────
 * The reset link in the email lands here as  reset-password.html?code=XXXX .
 * We exchange that one-time code for a short "recovery" session, then let the
 * user set the new password with auth.updateUser().
 * ─────────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', async () => {
    await loadTheme();

    const resetForm = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitBtn = resetForm.querySelector('button[type="submit"]');
    const alertMsg = document.getElementById('alert-msg');
    const hint = document.getElementById('reset-hint');

    function showAlert(msg, type = 'danger') {
        alertMsg.textContent = msg;
        alertMsg.className = `alert alert-${type}`;
        alertMsg.classList.remove('hidden');
    }

    function hideAlert() {
        alertMsg.classList.add('hidden');
    }

    // 1) If a normal session already exists, go to the dashboard
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { data: existing } = await supabaseClient.auth.getSession();
        if (existing && existing.session) {
            window.location.replace('dashboard.html');
            return;
        }
    }

    // 2) Exchange the one-time code from the email link
    const resetCode = new URLSearchParams(window.location.search).get('code');
    let recoveryReady = false;

    if (resetCode && typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(resetCode);
        recoveryReady = !error;
        if (error) console.warn('Could not verify reset code:', error);
    }

    if (!recoveryReady) {
        // No valid link — point the user back to the email flow
        if (hint) hint.textContent = 'To set a new password, open the secure link from your reset email. It should have opened this page automatically.';
        resetForm.classList.add('hidden');
        showAlert("You need to open the reset link from your email. Didn't receive one? Use \"Forgot Password\" on the login page to send a new one.", 'info');
        return;
    }

    // 3) Valid recovery session — let the user set the new password
    if (hint) hint.textContent = 'You are almost done! Enter your new password below.';

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (!newPass || newPass.length < 6) {
            showAlert('Password must contain at least 6 characters.');
            return;
        }

        if (newPass !== confirmPass) {
            showAlert('Passwords do not match.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';

        const { error } = await supabaseClient.auth.updateUser({ password: newPass });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';

        if (error) {
            showAlert(error.message || 'Could not reset password. Please try again.');
        } else {
            window.location.href = 'login.html?reset=true';
        }
    });
});
