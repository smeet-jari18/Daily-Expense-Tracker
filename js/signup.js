/**
 * Sign Up Page Controller (Supabase Auth)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Redirect if already logged in
    await checkAlreadyLoggedIn();

    await loadTheme();

    const signupForm = document.getElementById('signup-form');
    const nameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const alertMsg = document.getElementById('alert-msg');

    function showAlert(msg, type = 'danger') {
        alertMsg.textContent = msg;
        alertMsg.className = `alert alert-${type}`;
        alertMsg.classList.remove('hidden');
    }

    function hideAlert() {
        alertMsg.classList.add('hidden');
    }

    // Basic Email Format Helper
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validation Rules
        if (!name) {
            showAlert('Please enter your full name.');
            return;
        }

        if (!email || !isValidEmail(email)) {
            showAlert('Please enter a valid email address.');
            return;
        }

        if (!password || password.length < 6) {
            showAlert('Password must contain at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const result = await registerUser(name, email, password);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        if (result.success) {
            if (result.autoLoggedIn) {
                // Email confirmation is disabled → go straight in
                window.location.href = 'dashboard.html';
            } else if (result.needsVerification) {
                window.location.href = 'login.html?verified_email=true';
            } else {
                window.location.href = 'login.html?registered=true';
            }
        } else {
            showAlert(result.message, 'danger');
        }
    });
});
