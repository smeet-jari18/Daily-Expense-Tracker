/**
 * ExpenseTrack - Protected Expense Dashboard Controller
 * All operations are scoped to the currently logged-in user.
 */

// ─── User-Scoped State ──────────────────────────────────────────────────────
// currentUser is set in the async init below (session comes from Supabase).
let currentUser = null;
let userExpenses = [];
let userMonthlyBudget = 0;
let userSettings = null;   // cached settings object (see db.js)
let editExpenseId = null;

// ─── DOM Element References ──────────────────────────────────────────────────
const userNameDisplay = document.getElementById('user-name-display');
const userEmailDisplay = document.getElementById('user-email-display');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const logoutBtn = document.getElementById('logout-btn');

const expenseForm = document.getElementById('expense-form');
const formTitle = document.getElementById('form-title');
const expenseIdInput = document.getElementById('expense-id');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const paymentMethodInput = document.getElementById('payment-method');
const descriptionInput = document.getElementById('description');
const submitBtn = document.getElementById('submit-btn');
const submitBtnText = document.getElementById('submit-btn-text');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const amountError = document.getElementById('amount-error');
const categoryError = document.getElementById('category-error');
const dateError = document.getElementById('date-error');

const totalExpensesVal = document.getElementById('total-expenses-val');
const todayExpenseVal = document.getElementById('today-expense-val');
const monthExpenseVal = document.getElementById('month-expense-val');
const countExpensesVal = document.getElementById('count-expenses-val');
const currentDateEl = document.getElementById('current-date');

const budgetAmountDisplay = document.getElementById('budget-amount-display');
const budgetSpentDisplay = document.getElementById('budget-spent-display');
const budgetRemainingDisplay = document.getElementById('budget-remaining-display');
const budgetProgressBar = document.getElementById('budget-progress-bar');
const budgetWarning = document.getElementById('budget-warning');
const setBudgetBtn = document.getElementById('set-budget-btn');
const budgetFormContainer = document.getElementById('budget-form-container');
const budgetForm = document.getElementById('budget-form');
const budgetInput = document.getElementById('budget-input');
const cancelBudgetBtn = document.getElementById('cancel-budget-btn');

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const dateFilter = document.getElementById('date-filter');

const expenseListTbody = document.getElementById('expense-list-tbody');
const emptyState = document.getElementById('empty-state');
const expenseTable = document.getElementById('expense-table');
const categorySummaryContainer = document.getElementById('category-summary-container');
const addFirstBtn = document.getElementById('add-first-btn');
const loadDemoBtn = document.getElementById('load-demo-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// ─── Toast Notification System ───────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast if any
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast toast-' + type;

    const icons = { success: '✅', danger: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><span class="toast-msg">' + message + '</span>';

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Currency Formatter (Indian Rupee) ───────────────────────────────────────
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    
    let currency = 'INR';
    if (userSettings && userSettings.currency) {
        currency = userSettings.currency;
    }
    
    let symbol = '₹';
    let locale = 'en-IN';
    
    if (currency === 'USD') { symbol = '$'; locale = 'en-US'; }
    else if (currency === 'EUR') { symbol = '€'; locale = 'en-GB'; }
    else if (currency === 'GBP') { symbol = '£'; locale = 'en-GB'; }

    return symbol + ' ' + num.toLocaleString(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });
}

// ─── Date Formatter ──────────────────────────────────────────────────────────
function formatDateString(dateStr) {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr + 'T00:00:00');
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ─── Initialize Dashboard (async — data comes from Supabase) ────────────────
async function initDashboard() {
    if (!currentUser) return;

    // Render user profile across top bar and dropdown
    renderUserProfileUI();

    // Set current date
    const today = new Date();
    currentDateEl.textContent = today.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    dateInput.value = today.toISOString().split('T')[0];

    await loadUserSettings();   // theme, budget, notifications (from DB)
    await loadDashboardTheme();
    await loadUserExpenses();   // expenses (from DB)
    setupAccountDropdown();
    setupEventListeners();
    renderExpenses();
    updateDashboard();
}

function renderUserProfileUI() {
    if (!currentUser) return;
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
    if (userAvatarInitial) userAvatarInitial.textContent = initial;

    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownEmail = document.getElementById('dropdown-user-email');
    const dropdownAvatar = document.getElementById('dropdown-avatar-initial');

    if (dropdownName) dropdownName.textContent = currentUser.name;
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email;
    if (dropdownAvatar) dropdownAvatar.textContent = initial;
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

// ─── Theme ───────────────────────────────────────────────────────────────────
async function loadDashboardTheme() {
    await loadTheme(userSettings ? userSettings.theme : null); // user-scoped theme (auth.js)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeIcon) {
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }
}

async function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    if (userSettings) userSettings.theme = newTheme;
    await dbUpdateSettings(currentUser.id, userSettings);
    await loadDashboardTheme();
}

// ─── Load User-Specific Expenses (from Supabase) ─────────────────────────────
async function loadUserExpenses() {
    userExpenses = await fetchUserExpenses(currentUser.id);
}

// ─── Load User-Specific Settings + Budget (from Supabase) ───────────────────
async function loadUserSettings() {
    userSettings = await fetchUserSettings(currentUser.id);
    if (!userSettings) userSettings = defaultSettings(currentUser.id);
    userMonthlyBudget = userSettings.monthlyBudget || 0;
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    expenseForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);

    // Budget toggle
    setBudgetBtn.addEventListener('click', () => {
        budgetInput.value = userMonthlyBudget;
        budgetFormContainer.classList.toggle('hidden');
    });
    cancelBudgetBtn.addEventListener('click', () => budgetFormContainer.classList.add('hidden'));
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = parseFloat(budgetInput.value);
        if (!isNaN(val) && val >= 0) {
            userMonthlyBudget = val;
            if (userSettings) userSettings.monthlyBudget = val;
            await dbUpdateSettings(currentUser.id, userSettings);
            updateBudget();
            budgetFormContainer.classList.add('hidden');
            showToast('Monthly budget updated to ' + formatCurrency(val), 'success');
        }
    });

    // Search & Filter
    searchInput.addEventListener('input', renderExpenses);
    categoryFilter.addEventListener('change', renderExpenses);
    dateFilter.addEventListener('change', renderExpenses);

    // Action buttons
    addFirstBtn.addEventListener('click', () => amountInput.focus());
    loadDemoBtn.addEventListener('click', loadSampleData);
    exportCsvBtn.addEventListener('click', exportCSV);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel);
    clearAllBtn.addEventListener('click', clearAllUserData);
    themeToggle.addEventListener('click', toggleDarkMode);
}

// ─── Form Validation ─────────────────────────────────────────────────────────
function validateForm() {
    let isValid = true;
    amountError.textContent = '';
    categoryError.textContent = '';
    dateError.textContent = '';

    const amountVal = parseFloat(amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
        amountError.textContent = 'Please enter a valid amount greater than 0.';
        isValid = false;
    }
    if (!categoryInput.value) {
        categoryError.textContent = 'Please select a category.';
        isValid = false;
    }
    if (!dateInput.value) {
        dateError.textContent = 'Please select a valid date.';
        isValid = false;
    }
    return isValid;
}

// ─── Form Submit (Add or Update) ─────────────────────────────────────────────
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const expenseData = {
        id: editExpenseId ? editExpenseId : generateId('exp'),
        userId: currentUser.id,
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        date: dateInput.value,
        paymentMethod: paymentMethodInput.value,
        description: descriptionInput.value.trim() || categoryInput.value
    };

    if (editExpenseId) {
        const ok = await updateExpense(expenseData);
        showToast(ok ? 'Expense updated successfully.' : 'Saved on this screen only — database update failed.', ok ? 'success' : 'warning');
    } else {
        const ok = await addExpense(expenseData);
        showToast(ok ? 'Expense added successfully.' : 'Saved on this screen only — database save failed.', ok ? 'success' : 'warning');
    }

    resetForm();
    renderExpenses();
    updateDashboard();
}

// ─── Add Expense (to Supabase) ───────────────────────────────────────────────
async function addExpense(expense) {
    const saved = await dbAddExpense(expense);
    userExpenses.unshift(saved || expense);
    return !!saved;
}

// ─── Edit Expense (populate form) ────────────────────────────────────────────
function editExpense(id) {
    const expense = userExpenses.find(item => item.id === id);
    if (!expense) {
        showToast('Expense not found.', 'danger');
        return;
    }
    // Verify ownership
    if (expense.userId !== currentUser.id) {
        showToast('You can only edit your own expenses.', 'danger');
        return;
    }

    editExpenseId = id;
    expenseIdInput.value = expense.id;
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    dateInput.value = expense.date;
    paymentMethodInput.value = expense.paymentMethod;
    descriptionInput.value = expense.description;

    formTitle.textContent = 'Edit Expense';
    submitBtnText.textContent = 'Update Expense';
    cancelEditBtn.classList.remove('hidden');
    expenseForm.scrollIntoView({ behavior: 'smooth' });
}

// ─── Update Expense (in Supabase) ────────────────────────────────────────────
async function updateExpense(updated) {
    const ok = await dbUpdateExpense(updated.id, updated);
    const idx = userExpenses.findIndex(item => item.id === updated.id);
    if (idx !== -1) {
        userExpenses[idx] = updated;
    }
    return ok;
}

// ─── Cancel Edit ─────────────────────────────────────────────────────────────
function cancelEdit() {
    resetForm();
}

function resetForm() {
    editExpenseId = null;
    expenseIdInput.value = '';
    expenseForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];

    formTitle.textContent = 'Add New Expense';
    submitBtnText.textContent = 'Add Expense';
    cancelEditBtn.classList.add('hidden');

    amountError.textContent = '';
    categoryError.textContent = '';
    dateError.textContent = '';
}

// ─── Delete Single Expense ───────────────────────────────────────────────────
function deleteExpense(id) {
    const expense = userExpenses.find(item => item.id === id);
    if (!expense) return;
    if (expense.userId !== currentUser.id) {
        showToast('You can only delete your own expenses.', 'danger');
        return;
    }

    showConfirmModal(
        'Delete this expense?',
        'Are you sure you want to delete "' + expense.description + '" (' + formatCurrency(expense.amount) + ')?',
        async () => {
            const ok = await dbDeleteExpense(id);
            userExpenses = userExpenses.filter(item => item.id !== id);

            if (editExpenseId === id) cancelEdit();

            renderExpenses();
            updateDashboard();
            showToast(ok ? 'Expense deleted successfully.' : 'Delete failed — please try again.', ok ? 'success' : 'danger');
        }
    );
}

// ─── Clear All Current User's Data ───────────────────────────────────────────
function clearAllUserData() {
    if (userExpenses.length === 0) {
        showToast('You have no expenses to delete.', 'info');
        return;
    }

    showConfirmModal(
        'Delete all your expense data?',
        'This will permanently delete ALL expenses from your account. Your account and login information will NOT be deleted.',
        async () => {
            const ok = await dbClearUserExpenses(currentUser.id);
            userExpenses = [];
            resetForm();
            renderExpenses();
            updateDashboard();
            showToast(ok ? 'All your expenses have been deleted.' : 'Delete failed — please try again.', ok ? 'success' : 'danger');
        }
    );
}

// ─── Confirmation Modal ──────────────────────────────────────────────────────
function showConfirmModal(title, message, onConfirm) {
    // Remove existing modal if any
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card">
            <h3 class="modal-title">${title}</h3>
            <p class="modal-message">${message}</p>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                <button class="btn btn-primary modal-confirm-btn" style="background-color: var(--danger); border-color: var(--danger);">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Trigger fade-in
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const confirmBtn = overlay.querySelector('.modal-confirm-btn');

    function closeModal() {
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 200);
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
}

// ─── Filter & Search (user-scoped) ──────────────────────────────────────────
function getFilteredExpenses() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedDateRange = dateFilter.value;

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return userExpenses.filter(exp => {
        // Search
        const matchSearch = !query ||
            exp.description.toLowerCase().includes(query) ||
            exp.category.toLowerCase().includes(query) ||
            exp.paymentMethod.toLowerCase().includes(query);

        // Category filter
        const matchCategory = selectedCategory === 'All' || exp.category === selectedCategory;

        // Date filter
        let matchDate = true;
        if (selectedDateRange === 'Today') {
            matchDate = exp.date === todayStr;
        } else if (selectedDateRange === 'This Week') {
            const expDate = new Date(exp.date + 'T00:00:00');
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            matchDate = expDate >= startOfWeek;
        } else if (selectedDateRange === 'This Month') {
            const expDate = new Date(exp.date + 'T00:00:00');
            matchDate = expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        }

        return matchSearch && matchCategory && matchDate;
    });
}

// ─── Render Expense Table / Cards ────────────────────────────────────────────
function renderExpenses() {
    const filtered = getFilteredExpenses();

    if (filtered.length === 0) {
        expenseTable.classList.add('hidden');
        emptyState.classList.remove('hidden');
        expenseListTbody.innerHTML = '';
        return;
    }

    expenseTable.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Use data-id attribute with string IDs for reliable click handling
    expenseListTbody.innerHTML = filtered.map(item => `
        <tr>
            <td data-label="Date">${formatDateString(item.date)}</td>
            <td data-label="Description"><strong>${escapeHtml(item.description)}</strong></td>
            <td data-label="Category"><span class="category-badge">${escapeHtml(item.category)}</span></td>
            <td data-label="Payment"><span class="payment-badge">${escapeHtml(item.paymentMethod)}</span></td>
            <td data-label="Amount" class="amount-val">${formatCurrency(item.amount)}</td>
            <td data-label="Actions" class="text-right">
                <div class="action-btns">
                    <button data-action="edit" data-id="${escapeHtml(item.id)}" class="btn-action btn-edit" title="Edit">✏️ Edit</button>
                    <button data-action="delete" data-id="${escapeHtml(item.id)}" class="btn-action btn-delete" title="Delete">🗑️ Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Event delegation for edit/delete buttons (avoids inline onclick issues)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!id) return;

    if (action === 'edit') {
        editExpense(id);
    } else if (action === 'delete') {
        deleteExpense(id);
    }
});

// ─── HTML Escaping ───────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ─── Dashboard Statistics (all user-scoped) ──────────────────────────────────
function updateDashboard() {
    const total = calculateTotalExpenses();
    const today = calculateTodayExpenses();
    const month = calculateMonthlyExpenses();
    const count = userExpenses.length;

    totalExpensesVal.textContent = formatCurrency(total);
    todayExpenseVal.textContent = formatCurrency(today);
    monthExpenseVal.textContent = formatCurrency(month);
    countExpensesVal.textContent = count;

    updateBudget();
    updateCategorySummary();
    updateAnalyticsInsights();

    // Refresh charts if the charts module is loaded
    if (typeof refreshCharts === 'function') {
        refreshCharts();
    }
}

function calculateTotalExpenses() {
    return userExpenses.reduce((sum, item) => sum + item.amount, 0);
}

function calculateTodayExpenses() {
    const todayStr = new Date().toISOString().split('T')[0];
    return userExpenses
        .filter(item => item.date === todayStr)
        .reduce((sum, item) => sum + item.amount, 0);
}

function calculateMonthlyExpenses() {
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();

    return userExpenses
        .filter(item => {
            const d = new Date(item.date + 'T00:00:00');
            return d.getMonth() === cm && d.getFullYear() === cy;
        })
        .reduce((sum, item) => sum + item.amount, 0);
}

// ─── Budget Progress Bar ─────────────────────────────────────────────────────
function updateBudget() {
    const spent = calculateMonthlyExpenses();
    const remaining = userMonthlyBudget - spent;
    const pct = userMonthlyBudget > 0 ? Math.min((spent / userMonthlyBudget) * 100, 100) : 0;

    budgetAmountDisplay.textContent = formatCurrency(userMonthlyBudget);
    budgetSpentDisplay.textContent = formatCurrency(spent);
    budgetRemainingDisplay.textContent = formatCurrency(remaining);
    budgetProgressBar.style.width = pct + '%';

    const warningsEnabled = userSettings && userSettings.notifications ? userSettings.notifications.budgetWarning : true;

    if (warningsEnabled && spent > userMonthlyBudget && userMonthlyBudget > 0) {
        budgetProgressBar.classList.add('exceeded');
        budgetWarning.innerHTML = '🚨 You have exceeded your monthly budget.';
        budgetWarning.classList.remove('hidden');
    } else if (warningsEnabled && pct >= 80 && userMonthlyBudget > 0) {
        budgetProgressBar.classList.remove('exceeded');
        budgetWarning.innerHTML = '⚠️ You have used ' + Math.round(pct) + '% of your monthly budget.';
        budgetWarning.classList.remove('hidden');
    } else {
        budgetProgressBar.classList.remove('exceeded');
        budgetWarning.classList.add('hidden');
    }
}

// ─── Category Summary ────────────────────────────────────────────────────────
function updateCategorySummary() {
    const total = calculateTotalExpenses();
    const categoryTotals = {};

    userExpenses.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

    const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Health', 'Travel', 'Other'];

    categorySummaryContainer.innerHTML = categories.map(cat => {
        const catSpent = categoryTotals[cat] || 0;
        const pct = total > 0 ? ((catSpent / total) * 100).toFixed(1) : 0;

        return `
            <div class="cat-summary-item">
                <div class="cat-summary-label">
                    <span>${cat}</span>
                    <strong>${formatCurrency(catSpent)} (${pct}%)</strong>
                </div>
                <div class="cat-progress-bg">
                    <div class="cat-progress-fill" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Analytics Insights (Highest category/day, lowest day, average) ──────────
function updateAnalyticsInsights() {
    const highestCatEl = document.getElementById('highest-cat-val');
    const highestDayEl = document.getElementById('highest-day-val');
    const lowestDayEl = document.getElementById('lowest-day-val');
    const avgDailyEl = document.getElementById('avg-daily-val');

    if (!highestCatEl || !highestDayEl || !lowestDayEl || !avgDailyEl) return;

    if (userExpenses.length === 0) {
        highestCatEl.textContent = 'None';
        highestDayEl.textContent = 'N/A';
        lowestDayEl.textContent = 'N/A';
        avgDailyEl.textContent = formatCurrency(0);
        return;
    }

    // 1. Highest Spending Category
    const catTotals = {};
    userExpenses.forEach(e => catTotals[e.category] = (catTotals[e.category] || 0) + e.amount);
    const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
    const topCat = sortedCats[0];
    highestCatEl.textContent = `${topCat} (${formatCurrency(catTotals[topCat])})`;

    // Group expenses by Date
    const dailyTotals = {};
    userExpenses.forEach(e => {
        dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount;
    });

    const dates = Object.keys(dailyTotals).sort((a, b) => dailyTotals[b] - dailyTotals[a]);
    const highestDate = dates[0];
    const lowestDate = dates[dates.length - 1];

    highestDayEl.textContent = `${formatDateString(highestDate)} (${formatCurrency(dailyTotals[highestDate])})`;
    lowestDayEl.textContent = `${formatDateString(lowestDate)} (${formatCurrency(dailyTotals[lowestDate])})`;

    // Average daily spending (over actual spending days)
    const numDays = dates.length;
    const totalSpent = calculateTotalExpenses();
    const avgSpent = numDays > 0 ? totalSpent / numDays : 0;
    avgDailyEl.textContent = `${formatCurrency(avgSpent)}/day`;
}

// ─── Load Sample Data (per-user, saved to Supabase) ─────────────────────────
async function loadSampleData() {
    if (userExpenses.length > 0) {
        if (!confirm('Loading demo data will add sample records to your account. Continue?')) {
            return;
        }
    }

    const today = new Date();
    function getDateOffset(offset) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        return d.toISOString().split('T')[0];
    }

    const samples = [
        { id: generateId('exp'), userId: currentUser.id, amount: 200, category: 'Food', date: getDateOffset(6), paymentMethod: 'UPI', description: 'Breakfast & Tea' },
        { id: generateId('exp'), userId: currentUser.id, amount: 800, category: 'Shopping', date: getDateOffset(5), paymentMethod: 'Debit Card', description: 'Groceries & Clothes' },
        { id: generateId('exp'), userId: currentUser.id, amount: 300, category: 'Bills', date: getDateOffset(4), paymentMethod: 'UPI', description: 'Mobile Recharge' },
        { id: generateId('exp'), userId: currentUser.id, amount: 1500, category: 'Travel', date: getDateOffset(3), paymentMethod: 'Credit Card', description: 'Train Ticket' },
        { id: generateId('exp'), userId: currentUser.id, amount: 500, category: 'Food', date: getDateOffset(2), paymentMethod: 'Cash', description: 'Dinner with friends' },
        { id: generateId('exp'), userId: currentUser.id, amount: 1200, category: 'Entertainment', date: getDateOffset(1), paymentMethod: 'UPI', description: 'Concert Ticket' },
        { id: generateId('exp'), userId: currentUser.id, amount: 400, category: 'Transport', date: getDateOffset(0), paymentMethod: 'Cash', description: 'Cab fare' }
    ];

    const saved = await dbAddExpensesBulk(samples);
    userExpenses = [...(saved && saved.length ? saved : samples), ...userExpenses];
    renderExpenses();
    updateDashboard();
    showToast('Sample trend expenses loaded!', 'success');
}

// ─── CSV Export (user-scoped) ─────────────────────────────────────────────────
function exportCSV() {
    if (userExpenses.length === 0) {
        showToast("You don't have any expenses to export.", 'warning');
        return;
    }

    const headers = ['Date', 'Amount', 'Category', 'Payment Method', 'Description'];
    const rows = userExpenses.map(item => [
        '"' + item.date + '"',
        item.amount,
        '"' + item.category + '"',
        '"' + item.paymentMethod + '"',
        '"' + item.description.replace(/"/g, '""') + '"'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', sanitizeFilename('ExpenseTrack_' + currentUser.name + '_' + new Date().toISOString().split('T')[0]) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV file exported successfully.', 'success');
}

// ─── Excel Export (user-scoped, uses SheetJS) ────────────────────────────────
function exportExcel() {
    if (userExpenses.length === 0) {
        showToast("You don't have any expenses to export.", 'warning');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showToast('Excel export is currently unavailable. Please refresh the page and try again.', 'danger');
        return;
    }

    try {
        // Sheet 1: Expenses
        const expenseRows = userExpenses.map(item => ({
            'Date': formatDateString(item.date),
            'Amount (₹)': item.amount,
            'Category': item.category,
            'Payment Method': item.paymentMethod,
            'Description': item.description
        }));

        const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);

        // Set column widths
        wsExpenses['!cols'] = [
            { wch: 14 }, // Date
            { wch: 12 }, // Amount
            { wch: 16 }, // Category
            { wch: 18 }, // Payment Method
            { wch: 28 }  // Description
        ];

        // Freeze header row
        wsExpenses['!freeze'] = { xSplit: 0, ySplit: 1 };

        // Sheet 2: Summary
        const totalExp = calculateTotalExpenses();
        const todayExp = calculateTodayExpenses();
        const monthExp = calculateMonthlyExpenses();
        const remaining = userMonthlyBudget - monthExp;

        const summaryRows = [
            { 'Metric': 'Total Expenses', 'Value': totalExp },
            { 'Metric': "Today's Expenses", 'Value': todayExp },
            { 'Metric': "This Month's Expenses", 'Value': monthExp },
            { 'Metric': 'Number of Expenses', 'Value': userExpenses.length },
            { 'Metric': 'Monthly Budget', 'Value': userMonthlyBudget },
            { 'Metric': 'Remaining Budget', 'Value': remaining }
        ];

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        wsSummary['!cols'] = [{ wch: 24 }, { wch: 16 }];

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // Download
        const filename = sanitizeFilename('ExpenseTrack_' + currentUser.name + '_' + new Date().toISOString().split('T')[0]) + '.xlsx';
        XLSX.writeFile(wb, filename);
        showToast('Excel file exported successfully.', 'success');
    } catch (err) {
        console.error('Excel export error:', err);
        showToast('Failed to export Excel file. Please try again.', 'danger');
    }
}

// ─── Filename Sanitizer ──────────────────────────────────────────────────────
function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\s]+/g, '_');
}

// ─── Init on DOM Ready (async — session comes from Supabase) ─────────────────
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuthentication(); // redirects to login.html if not signed in
    if (!currentUser) return;
    initDashboard();
});
