/**
 * Forgot Password Controller (Supabase — sends a REAL reset email)
 */

document.addEventListener('DOMContentLoaded', async () => {
    await checkAlreadyLoggedIn();

    await loadTheme();

    const forgotForm = document.getElementById('forgot-form');
    const emailInput = document.getElementById('email');
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    const alertMsg = document.getElementById('alert-msg');

    function showAlert(msg, type = 'danger') {
        alertMsg.textContent = msg;
        alertMsg.className = `alert alert-${type}`;
        alertMsg.classList.remove('hidden');
    }

    function hideAlert() {
        alertMsg.classList.add('hidden');
    }

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = emailInput.value.trim();

        if (!email) {
            showAlert('Please enter your email.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const result = await dbSendPasswordResetEmail(email);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';

        // On success we stay on this page and show the confirmation message
        showAlert(result.message, result.success ? 'info' : 'danger');
    });
});
