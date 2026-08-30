/**
 * Login Page Controller (Supabase Auth)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Redirect to dashboard if user is already authenticated
    await checkAlreadyLoggedIn();

    await loadTheme();

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    const alertMsg = document.getElementById('alert-msg');

    // Check query params for logout / registration / reset messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('message') === 'logged_out') {
        showAlert('Logged out successfully.', 'info');
    } else if (urlParams.get('registered') === 'true') {
        showAlert('Account created successfully! Please login. 🎉', 'success');
    } else if (urlParams.get('verified_email') === 'true') {
        showAlert('Email verified — you can now login. ✅', 'success');
    } else if (urlParams.get('reset') === 'true') {
        showAlert('Password reset successfully! You can now login. 🔐', 'success');
    } else if (urlParams.get('deleted') === 'true') {
        showAlert('Your account has been deleted.', 'info');
    } else if (urlParams.get('data_cleared') === 'true') {
        showAlert('Your data has been cleared.', 'info');
    }

    function showAlert(msg, type = 'danger') {
        alertMsg.textContent = msg;
        alertMsg.className = `alert alert-${type}`;
        alertMsg.classList.remove('hidden');
    }

    function hideAlert() {
        alertMsg.classList.add('hidden');
    }

    // Handle Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
            showAlert('Please enter your email.');
            return;
        }

        if (!password) {
            showAlert('Please enter your password.');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        const result = await loginUser(email, password);

        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';

        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            showAlert(result.message, 'danger');
        }
    });
});
