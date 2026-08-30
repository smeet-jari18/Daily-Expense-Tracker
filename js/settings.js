/**
 * ExpenseTrack - Settings Logic
 */

let currentUser = null;
let currentSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate & load user (Supabase session)
    currentUser = await checkAuthentication();
    if (!currentUser) return;

    // 2. Load settings (Supabase settings table)
    currentSettings = await fetchUserSettings(currentUser.id) || defaultSettings(currentUser.id);
    await loadTheme(currentSettings.theme);

    // 3. Populate UI
    populateHeader();
    populateProfile();
    populateAppearance();
    populateBudget();
    populateCurrency();
    populateNotifications();

    // 4. Setup Listeners
    setupAccountDropdown();
    setupSidebarNavigation();
    setupForms();
    setupDataManagement();
    setupDangerZone();
    
    // Logout btn
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
});

// ─── Populators ─────────────────────────────────────────────────────────────
function populateHeader() {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    
    const nameDisp = document.getElementById('user-name-display');
    const avatarDisp = document.getElementById('user-avatar-initial');
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownEmail = document.getElementById('dropdown-user-email');
    const dropdownAvatar = document.getElementById('dropdown-avatar-initial');

    if (nameDisp) nameDisp.textContent = currentUser.name;
    if (avatarDisp) avatarDisp.textContent = initial;
    if (dropdownName) dropdownName.textContent = currentUser.name;
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email;
    if (dropdownAvatar) dropdownAvatar.textContent = initial;
}

function populateProfile() {
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
}

function populateAppearance() {
    const savedTheme = currentSettings.theme || 'light';
    const radios = document.querySelectorAll('input[name="theme-radio"]');
    radios.forEach(r => {
        if (r.value === savedTheme) {
            r.checked = true;
        }
    });
}

function populateBudget() {
    const budgetValEl = document.getElementById('current-budget-display-val');
    const budgetInputEl = document.getElementById('settings-budget-input');
    const currency = currentSettings.currency || 'INR';
    
    let symbol = '₹';
    if (currency === 'USD') symbol = '$';
    else if (currency === 'EUR') symbol = '€';
    else if (currency === 'GBP') symbol = '£';

    if (budgetValEl) {
        const val = currentSettings.monthlyBudget || 0;
        budgetValEl.textContent = symbol + (Number(val) || 0).toLocaleString();
    }
    if (budgetInputEl) {
        budgetInputEl.value = currentSettings.monthlyBudget || '';
    }
}

function populateCurrency() {
    document.getElementById('currency-select').value = currentSettings.currency || 'INR';
}

function populateNotifications() {
    const n = currentSettings.notifications || { expenseReminder: true, budgetWarning: true, monthlySummary: true };
    document.getElementById('notif-expense').checked = !!n.expenseReminder;
    document.getElementById('notif-budget').checked = !!n.budgetWarning;
    document.getElementById('notif-summary').checked = !!n.monthlySummary;
}

// ─── Account Dropdown Logic ──────────────────────────────────────────────
function setupAccountDropdown() {
    const dropdownBtn = document.getElementById('account-dropdown-btn');
    const dropdownMenu = document.getElementById('account-dropdown-menu');
    const dropdownLogout = document.getElementById('dropdown-logout-btn');

    if (!dropdownBtn || !dropdownMenu) return;

    function toggleDropdown(e) {
        if (e) e.stopPropagation();
        const isHidden = dropdownMenu.classList.contains('hidden');
        if (isHidden) {
            dropdownMenu.classList.remove('hidden');
            dropdownBtn.setAttribute('aria-expanded', 'true');
        } else {
            dropdownMenu.classList.add('hidden');
            dropdownBtn.setAttribute('aria-expanded', 'false');
        }
    }

    function closeDropdown() {
        if (!dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
            dropdownBtn.setAttribute('aria-expanded', 'false');
        }
    }

    dropdownBtn.addEventListener('click', toggleDropdown);

    if (dropdownLogout) {
        dropdownLogout.addEventListener('click', (e) => {
            closeDropdown();
            logoutUser();
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    // Close on dropdown links click
    const menuLinks = dropdownMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', closeDropdown);
    });
}

// ─── Listeners ─────────────────────────────────────────────────────────────
function setupSidebarNavigation() {
    const links = document.querySelectorAll('.settings-nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            links.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });
}

function setupForms() {
    // Profile
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profile-name').value.trim();
        if (!newName) {
            showToast("Name cannot be empty.", "danger");
            return;
        }

        // Update the profile name in the database + session metadata
        const ok = await dbUpdateProfileName(currentUser.id, newName);
        if (ok) {
            currentUser.name = newName;
            populateHeader();
            showToast("Profile name updated successfully. ✅");
        } else {
            showToast("Could not update profile name. Please try again.", "danger");
        }
    });

    // Password Change (Supabase Auth — verifies current password)
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (!currentPass) {
            showToast("Please enter your current password.", "danger");
            return;
        }
        if (newPass.length < 6) {
            showToast("New password must be at least 6 characters long.", "danger");
            return;
        }
        if (newPass !== confirmPass) {
            showToast("New password and confirm password do not match.", "danger");
            return;
        }

        const result = await dbChangePassword(currentPass, newPass);
        if (result.success) {
            e.target.reset();
            showToast(result.message);
        } else {
            showToast(result.message, "danger");
        }
    });

    // Appearance (Radio options immediate apply & persist per-user)
    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const selectedTheme = e.target.value;
            currentSettings.theme = selectedTheme;
            await dbUpdateSettings(currentUser.id, currentSettings);
            await loadTheme(selectedTheme);
            showToast(`Theme changed to ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}. 🎨`);
        });
    });

    // Budget Form
    document.getElementById('budget-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const budgetVal = parseFloat(document.getElementById('settings-budget-input').value) || 0;
        currentSettings.monthlyBudget = budgetVal;
        await dbUpdateSettings(currentUser.id, currentSettings);
        populateBudget();
        showToast("Monthly budget updated. 💰");
    });

    // Currency Select
    document.getElementById('currency-select').addEventListener('change', async (e) => {
        const selectedCurrency = e.target.value;
        currentSettings.currency = selectedCurrency;
        await dbUpdateSettings(currentUser.id, currentSettings);
        populateBudget();
        showToast("Currency updated. 💱");
    });

    // Notifications (Auto-save on toggle)
    const notifInputs = ['notif-expense', 'notif-budget', 'notif-summary'];
    notifInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', async () => {
            const exp = document.getElementById('notif-expense').checked;
            const bgd = document.getElementById('notif-budget').checked;
            const sum = document.getElementById('notif-summary').checked;

            currentSettings.notifications = { expenseReminder: exp, budgetWarning: bgd, monthlySummary: sum };
            await dbUpdateSettings(currentUser.id, currentSettings);
            showToast("Notification preferences saved. 🔔");
        });
    });
}

function setupDataManagement() {
    // Delete All Expenses (Supabase)
    document.getElementById('delete-all-expenses-btn').addEventListener('click', () => {
        showDeleteExpensesModal(async () => {
            const ok = await dbClearUserExpenses(currentUser.id);
            showToast(ok ? "All your expenses have been deleted. 🗑️" : "Delete failed — please try again.", ok ? "success" : "danger");
        });
    });

    // Export My Data (JSON - without password)
    document.getElementById('export-my-data-btn').addEventListener('click', async () => {
        const expenses = await fetchUserExpenses(currentUser.id);
        // Exclude passwords
        const profile = { id: currentUser.id, name: currentUser.name, email: currentUser.email };
        
        const data = {
            profile: profile,
            settings: currentSettings,
            expenses: expenses
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const dateStr = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `ExpenseTrack_MyData_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast("Data exported successfully. 📦");
    });

    // Export CSV (Only current user)
    document.getElementById('export-csv-btn').addEventListener('click', async () => {
        const expenses = await fetchUserExpenses(currentUser.id);
        if (expenses.length === 0) {
            showToast("No expenses to export.", "danger");
            return;
        }

        const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method'];
        const csvRows = [headers.join(',')];

        expenses.forEach(exp => {
            csvRows.push(`${exp.date},${exp.category},"${exp.description || ''}",${exp.amount},${exp.paymentMethod}`);
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ExpenseTrack_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Export Excel (Only current user)
    document.getElementById('export-excel-btn').addEventListener('click', async () => {
        if (typeof XLSX === 'undefined') {
            showToast("Excel export library not loaded.", "danger");
            return;
        }

        const expenses = await fetchUserExpenses(currentUser.id);
        if (expenses.length === 0) {
            showToast("No expenses to export.", "danger");
            return;
        }

        const exportData = expenses.map(e => ({
            Date: e.date,
            Category: e.category,
            Description: e.description,
            Amount: parseFloat(e.amount),
            PaymentMethod: e.paymentMethod
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expenses");
        XLSX.writeFile(wb, `ExpenseTrack_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
}

function showDeleteExpensesModal(onConfirm) {
    const existing = document.getElementById('delete-exp-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-exp-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card">
            <h3 class="modal-title">⚠️ Delete All Expenses?</h3>
            <p class="modal-message">This will permanently remove all your expense records.<br><br>Your account and settings will remain.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                <button class="btn btn-primary modal-confirm-btn" style="background-color: var(--danger); border-color: var(--danger);">Delete All</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const confirmBtn = overlay.querySelector('.modal-confirm-btn');

    function closeModal() {
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 200);
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
}

function setupDangerZone() {
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        showDeleteAccountStep1(() => {
            showDeleteAccountStep2();
        });
    });
}

function showDeleteAccountStep1(onContinue) {
    const existing = document.getElementById('delete-acc-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-acc-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card">
            <h3 class="modal-title">Delete your ExpenseTrack account?</h3>
            <p class="modal-message">
                This will permanently delete:<br>
                • Account<br>
                • Expenses<br>
                • Settings<br>
                • Budget<br><br>
                This cannot be undone.
            </p>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                <button class="btn btn-primary modal-continue-btn" style="background-color: var(--danger); border-color: var(--danger);">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const continueBtn = overlay.querySelector('.modal-continue-btn');

    function closeModal() {
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 200);
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    continueBtn.addEventListener('click', () => {
        closeModal();
        onContinue();
    });
}

function showDeleteAccountStep2() {
    const existing = document.getElementById('delete-acc-step2-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-acc-step2-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card">
            <h3 class="modal-title">Confirm Account Deletion</h3>
            <p class="modal-message">Type <strong>DELETE</strong> to confirm:</p>
            <div class="form-group" style="margin-top: 12px; margin-bottom: 20px;">
                <input type="text" id="delete-confirm-text" placeholder="DELETE" style="text-align: center; font-weight: 700; letter-spacing: 1px;">
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                <button id="final-delete-acc-btn" class="btn btn-primary" style="background-color: var(--danger); border-color: var(--danger);" disabled>Delete Account</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const input = overlay.querySelector('#delete-confirm-text');
    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const finalBtn = overlay.querySelector('#final-delete-acc-btn');

    input.addEventListener('input', (e) => {
        if (e.target.value.trim() === 'DELETE') {
            finalBtn.removeAttribute('disabled');
        } else {
            finalBtn.setAttribute('disabled', 'true');
        }
    });

    function closeModal() {
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 200);
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    finalBtn.addEventListener('click', async () => {
        if (input.value.trim() !== 'DELETE') return;
        closeModal();
        finalBtn.setAttribute('disabled', 'true');

        const result = await dbDeleteAccount();
        if (!result || !result.success) {
            alert("Could not delete your account. Please try again.");
            return;
        }

        if (result.fullyDeleted) {
            window.location.replace("login.html?deleted=true");
        } else {
            alert("Your expense data has been deleted. Note: to also remove the login account itself, deploy the included serverless function (see SETUP-SUPABASE.md, step 8).");
            window.location.replace("login.html?data_cleared=true");
        }
    });
}

// ─── Toast Notifications ───────────────────────────────────────────────────
function showToast(message, type = "success") {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
