// ======== ГЛОБАЛЬНЫЕ ДАННЫЕ ========
let currentTab = null;
let data = { users: [], roomPassword: null };
let currentViewMonth = new Date();
let settingsExpanded = false;
let addSectionExpanded = false;
let excelData = null;
let filterByDay = null;

const defaultCategories = ['🍔 Еда', '🚗 Транспорт', '🛒 Продукты', '🎮 Развлечения', '👕 Одежда', '💊 Здоровье', '🏠 Дом', '📦 Маркетплейсы'];
const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const paymentCategories = {
    housing: { icon: '🏠', name: 'Жильё' },
    utilities: { icon: '💡', name: 'Коммуналка' },
    transport: { icon: '🚗', name: 'Транспорт' },
    communication: { icon: '📱', name: 'Связь' },
    subscriptions: { icon: '📺', name: 'Подписки' },
    credits: { icon: '💳', name: 'Кредиты' },
    insurance: { icon: '🛡️', name: 'Страховки' },
    education: { icon: '🎓', name: 'Образование' },
    health: { icon: '🏥', name: 'Здоровье' },
    other: { icon: '📦', name: 'Прочее' }
};

const CATEGORY_ALIASES = {
    // Транспорт
    'transport': '🚗 Транспорт',
    'trans': '🚗 Транспорт',
    'transportation': '🚗 Транспорт',
    'transit': '🚗 Транспорт',
    'tpp_transport': '🚗 Транспорт: Общественный',
    'ru/yaroslavl/tpp_transport': '🚗 Транспорт: Общественный',
    'transport_card': '🚗 Транспорт: Общественный',
    'transport card': '🚗 Транспорт: Общественный',
    'bus': '🚗 Транспорт: Общественный',
    'metro': '🚗 Транспорт: Общественный',
    'tram': '🚗 Транспорт: Общественный',
    'train': '🚗 Транспорт: Поезда',
    'subway': '🚗 Транспорт: Метро',
    'транспорт': '🚗 Транспорт',
    'общественный': '🚗 Транспорт: Общественный',
    'автобус': '🚗 Транспорт: Общественный',
    'маршрутка': '🚗 Транспорт: Общественный',
    'поезд': '🚗 Транспорт: Поезда',
    'taxi': '🚗 Транспорт: Такси',
    'cab': '🚗 Транспорт: Такси',
    'такси': '🚗 Транспорт: Такси',
    'fuel': '🚗 Транспорт: Топливо',
    'fuel station': '🚗 Транспорт: Топливо',
    'benzin': '🚗 Транспорт: Топливо',
    'бензин': '🚗 Транспорт: Топливо',
    'gas': '🚗 Транспорт: Топливо',
    'azs': '🚗 Транспорт: АЗС',
    'азс': '🚗 Транспорт: АЗС',
    'lukoil': '🚗 Транспорт: Лукойл',
    'tatneft': '🚗 Транспорт: Татнефть',
    'gazprom': '🚗 Транспорт: Газпромнефть',
    'rosneft': '🚗 Транспорт: Роснефть',
    'car': '🚗 Транспорт',

    // Продукты и магазины (чтобы в бюджете были конкретные магазины)
    'pyaterochka': '🛒 Продукты: Пятёрочка',
    '5ka': '🛒 Продукты: Пятёрочка',
    'pyatero': '🛒 Продукты: Пятёрочка',
    'magnit': '🛒 Продукты: Магнит',
    'magnet': '🛒 Продукты: Магнит',
    'mgnit': '🛒 Продукты: Магнит',
    'perekrestok': '🛒 Продукты: Перекрёсток',
    'perek': '🛒 Продукты: Перекрёсток',
    'lenta': '🛒 Продукты: Лента',
    'vkusvill': '🛒 Продукты: ВкусВилл',
    'samokat': '🛒 Продукты: Самокат',
    'azbuka': '🛒 Продукты: Азбука вкуса',
    'spar': '🛒 Продукты: Spar',
    'globus': '🛒 Продукты: Глобус',
    'fix price': '🛒 Продукты: Fix Price',
    'fixprice': '🛒 Продукты: Fix Price',
    'okey': '🛒 Продукты: O\'Кей',
    'okay': '🛒 Продукты: O\'Кей',
    'metro cash': '🛒 Продукты: METRO',
    'bristol': '🛒 Продукты: Бристоль',
    'diksi': '🛒 Продукты: Дикси',
    'dixy': '🛒 Продукты: Дикси',
    'auchan': '🛒 Продукты: Ашан',
    'ashan': '🛒 Продукты: Ашан',
    'ashan city': '🛒 Продукты: Ашан',

    // Кофе и еда
    'coffee': '☕ Кофе',
    'kofe': '☕ Кофе',
    'кофе': '☕ Кофе',
    'cafe': '🍔 Еда',
    'ресторан': '🍔 Еда',
    'restaurant': '🍔 Еда',
    'fastfood': '🍔 Еда',
    'додо': '🍔 Еда',
    'dodopizza': '🍔 Еда',
    'burger king': '🍔 Еда',
    'kfc': '🍔 Еда',

    // Прочее
    'apteka': '💊 Здоровье',
    'аптека': '💊 Здоровье',
    'pharmacy': '💊 Здоровье'
};

const emojiRegex = /[\p{Extended_Pictographic}]/u;
function normalizeCategoryLabel(label = '') {
    const lower = label.toLowerCase();
    for (const [key, value] of Object.entries(CATEGORY_ALIASES)) {
        if (lower === key || lower.startsWith(key + ' ') || lower.includes(key)) return value;
    }
    return label;
}
function parseCategoryLabel(description = '') {
    const trimmed = description.trim();
    if (!trimmed) return { main: 'Другое', sub: null };
    const colonParts = trimmed.split(':');
    if (colonParts.length > 1) {
        const main = normalizeCategoryLabel(colonParts[0].trim());
        return {
            main,
            sub: colonParts.slice(1).join(':').trim() || null
        };
    }
    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2 && emojiRegex.test(tokens[0])) {
        return {
            main: `${tokens[0]} ${tokens[1]}`.trim(),
            sub: tokens.slice(2).join(' ').trim() || null
        };
    }
    return { main: normalizeCategoryLabel(trimmed), sub: null };
}

// ======== FIREBASE ========
let db = null, currentRoomId = null, dataRef = null;
const firebaseConfig = { databaseURL: 'https://budg-1d5e0-default-rtdb.europe-west1.firebasedatabase.app' };

(function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }
})();

// ======== УТИЛИТЫ ДАННЫХ ========
function getUsers() { return Array.isArray(data.users) ? data.users : []; }
function getUserById(id) { return getUsers().find(u => u.id === id); }
function getCurrentUser() { return getUserById(currentTab); }
function createEmptyUser(name) {
    return {
        id: 'user_' + Date.now(),
        name,
        settings: { savingsPercent: 0 },
        fixedPayments: [],
        expenses: [],
        incomes: [],
        customCategories: []
    };
}

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
function getMonthExpenses(userId = null) {
    const monthKey = getMonthKey(currentViewMonth);
    const user = userId ? getUserById(userId) : getCurrentUser();
    const expenses = user?.expenses || [];
    return expenses.filter(e => e.date?.startsWith(monthKey));
}
function getMonthIncomes(userId = null) {
    const monthKey = getMonthKey(currentViewMonth);
    const user = userId ? getUserById(userId) : getCurrentUser();
    const incomes = user?.incomes || [];
    return incomes.filter(i => i.date?.startsWith(monthKey));
}
function getTotalMonthIncome(userId = null) {
    return getMonthIncomes(userId).reduce((sum, i) => sum + i.amount, 0);
}

// ======== ПОЛЬЗОВАТЕЛИ ========
function showAddUserModal() {
    document.getElementById('addUserModal').classList.remove('hidden');
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserName').focus();
}
function closeAddUserModal() { document.getElementById('addUserModal').classList.add('hidden'); }
function confirmAddUser() {
    const name = document.getElementById('newUserName').value.trim();
    if (!name) return alert('Введите имя');
    addUser(name);
    closeAddUserModal();
}
function addUser(name) {
    const newUser = createEmptyUser(name);
    if (!Array.isArray(data.users)) data.users = [];
    data.users.push(newUser);
    currentTab = newUser.id;
    syncData();
    renderTabs();
    renderAll();
    renderSettingsSection();
}
function createUserFromSettings() {
    const input = document.getElementById('settingsNewUserName');
    const name = input.value.trim();
    if (!name) return alert('Введите имя');
    addUser(name);
    input.value = '';
}
function deleteCurrentUser() {
    const user = getCurrentUser();
    if (!user) return;
    if (!confirm(`Удалить пользователя "${user.name}" и все его данные?`)) return;
    data.users = data.users.filter(u => u.id !== user.id);
    currentTab = data.users.length > 0 ? data.users[0].id : null;
    syncData();
    renderTabs();
    renderAll();
    renderSettingsSection();
}

// ======== ВКЛАДКИ ========
function renderTabs() {
    const container = document.getElementById('tabsContainer');
    const users = getUsers();
    let html = '';
    users.forEach(user => {
        const active = currentTab === user.id;
        html += `<button onclick="switchTab('${user.id}')" class="tab-btn ${active ? 'active bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-4 py-2 rounded-full font-medium transition-colors">👤 ${user.name}</button>`;
    });
    if (users.length > 1) {
        const isTotal = currentTab === 'total';
        html += `<button onclick="switchTab('total')" class="tab-btn ${isTotal ? 'active bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-4 py-2 rounded-full font-medium transition-colors">👨‍👩‍👧 Общее</button>`;
    }
    html += `<button onclick="showAddUserModal()" class="tab-btn bg-gray-200 text-gray-600 px-4 py-2 rounded-full font-medium hover:bg-gray-300 transition-colors">+ Добавить</button>`;
    container.innerHTML = html;
}
function switchTab(tabId) {
    currentTab = tabId;
    document.getElementById('personalContent').classList.toggle('hidden', tabId === 'total');
    document.getElementById('totalContent').classList.toggle('hidden', tabId !== 'total');
    renderTabs();
    renderAll();
    renderSettingsSection();
}

// ======== НАСТРОЙКИ ========
function getCurrentSettings() { const user = getCurrentUser(); return user?.settings || { savingsPercent: 0 }; }
function toggleSettings() {
    settingsExpanded = !settingsExpanded;
    document.getElementById('settingsContent').classList.toggle('hidden', !settingsExpanded);
    document.getElementById('toggleSettingsBtn').textContent = settingsExpanded ? 'Свернуть ▲' : 'Развернуть ▼';
}
function toggleAddSection() {
    addSectionExpanded = !addSectionExpanded;
    document.getElementById('addSectionContent').classList.toggle('hidden', !addSectionExpanded);
    document.getElementById('toggleAddBtn').textContent = addSectionExpanded ? 'Свернуть ▲' : 'Развернуть ▼';
}
function updateSettings() {
    const user = getCurrentUser();
    if (!user) return;
    user.settings.savingsPercent = parseFloat(document.getElementById('savingsPercent').value) || 0;
    syncData();
    renderAll();
}
function renderSettingsSection() {
    const user = getCurrentUser();
    const deleteSection = document.getElementById('deleteUserSection');
    const userName = document.getElementById('currentUserName');
    if (user) {
        deleteSection.classList.remove('hidden');
        userName.textContent = `👤 ${user.name}`;
    } else {
        deleteSection.classList.add('hidden');
    }
}

// ======== ПРИХОДЫ / РАСХОДЫ ========
function getCurrentFixedPayments() { const user = getCurrentUser(); return Array.isArray(user?.fixedPayments) ? user.fixedPayments : []; }
function getCurrentExpenses() { const user = getCurrentUser(); return Array.isArray(user?.expenses) ? user.expenses : []; }
function getCurrentIncomes() { const user = getCurrentUser(); return Array.isArray(user?.incomes) ? user.incomes : []; }

function addIncome() {
    const user = getCurrentUser();
    if (!user) return alert('Сначала добавьте пользователя');
    const date = document.getElementById('incomeDate').value;
    const description = document.getElementById('incomeDescription').value.trim() || '💵 Поступление';
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    if (!date || !amount || amount <= 0) return alert('Введите дату и сумму');
    if (!Array.isArray(user.incomes)) user.incomes = [];
    user.incomes.push({ id: Date.now(), date, description, amount: Math.round(amount * 100) / 100 });
    document.getElementById('incomeDescription').value = '';
    document.getElementById('incomeAmount').value = '';
    currentViewMonth = new Date(date);
    syncData();
    renderAll();
}
function removeIncome(id) {
    const user = getCurrentUser();
    if (!user) return;
    user.incomes = user.incomes.filter(i => i.id !== id);
    syncData();
    renderAll();
}
function addExpense() {
    const user = getCurrentUser();
    if (!user) return alert('Сначала добавьте пользователя');
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    if (!date || !description || !amount || amount <= 0) return alert('Заполните все поля');
    if (!Array.isArray(user.expenses)) user.expenses = [];
    user.expenses.push({ id: Date.now(), date, description, amount });
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    currentViewMonth = new Date(date);
    syncData();
    renderAll();
}
function removeExpense(id) {
    const user = getCurrentUser();
    if (!user) return;
    user.expenses = user.expenses.filter(e => e.id !== id);
    syncData();
    renderAll();
}
function quickCategory(category) {
    document.getElementById('expenseDescription').value = category;
    document.getElementById('expenseAmount').focus();
}

// ======== ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ ========
function addFixedPayment() {
    const user = getCurrentUser();
    if (!user) return;
    const category = document.getElementById('newPaymentCategory').value;
    const name = document.getElementById('newPaymentName').value.trim();
    const amount = parseFloat(document.getElementById('newPaymentAmount').value);
    if (!name || !amount || amount <= 0) return alert('Введите название и сумму');
    if (!Array.isArray(user.fixedPayments)) user.fixedPayments = [];
    user.fixedPayments.push({ id: Date.now(), category, name, amount });
    document.getElementById('newPaymentName').value = '';
    document.getElementById('newPaymentAmount').value = '';
    syncData();
    renderAll();
}
function removeFixedPayment(id) {
    const user = getCurrentUser();
    if (!user) return;
    user.fixedPayments = user.fixedPayments.filter(p => p.id !== id);
    syncData();
    renderAll();
}
function getTotalFixedPayments(userId = null) {
    const user = userId ? getUserById(userId) : getCurrentUser();
    const payments = user?.fixedPayments || [];
    return payments.reduce((sum, p) => sum + p.amount, 0);
}

// ======== РАСЧЁТЫ ========
function calculateBudget(userId = null) {
    const user = userId ? getUserById(userId) : getCurrentUser();
    if (!user) return { totalIncome: 0, monthIncome: 0, savings: 0, fixedTotal: 0, available: 0, dailyLimit: 0, totalSpent: 0, currentBalance: 0 };
    const settings = user.settings || { savingsPercent: 0 };
    const fixedTotal = getTotalFixedPayments(userId);
    const allIncomes = user.incomes || [];
    const allExpenses = user.expenses || [];
    const totalIncome = allIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalAllSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthIncome = getTotalMonthIncome(userId);
    const monthExpenses = getMonthExpenses(userId);
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const savings = monthIncome * (settings.savingsPercent / 100);
    const available = monthIncome - savings - fixedTotal;
    const days = getDaysInMonth(currentViewMonth);
    const dailyLimit = days > 0 ? available / days : 0;
    const currentBalance = totalIncome - totalAllSpent;
    return {
        totalIncome: Math.round(totalIncome * 100) / 100,
        monthIncome: Math.round(monthIncome * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        fixedTotal: Math.round(fixedTotal * 100) / 100,
        available: Math.round(available * 100) / 100,
        dailyLimit: Math.round(dailyLimit * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100
    };
}

// ======== РЕНДЕРИНГ ========
function renderAll() {
    renderCurrentMonth();
    if (currentTab === 'total') {
        renderTotalTab();
    } else if (getCurrentUser()) {
        renderBudgetInfo();
        renderCategoryChips();
        renderCalendar();
        renderDailyTable();
        renderCategoryStats();
        renderFixedPayments();
    }
}
function renderCurrentMonth() {
    const el = document.getElementById('currentMonth');
    el.textContent = `${monthNames[currentViewMonth.getMonth()]} ${currentViewMonth.getFullYear()}`;
    el.parentElement?.classList.toggle('hidden', el.textContent.trim() === '');
}
function renderBudgetInfo() {
    const budget = calculateBudget();
    const settings = getCurrentSettings();
    document.getElementById('savingsPercent').value = settings.savingsPercent || '';
    document.getElementById('totalIncomeDisplay').textContent = budget.totalIncome.toLocaleString() + ' ₽';
    document.getElementById('savingsAmount').textContent = budget.savings.toLocaleString() + ' ₽';
    document.getElementById('dailyLimit').textContent = budget.dailyLimit.toLocaleString() + ' ₽';
    document.getElementById('actualBalance').textContent = budget.currentBalance.toLocaleString() + ' ₽';
    document.getElementById('fixedTotal').textContent = budget.fixedTotal.toLocaleString() + ' ₽';
}
function renderFixedPayments() {
    const list = document.getElementById('fixedPaymentsList');
    const payments = getCurrentFixedPayments();
    if (payments.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-center py-2 text-sm">Нет платежей</p>';
        return;
    }
    list.innerHTML = payments.map(p => {
        const cat = paymentCategories[p.category] || { icon: '📦' };
        return `<div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
            <div class="flex items-center gap-2"><span>${cat.icon}</span><span class="text-gray-700 text-sm">${p.name}</span></div>
            <div class="flex items-center gap-2"><span class="text-gray-800 font-medium text-sm">${p.amount.toLocaleString()} ₽</span>
            <button onclick="removeFixedPayment(${p.id})" class="text-red-400 hover:text-red-600">✕</button></div>
        </div>`;
    }).join('');
}
function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    container.innerHTML = defaultCategories.map(cat => `<button onclick="quickCategory('${cat}')" class="chip px-3 py-1 rounded-full text-sm font-medium">${cat}</button>`).join('');
}
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const year = currentViewMonth.getFullYear();
    const month = currentViewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;
    const expenses = getMonthExpenses();
    const budget = calculateBudget();
    const map = {};
    expenses.forEach(e => {
        const day = new Date(e.date).getDate();
        map[day] = (map[day] || 0) + e.amount;
    });
    let html = '';
    for (let i = 0; i < startDay; i++) html += '<div class="calendar-day empty"></div>';
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const spent = map[day] || 0;
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const isOver = spent > budget.dailyLimit && budget.dailyLimit > 0;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = filterByDay === dateStr;
        const classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (spent > 0) classes.push(isOver ? 'over-limit' : 'under-limit');
        html += `<div class="${classes.join(' ')}" onclick="handleDayClick('${dateStr}')"><div class="day-number">${day}</div>${spent > 0 ? `<div class="day-amount">${Math.round(spent).toLocaleString()}</div>` : ''}</div>`;
    }
    grid.innerHTML = html;
}
function handleDayClick(dateStr) {
    filterByDay = filterByDay === dateStr ? null : dateStr;
    renderCalendar();
    renderDailyTable();
    renderCategoryStats();
}
function renderDailyTable() {
    const tbody = document.getElementById('dailyTableBody');
    const budget = calculateBudget();
    let monthExpenses = getMonthExpenses();
    let monthIncomes = getMonthIncomes();
    if (filterByDay) {
        monthExpenses = monthExpenses.filter(e => e.date === filterByDay);
        monthIncomes = monthIncomes.filter(i => i.date === filterByDay);
    }
    const allOps = [...monthExpenses.map(e => ({ ...e, type: 'expense' })), ...monthIncomes.map(i => ({ ...i, type: 'income' }))]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    let balance = budget.currentBalance;
    let rows = '';
    allOps.slice(0, 50).forEach(op => {
        const date = new Date(op.date);
        const isIncome = op.type === 'income';
        const dayName = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1] || '';
        rows += `<tr class="border-b border-gray-100 ${isIncome ? 'bg-green-50' : ''}">
            <td class="py-2 px-2">${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')} <span class="text-gray-400 text-xs">${dayName}</span></td>
            <td class="py-2 px-2">${op.description} <button onclick="remove${isIncome ? 'Income' : 'Expense'}(${op.id})" class="text-red-400 hover:text-red-600 ml-1">✕</button></td>
            <td class="py-2 px-2 text-right">${isIncome ? `<span class="text-green-600">+${op.amount.toLocaleString()}</span>` : '—'}</td>
            <td class="py-2 px-2 text-right">${!isIncome ? `<span class="text-red-500">-${op.amount.toLocaleString()}</span>` : '—'}</td>
            <td class="py-2 px-2 text-right font-medium">${balance.toLocaleString()}</td>
        </tr>`;
    });
    tbody.innerHTML = rows || '<tr><td colspan="5" class="text-center py-4 text-gray-400">Нет данных</td></tr>';
}
function renderCategoryStats() {
    const container = document.getElementById('categoryStats');
    const monthExpenses = getMonthExpenses();
    if (monthExpenses.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Добавьте траты для статистики</p>';
        return;
    }
    const categories = {};
    monthExpenses.forEach(expense => {
        const { main, sub } = parseCategoryLabel(expense.description);
        if (!categories[main]) categories[main] = { total: 0, subs: {} };
        categories[main].total += expense.amount;
        if (sub) {
            if (!categories[main].subs[sub]) categories[main].subs[sub] = 0;
            categories[main].subs[sub] += expense.amount;
        }
    });
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const sorted = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);
    container.innerHTML = sorted.map(([category, data]) => {
        const percent = Math.round((data.total / total) * 100);
        const subsHtml = Object.entries(data.subs)
            .sort((a, b) => b[1] - a[1])
            .map(([subName, subAmount]) => `<div class="flex justify-between text-xs text-gray-500"><span>${subName}</span><span>${subAmount.toLocaleString()} ₽</span></div>`)
            .join('');
        return `<div class="bg-gray-50 rounded-lg p-3 border">
            <div class="flex justify-between items-center mb-1">
                <span class="font-medium">${category}</span>
                <span class="text-blue-600 font-medium">${data.total.toLocaleString()} ₽ (${percent}%)</span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full mb-2">
                <div class="h-full bg-blue-500 rounded-full" style="width:${percent}%"></div>
            </div>
            ${subsHtml ? `<div class="space-y-1">${subsHtml}</div>` : ''}
        </div>`;
    }).join('');
}
function renderTotalTab() {
    const users = getUsers();
    const grid = document.getElementById('usersSummaryGrid');
    let totalIncome = 0, totalSavings = 0, totalSpent = 0, totalBalance = 0;
    grid.innerHTML = users.map(user => {
        const budget = calculateBudget(user.id);
        const spent = getMonthExpenses(user.id).reduce((s, e) => s + e.amount, 0);
        totalIncome += budget.totalIncome;
        totalSavings += budget.savings;
        totalSpent += spent;
        totalBalance += budget.currentBalance;
        return `<div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center gap-2 mb-3"><span class="text-2xl">👤</span><span class="font-medium">${user.name}</span></div>
            <div class="space-y-1 text-sm">
                <div class="flex justify-between"><span>Доход:</span><span class="font-medium">${budget.totalIncome.toLocaleString()} ₽</span></div>
                <div class="flex justify-between"><span>Потрачено:</span><span class="font-medium text-orange-500">${spent.toLocaleString()} ₽</span></div>
                <div class="flex justify-between"><span>Баланс:</span><span class="font-bold ${budget.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${budget.currentBalance.toLocaleString()} ₽</span></div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('totalFamilyIncome').textContent = totalIncome.toLocaleString() + ' ₽';
    document.getElementById('totalFamilySavings').textContent = totalSavings.toLocaleString() + ' ₽';
    document.getElementById('totalFamilySpent').textContent = totalSpent.toLocaleString() + ' ₽';
    document.getElementById('totalFamilyRemaining').textContent = totalBalance.toLocaleString() + ' ₽';
}

// ======== НАВИГАЦИЯ ========
function changeMonth(delta) { currentViewMonth.setMonth(currentViewMonth.getMonth() + delta); renderAll(); }
function goToCurrentMonth() { currentViewMonth = new Date(); renderAll(); }
function clearMonthExpenses() {
    const user = getCurrentUser();
    if (!user) return;
    const monthKey = getMonthKey(currentViewMonth);
    if (!confirm('Удалить все операции за этот месяц?')) return;
    user.expenses = user.expenses.filter(e => !e.date?.startsWith(monthKey));
    user.incomes = user.incomes.filter(i => !i.date?.startsWith(monthKey));
    syncData();
    renderAll();
}

// ======== EXCEL ИМПОРТ ========
function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            excelData = { expenses: [], incomes: [] };
            rows.slice(19).forEach(row => {
                if (!row || !row[0]) return;
                const date = parseExcelDate(row[0]);
                const amount = parseExcelAmount(row[12]);
                const bankCategory = row[4] || '';
                const description = row[11] || row[5] || 'Операция';
                const code = row[3] || '';
                if (!date || !amount) return;
                if (amount.isIncome) {
                    excelData.incomes.push({ date, description: '💵 Поступление', amount: amount.value });
                    return;
                }
                let finalDescription = detectSpecialTransfer(description, code) || mapBankCategory(bankCategory, description, code) || description;
                finalDescription = finalDescription.trim();
                if (!isDuplicate(date, amount.value, finalDescription)) {
                    excelData.expenses.push({ date, description: finalDescription, amount: amount.value });
                }
            });
            document.getElementById('excelRowCount').textContent = excelData.expenses.length + excelData.incomes.length;
            document.getElementById('excelPreview').classList.remove('hidden');
            renderExcelPreview();
        } catch (err) {
            console.error(err);
            alert('Ошибка чтения файла');
        }
    };
    reader.readAsArrayBuffer(file);
}
function renderExcelPreview() {
    const table = document.getElementById('excelPreviewTable');
    if (!excelData) return;
    let html = '<table class="w-full text-xs"><thead><tr class="bg-gray-100"><th class="p-2">Дата</th><th class="p-2">Описание</th><th class="p-2 text-right">Сумма</th></tr></thead><tbody>';
    excelData.incomes.slice(0, 5).forEach(i => {
        html += `<tr class="bg-green-50"><td class="p-2">${i.date}</td><td class="p-2">${i.description}</td><td class="p-2 text-right text-green-600">+${i.amount.toLocaleString()}</td></tr>`;
    });
    excelData.expenses.slice(0, 10).forEach(e => {
        html += `<tr><td class="p-2">${e.date}</td><td class="p-2">${e.description}</td><td class="p-2 text-right text-red-500">-${e.amount.toLocaleString()}</td></tr>`;
    });
    if (excelData.expenses.length > 10) html += `<tr><td colspan="3" class="p-2 text-center text-gray-400">... ещё ${excelData.expenses.length - 10} операций</td></tr>`;
    html += '</tbody></table>';
    table.innerHTML = html;
}
function importExcelData() {
    const user = getCurrentUser();
    if (!user) return alert('Сначала добавьте пользователя');
    if (!excelData) return alert('Нет данных для импорта');
    if (!Array.isArray(user.expenses)) user.expenses = [];
    if (!Array.isArray(user.incomes)) user.incomes = [];
    let imported = 0;
    excelData.expenses.forEach(e => { user.expenses.push({ id: Date.now() + Math.random(), ...e }); imported++; });
    excelData.incomes.forEach(i => { user.incomes.push({ id: Date.now() + Math.random(), ...i }); imported++; });
    syncData();
    renderAll();
    cancelExcelImport();
    alert(`Импортировано ${imported} операций`);
}
function cancelExcelImport() {
    document.getElementById('excelPreview').classList.add('hidden');
    document.getElementById('excelFileInput').value = '';
    excelData = null;
}
function parseExcelDate(val) {
    if (!val) return null;
    if (val instanceof Date) return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    const str = String(val).trim();
    let match = str.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (match) {
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function parseExcelAmount(val) {
    if (!val) return null;
    const str = String(val);
    const isExpense = str.includes('-');
    const num = parseFloat(str.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(num) || num === 0 ? null : { value: Math.abs(num), isIncome: !isExpense };
}
function isDuplicate(date, amount, description) {
    const expenses = getCurrentExpenses();
    const incomes = getCurrentIncomes();
    return expenses.some(e => e.date === date && Math.abs(e.amount - amount) < 0.01 && e.description === description) ||
        incomes.some(i => i.date === date && Math.abs(i.amount - amount) < 0.01 && i.description === description);
}

// ======== FIREBASE / СИНХРОНИЗАЦИЯ ========
function syncData() {
    if (db && roomsManager.currentRoomId && roomsManager.dataRef) {
        roomsManager.dataRef.update({ data, lastUpdated: firebase.database.ServerValue.TIMESTAMP });
    }
}

// ======== FIREBASE / СИНХРОНИЗАЦИЯ ========
const createRoom = () => roomsManager.createRoom();
const closeCreateRoomModal = () => roomsManager.closeCreateRoomModal();
const confirmCreateRoom = () => roomsManager.confirmCreateRoom();
const joinRoom = () => roomsManager.joinRoom();
const closePasswordModal = () => roomsManager.closePasswordModal();
const confirmPassword = () => roomsManager.confirmPassword();
const leaveRoom = () => roomsManager.leaveRoom();
const copyRoomLink = () => roomsManager.copyRoomLink();
const openChangePasswordModal = () => roomsManager.openChangePasswordModal();
const closeChangePasswordModal = () => roomsManager.closeChangePasswordModal();
const confirmChangeRoomPassword = () => roomsManager.confirmChangeRoomPassword();

function updateConnectionStatus(online) {
    const status = document.getElementById('connectionStatus');
    status.textContent = online ? '🟢' : '🔴';
    status.title = online ? 'Синхронизировано' : 'Локально';
}

// ======== МАППИНГ КАТЕГОРИЙ ========
const BANK_CATEGORY_MAP = {
    // Маркетплейсы
    'ozon': '📦 Маркетплейсы', 'ozone': '📦 Маркетплейсы', 'озон': '📦 Маркетплейсы', 'wildberries': '📦 Маркетплейсы', 'вайлдберриз': '📦 Маркетплейсы',
    'wb': '📦 Маркетплейсы', 'wbmarket': '📦 Маркетплейсы', 'яндекс маркет': '📦 Маркет��лейсы', 'yandex market': '📦 Маркетплейсы',
    'sbermegmarket': '📦 Маркетплейсы', 'sber market': '📦 Маркетплейсы', 'ali': '📦 Маркетплейсы', 'aliexpress': '📦 Маркетплейсы',
    'lamoda': '📦 Маркетплейсы', 'cdek market': '📦 Маркетплейсы', 'poizon': '📦 Маркетплейсы',

    // Продуктовые магазины
    'пятёрочка': '🛒 Продукты: Пятёрочка', 'пятерочка': '🛒 Продукты: Пятёрочка', 'pyaterochka': '🛒 Продукты: Pyaterochka', 'pyatero': '🛒 Продукты: Pyatero', '5ka': '🛒 Продукты: Пятёрочка',
    'магнит': '🛒 Продукты: Магнит', 'magnit': '🛒 Продукты: Magnit', 'mgnit': '🛒 Продукты: Magnit', 'magnet': '🛒 Продукты: Magnet',
    'перекрёсток': '🛒 Продукты: Перекрёсток', 'перекресток': '🛒 Продукты: Перекресток', 'perekrestok': '🛒 Продукты: Perekrestok', 'perek': '🛒 Продукты: Perek',
    'дикси': '🛒 Продукты: Дикси', 'diksi': '🛒 Продукты: Diksi', 'dixy': '🛒 Продукты: Dixy',
    'лента': '🛒 Продукты: Лента', 'lenta': '🛒 Продукты: Lenta',
    'вкусвилл': '🛒 Продукты: ВкусВилл', 'vkusvill': '🛒 Продукты: VkusVill', 'vkusvil': '🛒 Продукты: VkusVil',
    'самокат': '🛒 Продукты: Самокат', 'samokat': '🛒 Продукты: Samokat', 'samokattech': '🛒 Продукты: Samokat',
    'азбука вкуса': '🛒 Продукты: Азбука вкуса', 'azbuka': '🛒 Продукты: Azbuka', 'azbuka vkуса': '🛒 Продукты: Azbuka Vkusa',
    'верный': '🛒 Продукты: Верный', 'vernyi': '🛒 Продукты: Vernyi',
    'spar': '🛒 Продукты: Spar', 'спар': '🛒 Продукты: Spar', 'sparr': '🛒 Продукты: Spar',
    'globus': '🛒 Продукты: Globus', 'глобус': '🛒 Продукты: Глобус',
    'fix price': '🛒 Продукты: Fix Price', 'фикс прайс': '🛒 Продукты: Fix Price', 'fixprice': '🛒 Продукты: Fix Price',
    'окей': '🛒 Продукты: О\'Кей', 'o\'key': '🛒 Продукты: O\'Key', 'okey': '🛒 Продукты: Okey',

    // Еда и кафе
    'кафе': '🍔 Еда', 'cafe': '🍔 Еда', 'ресторан': '🍔 Еда', 'restaurant': '🍔 Еда', 'restoran': '🍔 Еда',
    'kfc': '🍔 Еда', 'мак': '🍔 Еда', 'mac': '🍔 Еда', 'mcdonald': '🍔 Еда', 'mcdon': '🍔 Еда',
    'бургер кинг': '🍔 Еда', 'burger king': '🍔 Еда', 'bk': '🍔 Еда',
    'dodo': '🍔 Еда', 'dodopizza': '🍔 Еда', 'додо': '🍔 Еда', 'pizza': '🍔 Еда', 'пицца': '🍔 Еда',
    'яндекс еда': '🍔 Еда', 'yandexeda': '🍔 Еда', 'delivery club': '🍔 Еда', 'деливери клаб': '🍔 Еда',
    'coffee': '☕ Кофе', 'кофе': '☕ Кофе', 'кофейня': '☕ Кофе', 'coffeehouse': '☕ Кофе', 'coffe': '☕ Кофе',
    'starbucks': '☕ Кофе', 'shokoladnica': '☕ Кофе', 'шоколадница': '☕ Кофе',

    // Транспорт и АЗС
    'яндекс такси': '🚗 Транспорт: Такси', 'yandex taxi': '🚗 Транспорт: Такси', 'yandex go': '🚗 Транспорт: Такси',
    'ситимобил': '🚗 Транспорт: Такси', 'citymobil': '🚗 Транспорт: Такси', 'uber': '🚗 Транспорт: Такси',
    'такси': '🚗 Транспорт: Такси', 'taxi': '🚗 Транспорт: Такси', 'taksi': '🚗 Транспорт: Такси',
    'топливо': '🚗 Транспорт: Топливо', 'fuel': '🚗 Транспорт: Топливо', 'fuel station': '🚗 Транспорт: Топливо',
    'бензин': '🚗 Транспорт: Топливо', 'benzin': '🚗 Транспорт: Топливо', 'gas': '🚗 Транспорт: Топливо',
    'азс': '🚗 Транспорт: АЗС', 'azs': '🚗 Транспорт: АЗС', 'zapravka': '🚗 Транспорт: АЗС',
    'lukoil': '🚗 Транспорт: Лукойл', 'лукойл': '🚗 Транспорт: Лукойл',
    'gazpromneft': '🚗 Транспорт: Газпромнефть', 'gazprom': '🚗 Транспорт: Газпромнефть',
    'rosneft': '🚗 Транспорт: Роснефть', 'роснефть': '🚗 Транспорт: Роснефть',
    'bp': '🚗 Транспорт: АЗС', 'shell': '🚗 Транспорт: АЗС', 'tatneft': '🚗 Транспорт: Татнефть', 'татнефть': '🚗 Транспорт: Татнефть',
    'tpp_transport': '🚗 Транспорт: Общественный', 'tpp transport': '🚗 Транспорт: Общественный', 'tpptransport': '🚗 Транспорт: Общественный',
    'transport card': '🚗 Транспорт: Общественный', 'transport_card': '🚗 Транспорт: Общественный',

    // Связь и сервисы
    'мтс': '📱 Связь', 'mts': '📱 Связь', 'билайн': '📱 Связь', 'beeline': '📱 Связь',
    'мегафон': '📱 Связь', 'megafon': '📱 Связь', 'теле2': '📱 Связь', 'tele2': '📱 Связь', 'yota': '📱 Связь',
    'ростелеком': '📱 Связь', 'rostelecom': '📱 Связь', 'domru': '📱 Связь', 'дом.ру': '📱 Связь',

    // Одежда / Электроника
    'zara': '👕 Одежда', 'зарa': '👕 Одежда', 'hm': '👕 Одежда', 'h&m': '👕 Одежда',
    'uniqlo': '👕 Одежда', 'юникло': '👕 Одежда', 'bershka': '👕 Одежда', 'stradivarius': '👕 Одежда',
    'dns': '🖥️ Электроника', 'днс': '🖥️ Электроника', 'mvideo': '🖥️ Электроника', 'мвидео': '🖥️ Электроника',
    'eldorado': '🖥️ Электроника', 'эльдорадо': '🖥️ Электроника', 'citilink': '🖥️ Электроника', 'ситилинк': '🖥️ Электроника',

    // Прочее
    'аптека': '💊 Здоровье', 'apteka': '💊 Здоровье', 'pharmacy': '💊 Здоровье', 'горздрав': '💊 Здоровье',
    'steam': '🎮 Развлечения', 'playstation': '🎮 Развлечения', 'ps store': '🎮 Развлечения',
    'cinema': '🎮 Развлечения', 'кино': '🎮 Развлечения', 'театр': '🎮 Развлечения', 'музей': '🎮 Развлечения',
    'leroy': '🏠 Дом', 'lerua': '🏠 Дом', 'леруа': '🏠 Дом', 'obi': '🏠 Дом', 'ikea': '🏠 Дом',
    'castorama': '🏠 Дом', 'касторама': '🏠 Дом'
};
const STORE_NAME_MAP = {
    // Транспорт / АЗС
    'lukoil': '🚗 Транспорт: Лукойл', 'лукойл': '🚗 Транспорт: Лукойл', 'lk': '🚗 Транспорт: Лукойл',
    'tatneft': '🚗 Транспорт: Татнефть', 'татнефть': '🚗 Транспорт: Татнефть',
    'gazprom': '🚗 Транспорт: Газпромнефть', 'gazpromneft': '🚗 Транспорт: Газпромнефть', 'газпромнефть': '🚗 Транспорт: Газпромнефть',
    'rosneft': '🚗 Транспорт: Роснефть', 'роснефть': '🚗 Транспорт: Роснефть',
    '.shell': '🚗 Транспорт: Shell', 'bp': '🚗 Транспорт: BP',
}
const MCC_CATEGORY_MAP = {
    '5411': '🛒 Продукты', '5412': '🛒 Продукты', '5499': '🛒 Продукты',
    '5812': '🍔 Еда', '5813': '🍔 Еда', '5814': '☕ Кофе/Фастфуд',
    '5541': '🚗 Транспорт', '5542': '🚗 Транспорт',
    '5912': '💊 Здоровье',
    '5691': '👕 Одежда', '5651': '👕 Одежда',
    '7832': '🎮 Развлечения', '7841': '🎮 Развлечения',
    '4131': '🚗 Транспорт: Общественный'
};
function mapBankCategory(bankCategory, description, code) {
    const combined = `${bankCategory} ${description}`.toLowerCase();
    if (code && MCC_CATEGORY_MAP[code]) return MCC_CATEGORY_MAP[code];
    for (const [key, value] of Object.entries(BANK_CATEGORY_MAP)) {
        if (combined.includes(key)) return value;
    }
    const placeMatch = description.toLowerCase().match(/место совершения операции:?\s*([^,]+)/);
    if (placeMatch) {
        const place = placeMatch[1];
        for (const [key, value] of Object.entries(STORE_NAME_MAP)) {
            if (place.includes(key)) return value;
        }
    }
    return null;
}
function detectSpecialTransfer(description, code) {
    const lower = (description || '').toLowerCase();
    if (code?.toLowerCase().startsWith('c42')) return '📦 Маркетплейсы';
    if (lower.includes('сбп') || lower.includes('sbp') || lower.includes('перевод')) {
        if (lower.includes('ozon')) return '📦 Маркетплейсы';
        return '💸 Перевод по СБП';
    }
    return null;
}

// ======== GEMINI AI ========
const UNCATEGORIZED_MARKERS = ['прочее', 'другое', 'без категории'];
function saveGeminiKey() {
    const input = document.getElementById('geminiApiKey');
    if (!input) return;
    const key = input.value.trim();
    if (!key) return alert('Введите API ключ');
    localStorage.setItem('geminiApiKey', key);
    const status = document.getElementById('geminiStatus');
    if (status) status.innerHTML = '<span class="text-green-600">✅ Ключ сохранён</span>';
}
function loadGeminiKey() {
    const input = document.getElementById('geminiApiKey');
    if (!input) return;
    const key = localStorage.getItem('geminiApiKey');
    if (key) input.value = key;
}
async function testGeminiKey() {
    const input = document.getElementById('geminiApiKey');
    const status = document.getElementById('geminiStatus');
    if (!input || !status) return;
    const key = input.value.trim();
    if (!key) {
        status.innerHTML = '<span class="text-red-600">❌ Введите API ключ</span>';
        return;
    }
    status.innerHTML = '<span class="text-blue-600">⏳ Проверяю…</span>';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Скажи слово работает' }] }] })
        });
        if (res.ok) status.innerHTML = '<span class="text-green-600">✅ Ключ работает</span>';
        else {
            const err = await res.json();
            status.innerHTML = `<span class="text-red-600">❌ Ошибка: ${err.error?.message || 'Неверный ключ'}</span>`;
        }
    } catch (e) {
        status.innerHTML = '<span class="text-red-600">❌ Сеть недоступна</span>';
    }
}
async function categorizeWithGemini(description) {
    const key = localStorage.getItem('geminiApiKey');
    if (!key) return null;
    try {
        const prompt = `Определи категорию траты по описанию: "${description}". Ответь одним вариантом вроде "🍔 Еда"`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) {
        console.error('Gemini error', e);
        return null;
    }
}
async function recategorizeOperations() {
    const user = getCurrentUser();
    const status = document.getElementById('geminiStatus');
    if (!user) return alert('Выберите пользователя');
    if (!status) return;
    const key = localStorage.getItem('geminiApiKey');
    if (!key) return alert('Сначала сохраните API ключ Gemini');
    const expenses = user.expenses || [];
    const target = expenses.filter(e => isUncategorized(e.description));
    if (target.length === 0) {
        status.innerHTML = '<span class="text-blue-600">✅ Все операции уже имеют категории</span>';
        return;
    }
    status.innerHTML = `<span class="text-blue-600">🔄 Проверяю ${target.length} операций...</span>`;
    let updated = 0;
    for (const expense of target) {
        const local = mapBankCategory('', expense.description, '') || detectSpecialTransfer(expense.description, '');
        if (local) {
            expense.description = local;
            updated++;
            continue;
        }
        const aiCategory = await categorizeWithGemini(expense.description);
        if (aiCategory) {
            expense.description = aiCategory;
            updated++;
        }
        await new Promise(r => setTimeout(r, 200));
    }
    syncData();
    renderAll();
    status.innerHTML = `<span class="text-green-600">✅ Обновлено ${updated} операций</span>`;
}
function reapplyLocalCategories() {
    const user = getCurrentUser();
    const status = document.getElementById('geminiStatus');
    if (!user) return alert('Сначала выберите пользователя или добавьте нового');
    if (!status) return;
    const expenses = user.expenses || [];
    if (expenses.length === 0) {
        status.innerHTML = '<span class="text-gray-500">Нет расходов для обновления</span>';
        return;
    }
    let updated = 0;
    expenses.forEach(expense => {
        const original = expense.description;
        const mcc = expense.mcc || '';
        const mapped = detectSpecialTransfer(original, mcc) || mapBankCategory('', original, mcc) || original;
        if (mapped !== original) {
            expense.description = mapped;
            updated++;
        }
    });
    syncData();
    renderAll();
    status.innerHTML = `<span class="text-green-600">🔁 Обновлено ${updated} операций встроенными правилами</span>`;
}
function isUncategorized(description = '') {
    const lower = description.toLowerCase();
    const startsWithEmoji = /^(\p{Emoji}|[\u2600-\u26FF])/u.test(description);
    const hasMarker = UNCATEGORIZED_MARKERS.some(marker => lower.includes(marker));
    return !startsWithEmoji || hasMarker;
}

// ======== ИНИЦИАЛИЗАЦИЯ ========
function init() {
    if (document.getElementById('expenseDate')) document.getElementById('expenseDate').valueAsDate = new Date();
    if (document.getElementById('incomeDate')) document.getElementById('incomeDate').valueAsDate = new Date();
    const savingsInput = document.getElementById('savingsPercent');
    if (savingsInput) savingsInput.addEventListener('change', updateSettings);

    renderTabs();
    renderAll();
    renderSettingsSection();
    loadGeminiKey();
}

roomsManager.init();
document.addEventListener('DOMContentLoaded', init);
