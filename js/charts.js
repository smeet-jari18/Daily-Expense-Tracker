/**
 * ExpenseTrack - Interactive Charts Module
 * ROOT CAUSE FIX: The legend.labels block was never closed before the tooltip
 * block started, causing the entire Chart.js options object to be malformed.
 *
 * Dependencies: Chart.js 4.x, chartjs-adapter-date-fns
 * Globals (dashboard.js): userExpenses, userMonthlyBudget, editExpenseId
 * Globals (auth.js): currentUser
 */

// ─── Chart Instances ─────────────────────────────────────────────────────────
var spendingChart = null;
var categoryChart = null;
var activeTimeRange = '30 Days';

// ─── Category Colors ─────────────────────────────────────────────────────────
var CATEGORY_COLORS = {
    'Food':          '#f97316',
    'Transport':     '#3b82f6',
    'Shopping':      '#a855f7',
    'Bills':         '#eab308',
    'Education':     '#06b6d4',
    'Entertainment': '#ec4899',
    'Health':        '#10b981',
    'Travel':        '#6366f1',
    'Other':         '#64748b'
};

var CATEGORY_ICONS = {
    'Food':          '\uD83C\uDF54',
    'Transport':     '\uD83D\uDE8C',
    'Shopping':      '\uD83D\uDECD\uFE0F',
    'Bills':         '\uD83D\uDCA1',
    'Education':     '\uD83D\uDCDA',
    'Entertainment': '\uD83C\uDFAC',
    'Health':        '\uD83C\uDFE5',
    'Travel':        '\u2708\uFE0F',
    'Other':         '\uD83D\uDCE6'
};

var TIME_RANGES = [
    { label: 'Today',      value: 'Today'      },
    { label: '7 Days',     value: '7 Days'      },
    { label: '30 Days',    value: '30 Days'     },
    { label: 'This Month', value: 'This Month'  },
    { label: 'Last Month', value: 'Last Month'  },
    { label: '3 Months',   value: '3 Months'    },
    { label: '6 Months',   value: '6 Months'    },
    { label: '1 Year',     value: '1 Year'      },
    { label: 'All Time',   value: 'All Time'    },
    { label: 'Custom',     value: 'Custom'      }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" safely into local midnight Date */
function parseExpenseDate(dateStr) {
    if (!dateStr) return new Date();
    var parts = String(dateStr).split('-');
    if (parts.length === 3) {
        return new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );
    }
    return new Date(dateStr);
}

function formatDateFull(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

function formatDateShort(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getChartColors() {
    var dark = isDarkMode();
    return {
        gridColor:          dark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.06)',
        tickColor:          dark ? '#94a3b8' : '#64748b',
        tooltipBg:          dark ? '#1e293b' : '#ffffff',
        tooltipText:        dark ? '#f8fafc' : '#1e293b',
        tooltipBorder:      dark ? '#334155' : '#e2e8f0',
        lineColor:          '#3b82f6',
        lineGradientTop:    dark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
        lineGradientBottom: 'rgba(59,130,246,0)',
        pointColor:         '#3b82f6',
        remainingLine:      '#10b981'
    };
}

// ─── Time Range Filtering ────────────────────────────────────────────────────

function getDateRangeForFilter(range) {
    var now   = new Date();
    var ts    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayMs = 24 * 60 * 60 * 1000;
    switch (range) {
        case 'Today':
            return { start: ts, end: new Date(ts.getTime() + dayMs - 1) };
        case '7 Days':
            return { start: new Date(ts.getTime() - 6*dayMs), end: new Date(ts.getTime() + dayMs - 1) };
        case '30 Days':
            return { start: new Date(ts.getTime() - 29*dayMs), end: new Date(ts.getTime() + dayMs - 1) };
        case 'This Month':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1),
                     end:   new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59) };
        case 'Last Month':
            return { start: new Date(now.getFullYear(), now.getMonth()-1, 1),
                     end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
        case '3 Months':
            return { start: new Date(now.getFullYear(), now.getMonth()-2, 1),
                     end:   new Date(ts.getTime() + dayMs - 1) };
        case '6 Months':
            return { start: new Date(now.getFullYear(), now.getMonth()-5, 1),
                     end:   new Date(ts.getTime() + dayMs - 1) };
        case '1 Year':
            return { start: new Date(now.getFullYear()-1, now.getMonth(), now.getDate()),
                     end:   new Date(ts.getTime() + dayMs - 1) };
        default:
            return { start: null, end: null };
    }
}

function getFilteredChartExpenses(range, customStart, customEnd) {
    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    if (!exps || exps.length === 0) return [];
    var start, end;
    if (range === 'Custom') {
        start = customStart ? parseExpenseDate(customStart) : null;
        end   = customEnd   ? new Date(parseExpenseDate(customEnd).getTime() + 24*60*60*1000 - 1) : null;
    } else {
        var r = getDateRangeForFilter(range);
        start = r.start; end = r.end;
    }
    return exps.filter(function(exp) {
        var ts = parseExpenseDate(exp.date);
        if (start && ts < start) return false;
        if (end   && ts > end)   return false;
        return true;
    });
}

function getTimeDisplayFormats(range) {
    switch (range) {
        case '3 Months': return { week: 'MMM d' };
        case '6 Months':
        case '1 Year':
        case 'All Time': return { month: 'MMM yyyy' };
        default:         return { day: 'MMM d' };
    }
}

// ─── Group Expenses By Date ──────────────────────────────────────────────────

function getDailyGroupedData(expenses) {
    var map = {};
    expenses.forEach(function(exp) {
        var dStr = exp.date;
        if (!map[dStr]) {
            map[dStr] = {
                dateStr:  dStr,
                dateObj:  parseExpenseDate(dStr),
                total:    0,
                expenses: []
            };
        }
        map[dStr].total += exp.amount;
        map[dStr].expenses.push(exp);
    });
    // YYYY-MM-DD strings sort chronologically with localeCompare
    var sortedDates = Object.keys(map).sort(function(a, b) { return a.localeCompare(b); });
    return sortedDates.map(function(d) { return map[d]; });
}

// ─── Time Range Filter Buttons ───────────────────────────────────────────────

function renderTimeRangeFilters() {
    var container = document.getElementById('chart-range-filters');
    if (!container) return;

    var html = '';
    TIME_RANGES.forEach(function(r) {
        var active = r.value === activeTimeRange ? ' active' : '';
        html += '<button class="chart-range-btn' + active + '" data-range="' + r.value + '">' + r.label + '</button>';
    });
    html += '<div class="custom-range-picker hidden" id="custom-range-picker">' +
            '<input type="date" id="custom-range-start" class="custom-range-input">' +
            '<span class="custom-range-sep">to</span>' +
            '<input type="date" id="custom-range-end" class="custom-range-input">' +
            '<button class="btn btn-primary btn-sm" id="custom-range-apply">Apply</button>' +
            '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.chart-range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var range = btn.getAttribute('data-range');
            activeTimeRange = range;
            container.querySelectorAll('.chart-range-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var picker = document.getElementById('custom-range-picker');
            if (range === 'Custom') {
                if (picker) picker.classList.remove('hidden');
            } else {
                if (picker) picker.classList.add('hidden');
                renderSpendingChart();
            }
        });
    });

    var applyBtn = document.getElementById('custom-range-apply');
    if (applyBtn) applyBtn.addEventListener('click', function() { renderSpendingChart(); });
}

// ─── Spending Trend Line Chart ────────────────────────────────────────────────

function renderSpendingChart() {
    var canvas     = document.getElementById('spending-chart');
    var container  = document.getElementById('spending-chart-container');
    var emptyState = document.getElementById('chart-empty-state');
    if (!canvas || !container) return;
    if (typeof Chart === 'undefined') { console.warn('charts.js: Chart.js not loaded'); return; }
    if (typeof currentUser === 'undefined' || !currentUser) return;

    var customStart = null, customEnd = null;
    if (activeTimeRange === 'Custom') {
        var startEl = document.getElementById('custom-range-start');
        var endEl   = document.getElementById('custom-range-end');
        customStart = startEl ? startEl.value : null;
        customEnd   = endEl   ? endEl.value   : null;
    }

    var expenses = getFilteredChartExpenses(activeTimeRange, customStart, customEnd);

    if (expenses.length === 0) {
        container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        if (spendingChart) { spendingChart.destroy(); spendingChart = null; }
        return;
    }

    container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    var groupedData     = getDailyGroupedData(expenses);
    var colors          = getChartColors();
    var budget          = (typeof userMonthlyBudget !== 'undefined') ? userMonthlyBudget : 0;
    var hasBudget       = budget > 0;
    var displayFormats  = getTimeDisplayFormats(activeTimeRange);

    var spendingPoints = groupedData.map(function(g) {
        return { x: g.dateObj, y: g.total, dateStr: g.dateStr, groupedInfo: g };
    });

    var cum = 0;
    var remainingPoints = groupedData.map(function(g) {
        cum += g.total;
        return { x: g.dateObj, y: Math.max(0, budget - cum) };
    });

    // Destroy previous instance — prevents "Canvas is already in use" error
    if (spendingChart) { spendingChart.destroy(); spendingChart = null; }

    var ctx      = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 300);
    gradient.addColorStop(0, colors.lineGradientTop);
    gradient.addColorStop(1, colors.lineGradientBottom);

    var datasets = [{
        label:                'Spending Trend',
        data:                 spendingPoints,
        borderColor:          colors.lineColor,
        backgroundColor:      gradient,
        fill:                 true,
        tension:              0.3,
        borderWidth:          3,
        pointBackgroundColor: colors.pointColor,
        pointBorderColor:     '#ffffff',
        pointRadius:          5,
        pointHoverRadius:     9,
        pointBorderWidth:     2
    }];

    if (hasBudget) {
        datasets.push({
            label:                'Remaining Budget',
            data:                 remainingPoints,
            borderColor:          colors.remainingLine,
            backgroundColor:      'transparent',
            borderDash:           [5, 5],
            fill:                 false,
            tension:              0.3,
            borderWidth:          2,
            pointRadius:          3,
            pointHoverRadius:     6,
            pointBackgroundColor: colors.remainingLine,
            pointBorderColor:     '#ffffff',
            pointBorderWidth:     1
        });
    }

    spendingChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            interaction: {
                mode:      'nearest',
                intersect: true
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit:           'day',
                        displayFormats: displayFormats,
                        tooltipFormat:  'd MMMM yyyy'
                    },
                    grid:   { color: colors.gridColor, drawBorder: false },
                    ticks:  {
                        color:         colors.tickColor,
                        font:          { family: "'Inter', sans-serif", size: 11 },
                        maxRotation:   0,
                        autoSkip:      true,
                        maxTicksLimit: 10
                    },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid:        { color: colors.gridColor, drawBorder: false },
                    ticks:       {
                        color:    colors.tickColor,
                        font:     { family: "'Inter', sans-serif", size: 11 },
                        callback: function(value) {
                            return '\u20B9' + value.toLocaleString('en-IN');
                        }
                    },
                    border: { display: false }
                }
            },
            plugins: {
                legend: {
                    display:  hasBudget,
                    position: 'top',
                    labels:   {
                        color:         colors.tickColor,
                        font:          { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled:         true,
                    backgroundColor: colors.tooltipBg,
                    titleColor:      colors.tooltipText,
                    bodyColor:       colors.tooltipText,
                    borderColor:     colors.tooltipBorder,
                    borderWidth:     1,
                    cornerRadius:    10,
                    padding:         14,
                    titleFont:       { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont:        { family: "'Inter', sans-serif", size: 12 },
                    displayColors:   false,
                    callbacks: {
                        title: function(context) {
                            var pt = context[0];
                            if (pt && pt.raw && pt.raw.groupedInfo) {
                                return formatDateFull(pt.raw.groupedInfo.dateObj);
                            }
                            return '';
                        },
                        label: function(context) {
                            var raw = context.raw;
                            if (context.datasetIndex === 1) {
                                return 'Remaining Budget: \u20B9' + raw.y.toLocaleString('en-IN');
                            }
                            if (!raw || !raw.groupedInfo) return '';
                            var g     = raw.groupedInfo;
                            var lines = ['Total Spent: \u20B9' + g.total.toLocaleString('en-IN'), ''];
                            g.expenses.forEach(function(exp) {
                                var icon = CATEGORY_ICONS[exp.category] || '\uD83D\uDCE6';
                                lines.push(icon + ' ' + exp.category + ': \u20B9' + exp.amount.toLocaleString('en-IN'));
                                if (exp.description && exp.description !== exp.category) {
                                    lines.push('   ' + exp.description);
                                }
                            });
                            return lines;
                        }
                    }
                }
            },
            onClick: function(e, elements) { handleChartPointClick(e, elements); }
        }
    });
}

// ─── Graph Point Click → Detail Popup ────────────────────────────────────────

function handleChartPointClick(event, elements) {
    if (!elements || elements.length === 0) return;
    var clicked = elements[0];
    if (clicked.datasetIndex !== 0) return;
    var dataPoint = spendingChart.data.datasets[0].data[clicked.index];
    if (!dataPoint) return;
    var dateStr = dataPoint.dateStr || (dataPoint.groupedInfo ? dataPoint.groupedInfo.dateStr : null);
    if (!dateStr) return;
    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var groupExps = exps.filter(function(exp) { return exp.date === dateStr; });
    if (groupExps.length === 0) return;
    var canvasRect = spendingChart.canvas.getBoundingClientRect();
    showGraphPopup(dateStr, groupExps, canvasRect.left + clicked.element.x, canvasRect.top + clicked.element.y);
}

function showGraphPopup(dateStr, expenses, anchorX, anchorY) {
    var overlay = document.getElementById('graph-popup-overlay');
    var popup   = document.getElementById('graph-popup');
    if (!overlay || !popup) return;

    var dateObj    = parseExpenseDate(dateStr);
    var totalSpent = expenses.reduce(function(s, e) { return s + e.amount; }, 0);

    var html = '<div class="graph-popup-header">' +
        '<div class="graph-popup-datetime"><span class="graph-popup-date">' + formatDateFull(dateObj) + '</span></div>' +
        '<button class="graph-popup-close" id="graph-popup-close">&times;</button>' +
        '</div><div class="graph-popup-body">' +
        '<div class="graph-popup-total-bar">' +
        '<span>Total Spent:</span><strong>\u20B9' + totalSpent.toLocaleString('en-IN') + '</strong>' +
        '</div><div class="graph-popup-list">';

    expenses.forEach(function(exp) {
        var icon = CATEGORY_ICONS[exp.category] || '\uD83D\uDCE6';
        html += '<div class="graph-popup-item-row">' +
            '<div class="popup-item-info">' +
            '<span class="popup-item-cat">' + icon + ' ' + escapeHtml(exp.category) + '</span>' +
            '<span class="popup-item-desc">' + escapeHtml(exp.description) + '</span>' +
            '<span class="popup-item-payment">' + escapeHtml(exp.paymentMethod || '') + '</span>' +
            '</div><div class="popup-item-right">' +
            '<span class="popup-item-amount">\u20B9' + exp.amount.toLocaleString('en-IN') + '</span>' +
            '<button class="btn-action btn-edit btn-sm" data-popup-action="edit" data-expense-id="' + exp.id + '" title="Edit">\u270F\uFE0F</button>' +
            '<button class="btn-action btn-delete btn-sm" data-popup-action="delete" data-expense-id="' + exp.id + '" title="Delete">\uD83D\uDDD1\uFE0F</button>' +
            '</div></div>';
    });

    html += '</div></div>';
    popup.innerHTML = html;
    positionPopup(popup, anchorX, anchorY);

    overlay.classList.remove('hidden');
    popup.classList.remove('hidden');
    requestAnimationFrame(function() {
        overlay.classList.add('visible');
        popup.classList.add('visible');
    });

    var closeBtn = document.getElementById('graph-popup-close');
    if (closeBtn) closeBtn.addEventListener('click', closeGraphPopup);
    overlay.addEventListener('click', closeGraphPopup);

    popup.querySelectorAll('[data-popup-action]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = btn.getAttribute('data-popup-action');
            var id     = btn.getAttribute('data-expense-id');
            if (action === 'edit')   showGraphEditForm(id);
            if (action === 'delete') handleGraphDelete(id);
        });
    });
}

function positionPopup(popup, anchorX, anchorY) {
    var vW = window.innerWidth, vH = window.innerHeight;
    if (vW < 640) {
        popup.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:calc(100vw - 32px);max-height:calc(100vh - 64px);';
        return;
    }
    popup.style.position  = 'fixed';
    popup.style.transform = '';
    popup.style.visibility = 'hidden'; popup.style.display = 'block';
    var pr = popup.getBoundingClientRect();
    popup.style.visibility = ''; popup.style.display = '';
    var left = anchorX - pr.width / 2;
    var top  = anchorY + 16;
    if (top  + pr.height > vH - 16) top  = anchorY - pr.height - 16;
    if (left < 16)                  left = 16;
    if (left + pr.width > vW - 16)  left = vW - pr.width - 16;
    if (top  < 16)                  top  = 16;
    popup.style.left = left + 'px';
    popup.style.top  = top  + 'px';
}

function closeGraphPopup() {
    var overlay = document.getElementById('graph-popup-overlay');
    var popup   = document.getElementById('graph-popup');
    if (overlay) { overlay.classList.remove('visible'); setTimeout(function() { overlay.classList.add('hidden'); }, 200); }
    if (popup)   { popup.classList.remove('visible');   setTimeout(function() { popup.classList.add('hidden');   }, 200); }
}

// ─── Edit from Graph Popup ───────────────────────────────────────────────────

function showGraphEditForm(expenseId) {
    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var exp  = exps.find(function(e) { return e.id === expenseId; });
    if (!exp) return;
    var popup = document.getElementById('graph-popup');
    if (!popup) return;

    var cats = ['Food','Transport','Shopping','Bills','Education','Entertainment','Health','Travel','Other'];
    var catOpts = cats.map(function(c) {
        return '<option value="' + c + '"' + (c === exp.category ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    var pms = ['Cash','UPI','Debit Card','Credit Card','Bank Transfer','Other'];
    var pmOpts = pms.map(function(p) {
        return '<option value="' + p + '"' + (p === exp.paymentMethod ? ' selected' : '') + '>' + p + '</option>';
    }).join('');

    popup.innerHTML =
        '<div class="graph-popup-header">' +
        '<div class="graph-popup-datetime"><span class="graph-popup-date">\u270F\uFE0F Edit Expense</span></div>' +
        '<button class="graph-popup-close" id="graph-popup-close">&times;</button>' +
        '</div><div class="graph-popup-body">' +
        '<form id="graph-edit-form" class="graph-edit-form">' +
        '<input type="hidden" id="graph-edit-id" value="' + exp.id + '">' +
        '<div class="graph-edit-row"><label>Amount (\u20B9)</label>' +
        '<input type="number" id="graph-edit-amount" value="' + exp.amount + '" min="0.01" step="0.01" required></div>' +
        '<div class="graph-edit-row"><label>Category</label>' +
        '<select id="graph-edit-category" required>' + catOpts + '</select></div>' +
        '<div class="graph-edit-row"><label>Date</label>' +
        '<input type="date" id="graph-edit-date" value="' + exp.date + '" required></div>' +
        '<div class="graph-edit-row"><label>Payment Method</label>' +
        '<select id="graph-edit-payment">' + pmOpts + '</select></div>' +
        '<div class="graph-edit-row"><label>Description</label>' +
        '<input type="text" id="graph-edit-description" value="' + escapeHtml(exp.description) + '"></div>' +
        '<div class="graph-edit-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm" id="graph-edit-cancel">Cancel</button>' +
        '<button type="submit" class="btn btn-primary btn-sm">\uD83D\uDCBE Save Changes</button>' +
        '</div></form></div>';

    var cb = document.getElementById('graph-popup-close');
    var cc = document.getElementById('graph-edit-cancel');
    var fm = document.getElementById('graph-edit-form');
    if (cb) cb.addEventListener('click', closeGraphPopup);
    if (cc) cc.addEventListener('click', closeGraphPopup);
    if (fm) fm.addEventListener('submit', function(e) { e.preventDefault(); handleGraphEditSave(); });
}

async function handleGraphEditSave() {
    var id   = document.getElementById('graph-edit-id').value;
    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var idx  = exps.findIndex(function(e) { return e.id === id; });
    if (idx === -1) { showToast('Expense not found.', 'danger'); return; }

    var newDate = document.getElementById('graph-edit-date').value;
    var newAmt  = parseFloat(document.getElementById('graph-edit-amount').value);
    var newCat  = document.getElementById('graph-edit-category').value;
    var newDesc = document.getElementById('graph-edit-description').value.trim();
    var newPay  = document.getElementById('graph-edit-payment').value;

    if (!newDate || isNaN(newAmt) || newAmt <= 0 || !newCat) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }

    userExpenses[idx] = Object.assign({}, userExpenses[idx], {
        date: newDate, amount: newAmt, category: newCat,
        description: newDesc || newCat, paymentMethod: newPay
    });

    var ok = await dbUpdateExpense(id, userExpenses[idx]);
    renderExpenses();
    updateDashboard();
    closeGraphPopup();
    showToast(ok ? 'Expense updated successfully.' : 'Saved on this screen only — database update failed.', ok ? 'success' : 'warning');
}

// ─── Delete from Graph Popup ─────────────────────────────────────────────────

function handleGraphDelete(expenseId) {
    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var exp  = exps.find(function(e) { return e.id === expenseId; });
    if (!exp) return;

    showConfirmModal(
        'Delete this expense?',
        formatDateShort(parseExpenseDate(exp.date)) +
            '<br>' + escapeHtml(exp.category) + ' \u2014 \u20B9' + exp.amount.toLocaleString('en-IN') +
            '<br><em>' + escapeHtml(exp.description) + '</em>',
        async function() {
            userExpenses = userExpenses.filter(function(e) { return e.id !== expenseId; });
            var ok = await dbDeleteExpense(expenseId);
            if (typeof editExpenseId !== 'undefined' && editExpenseId === expenseId && typeof cancelEdit === 'function') cancelEdit();
            renderExpenses();
            updateDashboard();
            closeGraphPopup();
            showToast(ok ? 'Expense deleted successfully.' : 'Delete failed — please try again.', ok ? 'success' : 'danger');
        }
    );
}

// ─── Category Doughnut Chart ─────────────────────────────────────────────────

function renderCategoryChart() {
    var canvas   = document.getElementById('category-chart');
    var container= document.getElementById('category-chart-container');
    var callout  = document.getElementById('top-category-callout');
    var listCont = document.getElementById('category-expenses-list');
    if (!canvas || !container) return;
    if (typeof Chart === 'undefined') return;

    if (listCont) { listCont.classList.add('hidden'); listCont.innerHTML = ''; }

    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var catTotals = {};
    exps.forEach(function(exp) { catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount; });

    var cats = Object.keys(catTotals).sort(function(a, b) { return catTotals[b] - catTotals[a]; });
    if (cats.length === 0) {
        if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
        container.classList.add('hidden');
        if (callout) callout.innerHTML = '';
        return;
    }
    container.classList.remove('hidden');

    var labels     = cats;
    var data       = cats.map(function(c) { return catTotals[c]; });
    var bgColors   = cats.map(function(c) { return CATEGORY_COLORS[c] || '#64748b'; });
    var hoverColors= bgColors.map(function(c) { return c + 'cc'; });
    var colors     = getChartColors();

    // Destroy previous before creating new
    if (categoryChart) { categoryChart.destroy(); categoryChart = null; }

    var ctx = canvas.getContext('2d');
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels:   labels,
            datasets: [{
                data:                data,
                backgroundColor:     bgColors,
                hoverBackgroundColor:hoverColors,
                borderWidth:         2,
                borderColor:         isDarkMode() ? '#1e293b' : '#ffffff',
                hoverBorderWidth:    3,
                hoverOffset:         8
            }]
        },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            cutout:              '58%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color:           colors.tickColor,
                        font:            { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        padding:         16,
                        usePointStyle:   true,
                        pointStyleWidth: 12
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor:      colors.tooltipText,
                    bodyColor:       colors.tooltipText,
                    borderColor:     colors.tooltipBorder,
                    borderWidth:     1,
                    cornerRadius:    10,
                    padding:         12,
                    titleFont:       { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont:        { family: "'Inter', sans-serif", size: 12 },
                    displayColors:   true,
                    callbacks: {
                        label: function(context) {
                            var total = context.dataset.data.reduce(function(s, v) { return s + v; }, 0);
                            var pct   = ((context.raw / total) * 100).toFixed(1);
                            return ' \u20B9' + context.raw.toLocaleString('en-IN') + ' (' + pct + '%)';
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length === 0) return;
                showCategoryExpenses(labels[elements[0].index]);
            }
        }
    });

    if (callout && cats.length > 0) {
        var topCat  = cats[0];
        var topIcon = CATEGORY_ICONS[topCat] || '\uD83D\uDCE6';
        callout.innerHTML = '\uD83D\uDD25 You spent the most on <strong>' +
            topIcon + ' ' + topCat + ' \u2014 \u20B9' + catTotals[topCat].toLocaleString('en-IN') + '</strong>';
    }
}

// ─── Category Click → Expense List ───────────────────────────────────────────

function showCategoryExpenses(category) {
    var listCont = document.getElementById('category-expenses-list');
    if (!listCont) return;

    var exps = (typeof userExpenses !== 'undefined') ? userExpenses : [];
    var catExps = exps
        .filter(function(e) { return e.category === category; })
        .sort(function(a, b) { return b.date.localeCompare(a.date); });

    if (catExps.length === 0) { listCont.classList.add('hidden'); return; }

    var icon  = CATEGORY_ICONS[category] || '\uD83D\uDCE6';
    var total = catExps.reduce(function(s, e) { return s + e.amount; }, 0);

    var html = '<div class="cat-list-header"><h4>' +
        icon + ' ' + escapeHtml(category) + ' \u2014 \u20B9' + total.toLocaleString('en-IN') +
        '</h4><button class="graph-popup-close cat-list-close" id="cat-list-close">&times;</button></div>' +
        '<div class="cat-list-items">';

    catExps.forEach(function(exp) {
        html += '<div class="cat-list-item">' +
            '<div class="cat-list-item-info">' +
            '<span class="cat-list-item-date">' + formatDateShort(parseExpenseDate(exp.date)) + '</span>' +
            '<span class="cat-list-item-desc">' + escapeHtml(exp.description) + '</span>' +
            '</div><div class="cat-list-item-right">' +
            '<span class="cat-list-item-amount">\u20B9' + exp.amount.toLocaleString('en-IN') + '</span>' +
            '<button class="btn-action btn-edit btn-sm" data-cat-edit="' + exp.id + '" title="Edit">\u270F\uFE0F</button>' +
            '</div></div>';
    });

    html += '</div>';
    listCont.innerHTML = html;
    listCont.classList.remove('hidden');

    var cb = document.getElementById('cat-list-close');
    if (cb) cb.addEventListener('click', function() { listCont.classList.add('hidden'); });

    listCont.querySelectorAll('[data-cat-edit]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-cat-edit');
            if (typeof editExpense === 'function') editExpense(id);
            listCont.classList.add('hidden');
        });
    });
}

// ─── Theme Observer ──────────────────────────────────────────────────────────

function setupChartThemeObserver() {
    var observer = new MutationObserver(function() {
        renderSpendingChart();
        renderCategoryChart();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// ─── Public Refresh (called by dashboard.js) ──────────────────────────────────

function refreshCharts() {
    renderSpendingChart();
    renderCategoryChart();
}

// ─── Initialize ───────────────────────────────────────────────────────────────

function initCharts() {
    if (typeof Chart === 'undefined') { console.warn('charts.js: Chart.js not loaded'); return; }
    if (!document.getElementById('spending-chart')) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;

    renderTimeRangeFilters();
    renderSpendingChart();
    renderCategoryChart();
    setupChartThemeObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts);
} else {
    initCharts();
}
