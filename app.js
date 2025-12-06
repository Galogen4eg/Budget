// ======== ДАННЫЕ ========
let currentTab = 'gena';
let budgetChart = null;
let filterByDay = null;

// Пустой шаблон данных (показывается до входа в комнату)
const emptyData = {
    gena: {
        settings: { savingsPercent: 0 },
        fixedPayments: [],
        expenses: [],
        incomes: [],
        customCategories: []
    },
    galya: {
        settings: { savingsPercent: 0 },
        fixedPayments: [],
        expenses: [],
        incomes: [],
        customCategories: []
    }
};

let data = JSON.parse(JSON.stringify(emptyData));

let currentViewMonth = new Date();
let selectedDay = null;
let settingsExpanded = false;
let addSectionExpanded = false;

const defaultCategories = ['🍔 Еда', '🚗 Транспорт', '🛒 Продукты', '🎮 Развлечения', '👕 Одежда', '💊 Здоровье', '🏠 Дом', '☕ Кофе', '🎁 Подарки', '📦 Маркетплейсы'];
const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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
    family: { icon: '👨‍👩‍👧', name: 'Семья' },
    pets: { icon: '🐕', name: 'Питомцы' },
    other: { icon: '📦', name: 'Прочее' }
};

// ======== FIREBASE ========
let db = null, currentRoomId = null, dataRef = null;
const firebaseConfig = { databaseURL: "https://budg-1d5e0-default-rtdb.europe-west1.firebasedatabase.app" };

// Инициализация Firebase сразу
try {
    if (typeof firebase !== 'undefined') {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log('Firebase initialized successfully');
    } else {
        console.error('Firebase SDK not loaded');
    }
} catch (e) { 
    console.error('Firebase init error:', e);
}

// ======== ВКЛАДКИ ========
function switchTab(tab) {
    currentTab = tab;
    ['gena', 'galya', 'total'].forEach(t => {
        const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        btn.className = `tab-btn tab-${t} ${tab === t ? 'active' : ''} px-6 py-3 rounded-full font-medium text-lg`;
    });
    document.getElementById('personalContent').classList.toggle('hidden', tab === 'total');
    document.getElementById('totalContent').classList.toggle('hidden', tab !== 'total');
    renderAll();
}

// ======== ПОЛУЧЕНИЕ ДАННЫХ ========
const getCurrentData = () => data[currentTab] || data.gena;
const getCurrentSettings = () => getCurrentData().settings || { savingsPercent: 0 };
const getCurrentFixedPayments = () => Array.isArray(getCurrentData().fixedPayments) ? getCurrentData().fixedPayments : [];
const getCurrentExpenses = () => Array.isArray(getCurrentData().expenses) ? getCurrentData().expenses : [];
const getCurrentCustomCategories = () => Array.isArray(getCurrentData().customCategories) ? getCurrentData().customCategories : [];
const getCurrentIncomes = () => Array.isArray(getCurrentData().incomes) ? getCurrentData().incomes : [];

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

function getMonthIncomes(person = null) {
    const monthKey = getMonthKey(currentViewMonth);
    const incomes = person ? (data[person].incomes || []) : getCurrentIncomes();
    return incomes.filter(i => i.date?.startsWith(monthKey));
}

function getTotalMonthIncome(person = null) {
    return getMonthIncomes(person).reduce((sum, i) => sum + i.amount, 0);
}

function getMonthExpenses(person = null) {
    const monthKey = getMonthKey(currentViewMonth);
    const expenses = person ? data[person].expenses : getCurrentExpenses();
    return expenses.filter(e => e.date?.startsWith(monthKey));
}

function getRemainingDaysInMonth() {
    const today = new Date();
    const year = currentViewMonth.getFullYear(), month = currentViewMonth.getMonth();
    if (year !== today.getFullYear() || month !== today.getMonth()) return getDaysInMonth(currentViewMonth);
    return getDaysInMonth(currentViewMonth) - today.getDate() + 1;
}

// ======== ИНИЦИАЛИЗАЦИЯ ========
function init() {
    // Firebase уже инициализирован выше

    document.getElementById('expenseDate').valueAsDate = new Date();
    document.getElementById('incomeDate').valueAsDate = new Date();

    // Проверяем URL на наличие комнаты
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    if (roomFromUrl) {
        // Если в URL есть комната — подключаемся к ней
        joinRoomById(roomFromUrl);
    } else {
        // Если нет комнаты в URL — показываем пустой шаблон
        // НЕ загружаем данные из localStorage
        data = JSON.parse(JSON.stringify(emptyData));
        updateConnectionStatus(false);
    }

    document.getElementById('savingsPercent').addEventListener('input', updateSettings);
    document.getElementById('savingsPercent').addEventListener('change', updateSettings);
    ['expenseAmount', 'expenseDescription'].forEach(id => 
        document.getElementById(id).addEventListener('keypress', e => { if (e.key === 'Enter') addExpense(); }));
    ['incomeAmount', 'incomeDescription'].forEach(id => 
        document.getElementById(id).addEventListener('keypress', e => { if (e.key === 'Enter') addIncome(); }));

    renderAll();
}

// ======== НАСТРОЙКИ ========
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
    if (currentTab === 'total') return;
    getCurrentSettings().savingsPercent = parseFloat(document.getElementById('savingsPercent').value) || 0;
    syncData();
    renderAll();
}

// ======== ПРИХОДЫ ========
function addIncome() {
    if (currentTab === 'total') return;
    const date = document.getElementById('incomeDate').value;
    const description = document.getElementById('incomeDescription').value.trim() || '💵 Поступление';
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    if (!date || !amount || amount <= 0) { alert('Введите дату и сумму'); return; }
    getCurrentIncomes().push({ id: Date.now(), date, description, amount: Math.round(amount * 100) / 100 });
    document.getElementById('incomeDescription').value = '';
    document.getElementById('incomeAmount').value = '';
    currentViewMonth = new Date(date);
    syncData();
    renderAll();
}

function removeIncome(id, person = null) {
    const incomes = person ? (data[person].incomes || []) : getCurrentIncomes();
    const index = incomes.findIndex(i => i.id === id);
    if (index > -1) incomes.splice(index, 1);
    syncData();
    renderAll();
}

// ======== ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ ========
function addFixedPayment() {
    if (currentTab === 'total') return;
    const category = document.getElementById('newPaymentCategory').value;
    const name = document.getElementById('newPaymentName').value.trim();
    const amount = parseFloat(document.getElementById('newPaymentAmount').value);
    if (!name || !amount || amount <= 0) { alert('Введите название и сумму платежа'); return; }
    getCurrentFixedPayments().push({ id: Date.now(), category, name, amount });
    document.getElementById('newPaymentName').value = '';
    document.getElementById('newPaymentAmount').value = '';
    syncData();
    renderAll();
}

function removeFixedPayment(id) {
    if (currentTab === 'total') return;
    const payments = getCurrentFixedPayments();
    const index = payments.findIndex(p => p.id === id);
    if (index > -1) payments.splice(index, 1);
    syncData();
    renderAll();
}

function getTotalFixedPayments(person = null) {
    const payments = person ? data[person].fixedPayments : getCurrentFixedPayments();
    return payments.reduce((sum, p) => sum + p.amount, 0);
}

// ======== РАСЧЁТЫ ========
function calculateBudget(person = null) {
    const settings = person ? data[person].settings : getCurrentSettings();
    const fixedTotal = getTotalFixedPayments(person);
    const allIncomes = person ? (data[person].incomes || []) : getCurrentIncomes();
    const totalIncome = allIncomes.reduce((sum, i) => sum + i.amount, 0);
    const allExpenses = person ? data[person].expenses : getCurrentExpenses();
    const totalAllSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthIncome = getTotalMonthIncome(person);
    const monthExpenses = getMonthExpenses(person);
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const savings = monthIncome * (settings.savingsPercent / 100);
    const available = monthIncome - savings - fixedTotal;
    const days = getDaysInMonth(currentViewMonth);
    const dailyLimit = days > 0 ? available / days : 0;
    const currentBalance = totalIncome - totalAllSpent;
    const remainingDays = getRemainingDaysInMonth();
    const recommendedDaily = remainingDays > 0 ? (currentBalance - fixedTotal - savings) / remainingDays : 0;

    return {
        totalIncome: Math.round(totalIncome * 100) / 100,
        monthIncome: Math.round(monthIncome * 100) / 100,
        savingsPercent: settings.savingsPercent,
        savings: Math.round(savings * 100) / 100,
        fixedTotal: Math.round(fixedTotal * 100) / 100,
        available: Math.round(available * 100) / 100,
        dailyLimit: Math.round(dailyLimit * 100) / 100,
        recommendedDaily: Math.round(recommendedDaily * 100) / 100,
        days, remainingDays,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalAllSpent: Math.round(totalAllSpent * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100
    };
}

// ======== ТРАТЫ ========
function addExpense() {
    if (currentTab === 'total') return;
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    if (!date || !description || !amount || amount <= 0) { alert('Заполните все поля'); return; }
    getCurrentExpenses().push({ id: Date.now(), date, description, amount });
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    currentViewMonth = new Date(date);
    syncData();
    renderAll();
}

function removeExpense(id, person = null) {
    const expenses = person ? data[person].expenses : getCurrentExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index > -1) expenses.splice(index, 1);
    syncData();
    renderAll();
}

function quickCategory(category) {
    document.getElementById('expenseDescription').value = category;
    document.getElementById('expenseAmount').focus();
}

// ======== ПОЛЬЗОВАТЕЛЬСКИЕ КАТЕГОРИИ ========
function getAllCategories() {
    const custom = currentTab === 'total' ? [] : getCurrentCustomCategories();
    return [...defaultCategories, ...custom];
}

function addCustomCategory() {
    if (currentTab === 'total') return;
    const input = document.getElementById('newCategoryName');
    const name = input.value.trim();
    if (!name || getAllCategories().includes(name)) return;
    getCurrentCustomCategories().push(name);
    input.value = '';
    syncData();
    renderCategoryChips();
}

function removeCustomCategory(category) {
    if (currentTab === 'total') return;
    const categories = getCurrentCustomCategories();
    const index = categories.indexOf(category);
    if (index > -1) categories.splice(index, 1);
    syncData();
    renderCategoryChips();
}

// ======== ФИЛЬТР ПО ДНЮ ========
function setDayFilter(dateStr) {
    filterByDay = dateStr;
    selectedDay = dateStr;
    document.getElementById('clearFilterBtn').classList.remove('hidden');
    renderCalendar();
    renderDailyTable();
    renderCategoryStats();
}

function clearDayFilter() {
    filterByDay = null;
    selectedDay = null;
    document.getElementById('clearFilterBtn').classList.add('hidden');
    document.getElementById('dayExpensesPanel').classList.add('hidden');
    renderCalendar();
    renderDailyTable();
    renderCategoryStats();
}

// ======== РЕНДЕРИНГ ========
function renderAll() {
    renderCurrentMonth();
    renderMonthNavigation();
    if (currentTab === 'total') renderTotalTab();
    else {
        renderBudgetInfo();
        renderSummary();
        renderCategoryChips();
        renderCalendar();
        renderDailyTable();
        renderCategoryStats();
        renderChart();
        renderFixedPayments();
    }
}

function renderCurrentMonth() {
    document.getElementById('currentMonth').textContent = `${monthNames[currentViewMonth.getMonth()]} ${currentViewMonth.getFullYear()}`;
}

function renderMonthNavigation() {
    const prevMonth = new Date(currentViewMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const nextMonth = new Date(currentViewMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('prevMonthBtn').textContent = `← ${monthNames[prevMonth.getMonth()]}`;
    document.getElementById('nextMonthBtn').textContent = `${monthNames[nextMonth.getMonth()]} →`;
    document.getElementById('currentMonthBtn').textContent = monthNames[new Date().getMonth()];
}

function renderBudgetInfo() {
    const budget = calculateBudget();
    const settings = getCurrentSettings();
    const savingsInput = document.getElementById('savingsPercent');
    if (document.activeElement !== savingsInput) savingsInput.value = settings.savingsPercent ?? '';
    document.getElementById('totalIncomeDisplay').textContent = budget.totalIncome.toLocaleString();
    document.getElementById('savingsAmount').textContent = budget.savings.toLocaleString();
    document.getElementById('dailyLimit').textContent = budget.recommendedDaily.toLocaleString();
    const actualBalanceEl = document.getElementById('actualBalance');
    actualBalanceEl.textContent = budget.currentBalance.toLocaleString();
    actualBalanceEl.className = `font-medium text-sm ${budget.currentBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`;
}

function renderFixedPayments() {
    const list = document.getElementById('fixedPaymentsList');
    const payments = getCurrentFixedPayments();
    document.getElementById('fixedTotal').textContent = getTotalFixedPayments().toLocaleString();
    if (payments.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center py-2 text-sm">Нет платежей</p>'; return; }
    list.innerHTML = payments.map(p => {
        const catInfo = paymentCategories[p.category];
        return `<div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
            <div class="flex items-center gap-2"><span>${catInfo.icon}</span><span class="text-gray-700 text-sm">${p.name}</span></div>
            <div class="flex items-center gap-2"><span class="text-gray-800 font-medium text-sm">${p.amount.toLocaleString()}</span>
            <button onclick="removeFixedPayment(${p.id})" class="text-red-400 hover:text-red-600">&times;</button></div>
        </div>`;
    }).join('');
}

function renderSummary() {
    const budget = calculateBudget();
    const remaining = budget.available - budget.totalSpent;
    const progress = budget.available > 0 ? Math.round((budget.totalSpent / budget.available) * 100) : 0;
    document.getElementById('totalBudget').textContent = budget.available.toLocaleString();
    document.getElementById('totalSpent').textContent = budget.totalSpent.toLocaleString();
    const remainingEl = document.getElementById('remaining');
    remainingEl.textContent = remaining.toLocaleString();
    remainingEl.className = `font-medium ${remaining < 0 ? 'text-red-500' : 'text-gray-800'}`;
    const progressEl = document.getElementById('progressPercent');
    progressEl.textContent = progress + '%';
    progressEl.className = `font-medium ${progress > 100 ? 'text-red-500' : progress > 80 ? 'text-amber-600' : 'text-gray-800'}`;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = Math.min(progress, 100) + '%';
    progressBar.className = `h-full rounded-full transition-all duration-300 ${progress > 100 ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-blue-500'}`;
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    const allCategories = getAllCategories();
    const customCategories = currentTab === 'total' ? [] : getCurrentCustomCategories();
    container.innerHTML = allCategories.map(cat => {
        const isCustom = customCategories.includes(cat);
        return `<button onclick="quickCategory('${cat}')" class="chip px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            ${cat}${isCustom ? `<span onclick="event.stopPropagation(); removeCustomCategory('${cat}')" class="text-red-400 hover:text-red-600 ml-1">&times;</span>` : ''}
        </button>`;
    }).join('');
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    const calendarMonthEl = document.getElementById('calendarMonth');
    const year = currentViewMonth.getFullYear(), month = currentViewMonth.getMonth();
    if (calendarMonthEl) calendarMonthEl.textContent = `${monthNames[month]} ${year}`;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;
    const monthExpenses = getMonthExpenses();
    const budget = calculateBudget();
    const expensesByDay = {};
    monthExpenses.forEach(e => {
        const day = new Date(e.date).getDate();
        expensesByDay[day] = (expensesByDay[day] || 0) + e.amount;
    });
    let html = '';
    for (let i = 0; i < startDay; i++) html += '<div class="calendar-day empty"></div>';
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const spent = expensesByDay[day] || 0;
        const isOverLimit = spent > budget.dailyLimit && budget.dailyLimit > 0;
        const hasExpenses = spent > 0;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = filterByDay === dateStr;
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (isWeekend) classes += ' weekend';
        if (hasExpenses) classes += isOverLimit ? ' over-limit' : ' under-limit';
        html += `<div class="${classes}" onclick="handleDayClick('${dateStr}')">
            <div class="day-number">${day}</div>
            ${hasExpenses ? `<div class="day-amount ${isOverLimit ? 'text-red-600' : 'text-green-600'}">${Math.round(spent).toLocaleString()}</div>` : ''}
        </div>`;
    }
    grid.innerHTML = html;
}

function handleDayClick(dateStr) {
    if (filterByDay === dateStr) {
        // Повторный клик — сбрасываем фильтр
        clearDayFilter();
        return;
    }
    // Первый клик — только фильтруем таблицу, НЕ открываем панель
    setDayFilter(dateStr);
}

function showDayExpenses(dateStr) {
    selectedDay = dateStr;
    const panel = document.getElementById('dayExpensesPanel');
    const list = document.getElementById('dayExpensesList');
    const date = new Date(dateStr);
    document.getElementById('selectedDayTitle').textContent = `${date.getDate()} ${monthNames[date.getMonth()]}`;
    const dayExpenses = getCurrentExpenses().filter(e => e.date === dateStr);
    const dayIncomes = getCurrentIncomes().filter(i => i.date === dateStr);
    const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    let html = '';
    dayIncomes.forEach(i => {
        html += `<div class="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
            <div class="text-green-700">${i.description}</div>
            <div class="flex items-center gap-2"><span class="text-green-600 font-medium">+${i.amount.toLocaleString()}</span>
            <button onclick="removeIncome(${i.id})" class="text-red-400 hover:text-red-600 text-lg">&times;</button></div>
        </div>`;
    });
    dayExpenses.forEach(e => {
        html += `<div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <div class="text-gray-800">${e.description}</div>
            <div class="flex items-center gap-2"><span class="text-red-500 font-medium">-${e.amount.toLocaleString()}</span>
            <button onclick="removeExpense(${e.id})" class="text-red-400 hover:text-red-600 text-lg">&times;</button></div>
        </div>`;
    });
    list.innerHTML = html || '<p class="text-gray-400 text-center py-4">Нет операций за этот день</p>';
    document.getElementById('dayTotal').textContent = dayTotal.toLocaleString();
    panel.classList.remove('hidden');
}

function closeDayPanel() {
    document.getElementById('dayExpensesPanel').classList.add('hidden');
    selectedDay = null;
    clearDayFilter();
}

// ======== ТАБЛИЦА ========
let tableViewMode = 'compact';

function toggleTableView(mode) {
    tableViewMode = mode;
    document.getElementById('btnCompact').className = mode === 'compact' ? 'btn-primary px-3 py-1 rounded-lg text-sm' : 'btn-secondary px-3 py-1 rounded-lg text-sm';
    document.getElementById('btnFull').className = mode === 'full' ? 'btn-primary px-3 py-1 rounded-lg text-sm' : 'btn-secondary px-3 py-1 rounded-lg text-sm';
    renderDailyTable();
}

function renderDailyTable() {
    const tbody = document.getElementById('dailyTableBody');
    const tfoot = document.getElementById('dailyTableFooter');
    const filterInfo = document.getElementById('tableFilterInfo');
    const year = currentViewMonth.getFullYear(), month = currentViewMonth.getMonth();
    const monthKey = getMonthKey(currentViewMonth);
    const budget = calculateBudget();
    
    let monthExpenses = getMonthExpenses();
    let monthIncomes = getMonthIncomes();
    
    if (filterByDay) {
        monthExpenses = monthExpenses.filter(e => e.date === filterByDay);
        monthIncomes = monthIncomes.filter(i => i.date === filterByDay);
        const filterDate = new Date(filterByDay);
        filterInfo.textContent = `за ${filterDate.getDate()} ${monthNames[filterDate.getMonth()]}`;
    } else filterInfo.textContent = '';
    
    const allOperations = [
        ...monthExpenses.map(e => ({ ...e, type: 'expense' })),
        ...monthIncomes.map(i => ({ ...i, type: 'income' }))
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const isFutureMonth = (year > today.getFullYear()) || (year === today.getFullYear() && month > today.getMonth());
    
    const totalMonthIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalMonthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    let balanceBeforeMonth = 0;
    getCurrentIncomes().forEach(i => { if (i.date < monthKey + '-01') balanceBeforeMonth += i.amount; });
    getCurrentExpenses().forEach(e => { if (e.date < monthKey + '-01') balanceBeforeMonth -= e.amount; });
    
    const filteredOps = allOperations.filter(op => {
        if (isFutureMonth) return false;
        if (isCurrentMonth && !filterByDay) return new Date(op.date) <= today;
        return true;
    });
    
    const opsToShow = tableViewMode === 'compact' ? filteredOps.slice(0, 20) : filteredOps;
    
    const allMonthOps = [
        ...getMonthExpenses().map(e => ({ ...e, type: 'expense' })),
        ...getMonthIncomes().map(i => ({ ...i, type: 'income' }))
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    
    const balanceMap = new Map();
    let tempBalance = balanceBeforeMonth;
    allMonthOps.forEach(op => {
        tempBalance += op.type === 'income' ? op.amount : -op.amount;
        balanceMap.set(op.id, tempBalance);
    });

    let html = '';
    opsToShow.forEach(op => {
        const dateObj = new Date(op.date);
        const day = dateObj.getDate();
        const dayOfWeek = dateObj.getDay();
        const dayName = dayNames[dayOfWeek];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = isCurrentMonth && today.getDate() === day && today.getMonth() === dateObj.getMonth();
        const isIncome = op.type === 'income';
        const balance = balanceMap.get(op.id) || 0;
        const daysLeft = getDaysInMonth(currentViewMonth) - dateObj.getDate() + 1;
        const recommendedAtOp = daysLeft > 0 ? Math.round((balance - budget.fixedTotal - budget.savings) / daysLeft) : 0;
        
        let rowClass = 'border-b border-gray-100';
        if (isToday) rowClass += ' bg-blue-50';
        else if (isIncome) rowClass += ' bg-green-50';
        
        const deleteBtn = isIncome 
            ? `<button onclick="event.stopPropagation(); removeIncome(${op.id})" class="ml-2 text-red-400 hover:text-red-600 text-lg">&times;</button>`
            : `<button onclick="event.stopPropagation(); removeExpense(${op.id})" class="ml-2 text-red-400 hover:text-red-600 text-lg">&times;</button>`;
        
        html += `<tr class="${rowClass} hover:bg-gray-50 cursor-pointer" onclick="setDayFilter('${op.date}')">
            <td class="py-2 px-2"><span class="${isToday ? 'font-bold text-blue-600' : 'text-gray-800'}">${day}.${String(month + 1).padStart(2, '0')}</span></td>
            <td class="py-2 px-2 hidden md:table-cell"><span class="${isWeekend ? 'text-red-500' : 'text-gray-500'}">${dayName}</span></td>
            <td class="py-2 px-2"><span class="${isIncome ? 'text-green-700' : 'text-gray-700'}">${op.description}</span>${deleteBtn}</td>
            <td class="py-2 px-2 text-right">${isIncome ? `<span class="font-medium text-green-600">+${op.amount.toLocaleString()}</span>` : '<span class="text-gray-400">—</span>'}</td>
            <td class="py-2 px-2 text-right">${!isIncome ? `<span class="font-medium text-red-500">-${op.amount.toLocaleString()}</span>` : '<span class="text-gray-400">—</span>'}</td>
            <td class="py-2 px-2 text-right"><span class="${balance >= 0 ? 'text-blue-600' : 'text-red-600'} font-medium">${Math.round(balance).toLocaleString()}</span></td>
            <td class="py-2 px-2 text-right hidden lg:table-cell"><span class="${recommendedAtOp >= 0 ? 'text-green-600' : 'text-red-500'} font-medium">${Math.round(recommendedAtOp).toLocaleString()}</span></td>
        </tr>`;
    });

    tbody.innerHTML = html || '<tr><td colspan="7" class="text-center py-4 text-gray-400">Нет данных</td></tr>';
    
    tfoot.innerHTML = `<tr>
        <td class="py-3 px-2 font-medium text-gray-800" colspan="3">📊 Итого${filterByDay ? ' за день' : ' за месяц'}</td>
        <td class="py-3 px-2 text-right font-bold text-green-600">+${Math.round(totalMonthIncome).toLocaleString()}</td>
        <td class="py-3 px-2 text-right font-bold text-red-500">-${Math.round(totalMonthSpent).toLocaleString()}</td>
        <td class="py-3 px-2 text-right font-bold ${budget.currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}">${Math.round(budget.currentBalance).toLocaleString()}</td>
        <td class="py-3 px-2 text-right font-bold hidden lg:table-cell ${budget.recommendedDaily >= 0 ? 'text-green-600' : 'text-red-500'}">${Math.round(budget.recommendedDaily).toLocaleString()}</td>
    </tr>`;
}

// ======== СТАТИСТИКА ========
let expandedCategories = {};

function toggleCategoryExpand(categoryKey) {
    expandedCategories[categoryKey] = !expandedCategories[categoryKey];
    renderCategoryStats();
}

function renderCategoryStats() {
    const container = document.getElementById('categoryStats');
    let monthExpenses = getMonthExpenses();
    if (filterByDay) monthExpenses = monthExpenses.filter(e => e.date === filterByDay);
    if (monthExpenses.length === 0) { container.innerHTML = '<p class="text-gray-400 text-center py-4">Добавьте траты для статистики</p>'; return; }
    
    const groups = {}, standalone = {};
    monthExpenses.forEach(e => {
        const desc = e.description;
        if (desc.includes(':')) {
            const [mainCat, subCat] = desc.split(':').map(s => s.trim());
            if (!groups[mainCat]) groups[mainCat] = { total: 0, subs: {} };
            groups[mainCat].total += e.amount;
            if (!groups[mainCat].subs[subCat]) groups[mainCat].subs[subCat] = { amount: 0, items: [] };
            groups[mainCat].subs[subCat].amount += e.amount;
            groups[mainCat].subs[subCat].items.push(e);
        } else {
            const match = desc.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])\s*\S+/u);
            const category = match ? match[0] : desc.split(' ')[0];
            if (!standalone[category]) standalone[category] = { amount: 0, items: [] };
            standalone[category].amount += e.amount;
            standalone[category].items.push(e);
        }
    });
    
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const colors = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#e91e63', '#00bcd4', '#ff9800'];
    
    const allCategories = [
        ...Object.entries(groups).map(([name, data]) => ({ name, amount: data.total, type: 'group', subs: data.subs })),
        ...Object.entries(standalone).map(([name, data]) => ({ name, amount: data.amount, type: 'standalone', items: data.items }))
    ].sort((a, b) => b.amount - a.amount);
    
    let html = '';
    allCategories.forEach((cat, index) => {
        const percent = Math.round((cat.amount / total) * 100);
        const color = colors[index % colors.length];
        const isExpanded = expandedCategories[cat.name];
        
        if (cat.type === 'group') {
            const subsArray = Object.entries(cat.subs).sort((a, b) => b[1].amount - a[1].amount);
            const hasMultipleSubs = subsArray.length > 1;
            
            html += `<div class="category-card">
                <div class="category-header ${hasMultipleSubs ? '' : 'cursor-default'}" ${hasMultipleSubs ? `onclick="toggleCategoryExpand('${cat.name}')"` : ''}>
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full" style="background: ${color}"></div>
                            <span class="text-gray-800 font-medium">${cat.name}</span>
                            ${hasMultipleSubs ? `<span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${isExpanded ? '▼' : '▶'} ${subsArray.length}</span>` : ''}
                        </div>
                        <div class="text-right">
                            <div class="font-semibold text-gray-800">${cat.amount.toLocaleString()}</div>
                            <div class="text-xs text-gray-500">${percent}%</div>
                        </div>
                    </div>
                    <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all" style="width: ${percent}%; background: ${color}"></div>
                    </div>
                </div>`;
            
            if (isExpanded && hasMultipleSubs) {
                html += `<div class="category-subs">`;
                subsArray.forEach(([subName, subData]) => {
                    html += `<div class="sub-item">
                        <span class="text-gray-600">${subName}</span>
                        <div class="text-right">
                            <span class="font-medium text-gray-800">${subData.amount.toLocaleString()}</span>
                            <span class="text-xs text-gray-400 ml-2">${Math.round((subData.amount / cat.amount) * 100)}%</span>
                        </div>
                    </div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        } else {
            html += `<div class="category-card">
                <div class="category-header cursor-default">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full" style="background: ${color}"></div>
                            <span class="text-gray-800 font-medium">${cat.name}</span>
                        </div>
                        <div class="text-right">
                            <div class="font-semibold text-gray-800">${cat.amount.toLocaleString()}</div>
                            <div class="text-xs text-gray-500">${percent}%</div>
                        </div>
                    </div>
                    <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all" style="width: ${percent}%; background: ${color}"></div>
                    </div>
                </div>
            </div>`;
        }
    });
    
    container.innerHTML = html;
}

// ======== ГРАФИК ========
function renderChart() {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;
    
    const budget = calculateBudget();
    const monthExpenses = getMonthExpenses();
    const days = getDaysInMonth(currentViewMonth);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentViewMonth.getMonth() && today.getFullYear() === currentViewMonth.getFullYear();
    const maxDay = isCurrentMonth ? today.getDate() : days;
    
    const labels = [], plannedData = [], actualData = [];
    const dailyBudget = budget.available / days;
    const expensesByDay = {};
    monthExpenses.forEach(e => {
        const day = new Date(e.date).getDate();
        expensesByDay[day] = (expensesByDay[day] || 0) + e.amount;
    });
    
    let cumulativeActual = 0;
    for (let day = 1; day <= maxDay; day++) {
        labels.push(day);
        plannedData.push(Math.round(dailyBudget * day));
        cumulativeActual += expensesByDay[day] || 0;
        actualData.push(Math.round(cumulativeActual));
    }
    
    if (budgetChart) budgetChart.destroy();
    
    budgetChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'План', data: plannedData, borderColor: '#4285f4', backgroundColor: 'rgba(66, 133, 244, 0.1)', borderWidth: 2, fill: true, tension: 0.1 },
                { label: 'Факт', data: actualData, borderColor: '#ea4335', backgroundColor: 'rgba(234, 67, 53, 0.1)', borderWidth: 2, fill: true, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } } }
        }
    });
}

// ======== ВКЛАДКА "ОБЩЕЕ" ========
function renderTotalTab() {
    const genaBudget = calculateBudget('gena'), galyaBudget = calculateBudget('galya');
    const genaExpenses = getMonthExpenses('gena'), galyaExpenses = getMonthExpenses('galya');
    const genaSpent = genaExpenses.reduce((sum, e) => sum + e.amount, 0);
    const galyaSpent = galyaExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('totalGenaSalary').textContent = genaBudget.totalIncome.toLocaleString();
    document.getElementById('totalGenaSavings').textContent = genaBudget.savings.toLocaleString();
    document.getElementById('totalGenaFixed').textContent = genaBudget.fixedTotal.toLocaleString();
    document.getElementById('totalGenaSpent').textContent = genaSpent.toLocaleString();
    document.getElementById('totalGenaRemaining').textContent = genaBudget.currentBalance.toLocaleString();
    document.getElementById('totalGenaRemaining').className = `font-bold ${genaBudget.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;

    document.getElementById('totalGalyaSalary').textContent = galyaBudget.totalIncome.toLocaleString();
    document.getElementById('totalGalyaSavings').textContent = galyaBudget.savings.toLocaleString();
    document.getElementById('totalGalyaFixed').textContent = galyaBudget.fixedTotal.toLocaleString();
    document.getElementById('totalGalyaSpent').textContent = galyaSpent.toLocaleString();
    document.getElementById('totalGalyaRemaining').textContent = galyaBudget.currentBalance.toLocaleString();
    document.getElementById('totalGalyaRemaining').className = `font-bold ${galyaBudget.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;

    const totalIncome = genaBudget.totalIncome + galyaBudget.totalIncome;
    const totalSavings = genaBudget.savings + galyaBudget.savings;
    const totalFixed = genaBudget.fixedTotal + galyaBudget.fixedTotal;
    const totalSpent = genaSpent + galyaSpent;
    const totalBalance = genaBudget.currentBalance + galyaBudget.currentBalance;
    
    document.getElementById('totalFamilyIncome').textContent = totalIncome.toLocaleString();
    document.getElementById('totalFamilySavings').textContent = totalSavings.toLocaleString();
    document.getElementById('totalFamilyFixed').textContent = totalFixed.toLocaleString();
    document.getElementById('totalFamilySpent').textContent = totalSpent.toLocaleString();
    document.getElementById('totalFamilyRemaining').textContent = totalBalance.toLocaleString();
    document.getElementById('totalFamilyRemaining').className = `text-lg font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;
    
    renderTotalExpensesList(genaExpenses, galyaExpenses);
    renderTotalCategoryStats(genaExpenses, galyaExpenses);
}

function renderTotalExpensesList(genaExpenses, galyaExpenses) {
    const list = document.getElementById('totalExpensesList');
    const allExpenses = [...genaExpenses.map(e => ({...e, person: 'gena', personName: '👨 Гена'})), ...galyaExpenses.map(e => ({...e, person: 'galya', personName: '👩 Галя'}))].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    if (allExpenses.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center py-4">Нет трат за этот месяц</p>'; return; }
    list.innerHTML = allExpenses.map(e => {
        const date = new Date(e.date);
        const bgColor = e.person === 'gena' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200';
        return `<div class="flex items-center justify-between ${bgColor} rounded-lg px-3 py-2 border">
            <div class="flex items-center gap-3"><span class="text-gray-500 text-sm">${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)}</span><span class="text-xs">${e.personName}</span><span class="text-gray-800">${e.description}</span></div>
            <div class="flex items-center gap-2"><span class="text-blue-600 font-medium">${e.amount.toLocaleString()}</span>
            <button onclick="removeExpense(${e.id}, '${e.person}')" class="text-red-400 hover:text-red-600">&times;</button></div>
        </div>`;
    }).join('');
}

function renderTotalCategoryStats(genaExpenses, galyaExpenses) {
    const container = document.getElementById('totalCategoryStats');
    const allExpenses = [...genaExpenses, ...galyaExpenses];
    if (allExpenses.length === 0) { container.innerHTML = '<p class="text-gray-400 text-center py-4">Добавьте траты для статистики</p>'; return; }
    const categories = {};
    allExpenses.forEach(e => {
        const match = e.description.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])\s*\S+/u);
        const category = match ? match[0] : e.description.split(' ')[0];
        categories[category] = (categories[category] || 0) + e.amount;
    });
    const total = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
    container.innerHTML = sorted.map(([cat, amount], index) => {
        const percent = Math.round((amount / total) * 100);
        return `<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div class="flex justify-between items-center mb-2"><span class="text-gray-800 font-medium">${cat}</span><span class="text-blue-600 font-medium">${amount.toLocaleString()}</span></div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden"><div class="h-full ${colors[index % colors.length]} rounded-full" style="width: ${percent}%"></div></div>
            <div class="text-right text-gray-500 text-xs mt-1">${percent}%</div>
        </div>`;
    }).join('');
}

// ======== НАВИГАЦИЯ ========
function changeMonth(delta) {
    currentViewMonth.setMonth(currentViewMonth.getMonth() + delta);
    clearDayFilter();
    renderAll();
}

function goToCurrentMonth() {
    currentViewMonth = new Date();
    clearDayFilter();
    renderAll();
}

// ======== ДАННЫЕ ========
function syncData() {
    if (db && currentRoomId) dataRef.update({ data, lastUpdated: firebase.database.ServerValue.TIMESTAMP }).catch(console.error);
    saveLocalData();
}

function saveLocalData() { localStorage.setItem('familyBudgetData', JSON.stringify(data)); }

function loadLocalData() {
    const saved = localStorage.getItem('familyBudgetData');
    if (saved) data = JSON.parse(saved);
    renderAll();
}

function clearMonthExpenses() {
    if (currentTab === 'total') return;
    const monthKey = getMonthKey(currentViewMonth);
    const monthName = `${monthNames[currentViewMonth.getMonth()]} ${currentViewMonth.getFullYear()}`;
    if (confirm(`Удалить все траты за ${monthName}?`)) {
        data[currentTab].expenses = getCurrentExpenses().filter(e => !e.date?.startsWith(monthKey));
        clearDayFilter();
        syncData();
        renderAll();
    }
}

// ======== FIREBASE ========
const generateRoomId = () => { const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let result = ''; for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length)); return result; };
const createRoom = () => joinRoomById(generateRoomId());
const joinRoom = () => { const roomId = document.getElementById('roomIdInput').value.trim().toUpperCase(); if (roomId) joinRoomById(roomId); };

function joinRoomById(roomId) {
    if (!db) { 
        alert('Работаем в локальном режиме'); 
        loadLocalData(); 
        return; 
    }
    currentRoomId = roomId;
    localStorage.setItem('familyBudgetRoomId', roomId);
    if (dataRef) dataRef.off();
    dataRef = db.ref('family/' + roomId);
    dataRef.on('value', snapshot => {
        const savedData = snapshot.val();
        if (savedData?.data) {
            // Загружаем данные из Firebase
            data = savedData.data;
            // Убедимся что структура данных корректная
            if (!data.gena) data.gena = { settings: { savingsPercent: 0 }, fixedPayments: [], expenses: [], incomes: [], customCategories: [] };
            if (!data.galya) data.galya = { settings: { savingsPercent: 0 }, fixedPayments: [], expenses: [], incomes: [], customCategories: [] };
            if (!data.gena.settings) data.gena.settings = { savingsPercent: 0 };
            if (!data.galya.settings) data.galya.settings = { savingsPercent: 0 };
            if (!Array.isArray(data.gena.fixedPayments)) data.gena.fixedPayments = [];
            if (!Array.isArray(data.gena.expenses)) data.gena.expenses = [];
            if (!Array.isArray(data.gena.incomes)) data.gena.incomes = [];
            if (!Array.isArray(data.gena.customCategories)) data.gena.customCategories = [];
            if (!Array.isArray(data.galya.fixedPayments)) data.galya.fixedPayments = [];
            if (!Array.isArray(data.galya.expenses)) data.galya.expenses = [];
            if (!Array.isArray(data.galya.incomes)) data.galya.incomes = [];
            if (!Array.isArray(data.galya.customCategories)) data.galya.customCategories = [];
        } else {
            // Если данных нет — используем пустой шаблон (не localStorage!)
            data = JSON.parse(JSON.stringify(emptyData));
        }
        renderAll();
        updateConnectionStatus(true);
    }, (error) => {
        console.error('Firebase error:', error);
        updateConnectionStatus(false);
    });
    updateRoomUI();
    history.replaceState(null, '', '?room=' + roomId);
}

function leaveRoom() {
    if (dataRef) dataRef.off();
    currentRoomId = null;
    localStorage.removeItem('familyBudgetRoomId');
    updateRoomUI();
    updateConnectionStatus(false);
    history.replaceState(null, '', window.location.pathname);
    loadLocalData();
}

function updateRoomUI() {
    const info = document.getElementById('roomInfo');
    if (currentRoomId) { info.classList.remove('hidden'); document.getElementById('currentRoomId').textContent = currentRoomId; }
    else info.classList.add('hidden');
}

function copyRoomLink() {
    const link = window.location.origin + window.location.pathname + '?room=' + currentRoomId;
    navigator.clipboard.writeText(link).then(() => alert('Ссылка скопирована!\n' + link));
}

function updateConnectionStatus(online) {
    const status = document.getElementById('connectionStatus');
    if (online && currentRoomId) { 
        status.textContent = '🟢'; 
        status.className = 'px-2 py-1 text-lg'; 
        status.title = 'Синхронизировано';
    } else { 
        status.textContent = '🔴'; 
        status.className = 'px-2 py-1 text-lg'; 
        status.title = 'Локально';
    }
}

// ======== ИМПОРТ EXCEL / PDF ========
let excelData = null, lastImportData = null;
const BANK_COLUMNS = { date: 0, code: 3, category: 4, description: 11, amount: 12 };
const START_ROW = 19;

const BANK_CATEGORY_MAP = {
    // Маркетплейсы
    'ozon': '📦 Маркетплейсы', 'озон': '📦 Маркетплейсы', 'wildberries': '📦 Маркетплейсы', 'вайлдберриз': '📦 Маркетплейсы', 'wb': '📦 Маркетплейсы',
    'яндекс маркет': '📦 Маркетплейсы', 'aliexpress': '📦 Маркетплейсы', 'lamoda': '📦 Маркетплейсы', 'сбермегамаркет': '📦 Маркетплейсы',
    // Магазины (русские названия)
    'пятёрочка': '🏪 Магазины: Пятёрочка', 'пятерочка': '🏪 Магазины: Пятёрочка', 
    'магнит': '🏪 Магазины: Магнит', 
    'перекрёсток': '🏪 Магазины: Перекрёсток', 'перекресток': '🏪 Магазины: Перекрёсток',
    'дикси': '🏪 Магазины: Дикси', 
    'ашан': '🏪 Магазины: Ашан', 
    'лента': '🏪 Магазины: Лента',
    'вкусвилл': '🏪 Магазины: ВкусВилл', 
    'самокат': '🏪 Магазины: Самокат',
    'метро': '🏪 Магазины: Метро',
    'окей': '🏪 Магазины: О\'Кей', 'o\'key': '🏪 Магазины: О\'Кей',
    'светофор': '🏪 Магазины: Светофор',
    'чижик': '🏪 Магазины: Чижик',
    'красное белое': '🏪 Магазины: Красное&Белое', 'красное и белое': '🏪 Магазины: Красное&Белое',
    'fix price': '🏪 Магазины: Fix Price', 'фикс прайс': '🏪 Магазины: Fix Price',
    'глобус': '🏪 Магазины: Глобус',
    'азбука вкуса': '🏪 Магазины: Азбука Вкуса',
    'spar': '🏪 Магазины: Spar', 'спар': '🏪 Магазины: Spar',
    'верный': '🏪 Магазины: Верный',
    'bristol': '🏪 Магазины: Бристоль', 'бристоль': '🏪 Магазины: Бристоль',
    // Магазины (транслит и английские названия для банковских выписок)
    'pyaterochka': '🏪 Магазины: Пятёрочка', 'perekrestok': '🏪 Магазины: Перекрёсток',
    'magnit': '🏪 Магазины: Магнит', 'lenta': '🏪 Магазины: Лента',
    'auchan': '🏪 Магазины: Ашан', 'dixy': '🏪 Магазины: Дикси', 'diksi': '🏪 Магазины: Дикси',
    'vkusvill': '🏪 Магазины: ВкусВилл', 'globus': '🏪 Магазины: Глобус',
    'metro': '🏪 Магазины: Метро', 'okey': '🏪 Магазины: О\'Кей',
    // Продукты
    'супермаркеты': '🛒 Продукты', 'продукты': '🛒 Продукты',
    // Еда и рестораны
    'рестораны': '🍔 Еда', 'кафе': '🍔 Еда', 'фастфуд': '🍔 Еда', 'яндекс еда': '🍔 Еда', 'delivery club': '🍔 Еда',
    'mcdonalds': '🍔 Еда', 'kfc': '🍔 Еда', 'burger king': '🍔 Еда', 'бургер кинг': '🍔 Еда',
    'вкусно и точка': '🍔 Еда', 'теремок': '🍔 Еда', 'subway': '🍔 Еда', 'сабвей': '🍔 Еда',
    'додо': '🍔 Еда', 'dodo': '🍔 Еда', 'pizza': '🍔 Еда', 'пицца': '🍔 Еда',
    'суши': '🍔 Еда', 'sushi': '🍔 Еда', 'роллы': '🍔 Еда',
    // Транспорт
    'транспорт': '🚗 Транспорт', 'такси': '🚗 Транспорт', 'бензин': '🚗 Транспорт', 'топливо': '🚗 Транспорт',
    'лукойл': '🚗 Транспорт', 'газпромнефть': '🚗 Транспорт', 'роснефть': '🚗 Транспорт',
    'lukoil': '🚗 Транспорт', 'gazprom': '🚗 Транспорт', 'rosneft': '🚗 Транспорт',
    'яндекс такси': '🚗 Транспорт', 'uber': '🚗 Транспорт', 'ситимобил': '🚗 Транспорт',
    'метрополитен': '🚗 Транспорт', 'тройка': '🚗 Транспорт', 'подорожник': '🚗 Транспорт',
    // Здоровье
    'аптека': '💊 Здоровье', 'медицина': '💊 Здоровье', 'pharmacy': '💊 Здоровье', 'здоровье': '💊 Здоровье',
    'горздрав': '💊 Здоровье', 'столички': '💊 Здоровье', 'ригла': '💊 Здоровье', 'аптека ру': '💊 Здоровье',
    'клиника': '💊 Здоровье', 'стоматолог': '💊 Здоровье', 'dentist': '💊 Здоровье',
    // Одежда
    'одежда': '👕 Одежда', 'обувь': '👕 Одежда', 'zara': '👕 Одежда', 'h&m': '👕 Одежда',
    'uniqlo': '👕 Одежда', 'спортмастер': '👕 Одежда', 'декатлон': '👕 Одежда', 'adidas': '👕 Одежда', 'nike': '👕 Одежда',
    // Развлечения
    'развлечения': '🎮 Развлечения', 'кино': '🎮 Развлечения', 'cinema': '🎮 Развлечения', 'кинотеатр': '🎮 Развлечения',
    'steam': '🎮 Развлечения', 'playstation': '🎮 Развлечения', 'xbox': '🎮 Развлечения',
    'netflix': '🎮 Развлечения', 'spotify': '🎮 Развлечения', 'youtube': '🎮 Развлечения', 'кинопоиск': '🎮 Развлечения',
    'концерт': '🎮 Развлечения', 'театр': '🎮 Развлечения', 'музей': '🎮 Развлечения',
    // Дом
    'хозтовары': '🏠 Дом', 'мебель': '🏠 Дом', 'ikea': '🏠 Дом', 'икеа': '🏠 Дом',
    'леруа': '🏠 Дом', 'leroy': '🏠 Дом', 'obi': '🏠 Дом', 'оби': '🏠 Дом',
    'петрович': '🏠 Дом', 'строительный': '🏠 Дом', 'ремонт': '🏠 Дом',
    // Кофе и кофейни
    'кофейня': '☕ Кофе', 'кофе': '☕ Кофе', 'coffee': '☕ Кофе', 'coffe': '☕ Кофе', 'cofee': '☕ Кофе',
    'starbucks': '☕ Кофе', 'старбакс': '☕ Кофе', 'шоколадница': '☕ Кофе', 'кофе хауз': '☕ Кофе',
    'costa': '☕ Кофе', 'даблби': '☕ Кофе', 'skuratov': '☕ Кофе', 'скуратов': '☕ Кофе',
    'surf coffee': '☕ Кофе', 'cofix': '☕ Кофе', 'кофикс': '☕ Кофе', 'капучино': '☕ Кофе',
    'эспрессо': '☕ Кофе', 'латте': '☕ Кофе', 'americano': '☕ Кофе', 'cappuccino': '☕ Кофе',
    // Красота
    'салон красоты': '💅 Красота', 'парикмахерская': '💅 Красота', 'барбершоп': '💅 Красота', 'маникюр': '💅 Красота',
    'косметика': '💅 Красота', 'л\'этуаль': '💅 Красота', 'letual': '💅 Красота', 'рив гош': '💅 Красота',
    'золотое яблоко': '💅 Красота', 'иль де ботэ': '💅 Красота',
    // Связь и интернет
    'мтс': '📱 Связь', 'билайн': '📱 Связь', 'мегафон': '📱 Связь', 'теле2': '📱 Связь', 'yota': '📱 Связь',
    'ростелеком': '📱 Связь', 'дом.ру': '📱 Связь', 'интернет': '📱 Связь',
    // Образование
    'книги': '📚 Образование', 'курсы': '📚 Образование', 'обучение': '📚 Образование',
    'skillbox': '📚 Образование', 'нетология': '📚 Образование', 'geekbrains': '📚 Образование',
    // Подарки
    'подарки': '🎁 Подарки', 'цветы': '🎁 Подарки', 'флорист': '🎁 Подарки',
    // Путешествия
    'отель': '✈️ Путешествия', 'гостиница': '✈️ Путешествия', 'booking': '✈️ Путешествия',
    'авиабилеты': '✈️ Путешествия', 'ржд': '✈️ Путешествия', 'аэрофлот': '✈️ Путешествия', 's7': '✈️ Путешествия',
    // Электроника
    'dns': '🖥️ Электроника', 'днс': '🖥️ Электроника', 'мвидео': '🖥️ Электроника', 'm.video': '🖥️ Электроника',
    'эльдорадо': '🖥️ Электроника', 'ситилинк': '🖥️ Электроника', 'citilink': '🖥️ Электроника',
    're:store': '🖥️ Электроника', 'apple': '🖥️ Электроника'
};

// Расширенный словарь для парсинга "место совершения операции" из банковской выписки
const STORE_NAME_MAP = {
    // Продуктовые магазины
    'lenta': '🏪 Магазины: Лента',
    'лента': '🏪 Магазины: Лента',
    'magnit': '🏪 Магазины: Магнит',
    'магнит': '🏪 Магазины: Магнит',
    'pyaterochka': '🏪 Магазины: Пятёрочка',
    'пятерочка': '🏪 Магазины: Пятёрочка',
    'пятёрочка': '🏪 Магазины: Пятёрочка',
    'perekrestok': '🏪 Магазины: Перекрёсток',
    'перекресток': '🏪 Магазины: Перекрёсток',
    'перекрёсток': '🏪 Магазины: Перекрёсток',
    'auchan': '🏪 Магазины: Ашан',
    'ашан': '🏪 Магазины: Ашан',
    'metro': '🏪 Магазины: Метро',
    'метро': '🏪 Магазины: Метро',
    'dixy': '🏪 Магазины: Дикси',
    'diksi': '🏪 Магазины: Дикси',
    'дикси': '🏪 Магазины: Дикси',
    'vkusvill': '🏪 Магазины: ВкусВилл',
    'вкусвилл': '🏪 Магазины: ВкусВилл',
    'okey': '🏪 Магазины: О\'Кей',
    'o\'key': '🏪 Магазины: О\'Кей',
    'окей': '🏪 Магазины: О\'Кей',
    'globus': '🏪 Магазины: Глобус',
    'глобус': '🏪 Магазины: Глобус',
    'spar': '🏪 Магазины: Spar',
    'спар': '🏪 Магазины: Spar',
    'bristol': '🏪 Магазины: Бристоль',
    'бристоль': '🏪 Магазины: Бристоль',
    'fix price': '🏪 Магазины: Fix Price',
    'fixprice': '🏪 Магазины: Fix Price',
    'фикс прайс': '🏪 Магазины: Fix Price',
    'svetofor': '🏪 Магазины: Светофор',
    'светофор': '🏪 Магазины: Светофор',
    'chizhik': '🏪 Магазины: Чижик',
    'чижик': '🏪 Магазины: Чижик',
    'samokat': '🏪 Магазины: Самокат',
    'самокат': '🏪 Магазины: Самокат',
    'azbuka': '🏪 Магазины: Азбука Вкуса',
    'азбука': '🏪 Магазины: Азбука Вкуса',
    'vernyi': '🏪 Магазины: Верный',
    'верный': '🏪 Магазины: Верный',
    'krasnoe': '🏪 Магазины: Красное&Белое',
    'красное': '🏪 Магазины: Красное&Белое',
    'monetka': '🏪 Магазины: Монетка',
    'монетка': '🏪 Магазины: Монетка',
    'karusel': '🏪 Магазины: Карусель',
    'карусель': '🏪 Магазины: Карусель',
    'billa': '🏪 Магазины: Билла',
    'билла': '🏪 Магазины: Билла',
    'maria-ra': '🏪 Магазины: Мария-Ра',
    'мария-ра': '🏪 Магазины: Мария-Ра',
    'yarche': '🏪 Магазины: Ярче',
    'ярче': '🏪 Магазины: Ярче',
    // Маркетплейсы
    'ozon': '📦 Маркетплейсы',
    'озон': '📦 Маркетплейсы',
    'wildberries': '📦 Маркетплейсы',
    'вайлдберриз': '📦 Маркетплейсы',
    'yandex': '📦 Маркетплейсы',
    'яндекс': '📦 Маркетплейсы',
    'aliexpress': '📦 Маркетплейсы',
    'алиэкспресс': '📦 Маркетплейсы',
    'lamoda': '📦 Маркетплейсы',
    'ламода': '📦 Маркетплейсы',
    // Электроника
    'mvideo': '🖥️ Электроника: М.Видео',
    'м.видео': '🖥️ Электроника: М.Видео',
    'eldorado': '🖥️ Электроника: Эльдорадо',
    'эльдорадо': '🖥️ Электроника: Эльдорадо',
    'dns': '🖥️ Электроника: DNS',
    'днс': '🖥️ Электроника: DNS',
    'citilink': '🖥️ Электроника: Ситилинк',
    'ситилинк': '🖥️ Электроника: Ситилинк',
    // Дом и ремонт
    'leroy': '🏠 Дом: Леруа Мерлен',
    'lerua': '🏠 Дом: Леруа Мерлен',
    'леруа': '🏠 Дом: Леруа Мерлен',
    'obi': '🏠 Дом: OBI',
    'оби': '🏠 Дом: OBI',
    'ikea': '🏠 Дом: IKEA',
    'икеа': '🏠 Дом: IKEA',
    'hoff': '🏠 Дом: Hoff',
    'хофф': '🏠 Дом: Hoff',
    'castorama': '🏠 Дом: Castorama',
    'касторама': '🏠 Дом: Castorama',
    // Аптеки
    'apteka': '💊 Аптека',
    'аптека': '💊 Аптека',
    'gorzdrav': '💊 Аптека: Горздрав',
    'горздрав': '💊 Аптека: Горздрав',
    'stolichki': '💊 Аптека: Столички',
    'столички': '💊 Аптека: Столички',
    'rigla': '💊 Аптека: Ригла',
    'ригла': '💊 Аптека: Ригла',
    // АЗС
    'lukoil': '⛽ АЗС: Лукойл',
    'лукойл': '⛽ АЗС: Лукойл',
    'gazprom': '⛽ АЗС: Газпромнефть',
    'газпром': '⛽ АЗС: Газпромнефть',
    'rosneft': '⛽ АЗС: Роснефть',
    'роснефть': '⛽ АЗС: Роснефть',
    'shell': '⛽ АЗС: Shell',
    'шелл': '⛽ АЗС: Shell',
    'bp': '⛽ АЗС: BP',
    // Фастфуд
    'mcdonalds': '🍔 Фастфуд: McDonald\'s',
    'макдональдс': '🍔 Фастфуд: McDonald\'s',
    'вкусно и точка': '🍔 Фастфуд: Вкусно и точка',
    'kfc': '🍔 Фастфуд: KFC',
    'кфс': '🍔 Фастфуд: KFC',
    'burger king': '🍔 Фастфуд: Burger King',
    'бургер кинг': '🍔 Фастфуд: Burger King',
    'subway': '🍔 Фастфуд: Subway',
    'сабвей': '🍔 Фастфуд: Subway',
    'dodo': '🍔 Фастфуд: Додо Пицца',
    'додо': '🍔 Фастфуд: Додо Пицца',
    // Одежда
    'zara': '👕 Одежда: Zara',
    'зара': '👕 Одежда: Zara',
    'h&m': '👕 Одежда: H&M',
    'uniqlo': '👕 Одежда: Uniqlo',
    'юникло': '👕 Одежда: Uniqlo',
    'sportmaster': '👕 Одежда: Спортмастер',
    'спортмастер': '👕 Одежда: Спортмастер',
    'decathlon': '👕 Одежда: Декатлон',
    'декатлон': '👕 Одежда: Декатлон',
    'gloria': '👕 Одежда: Gloria Jeans',
    'глория': '👕 Одежда: Gloria Jeans'
};

// MCC коды для категоризации
const MCC_CATEGORY_MAP = {
    // Продукты и супермаркеты
    '5411': '🛒 Продукты', '5412': '🛒 Продукты', '5499': '🛒 Продукты',
    '5311': '🛒 Продукты', '5331': '🛒 Продукты', '5399': '🛒 Продукты',
    // Рестораны и кафе
    '5812': '🍔 Еда', '5813': '🍔 Еда', '5814': '☕ Кофе/Фастфуд',
    // АЗС
    '5541': '⛽ АЗС', '5542': '⛽ АЗС', '5983': '⛽ АЗС',
    // Аптеки
    '5912': '💊 Аптека',
    // Одежда
    '5691': '👕 Одежда', '5651': '👕 Одежда', '5611': '👕 Одежда',
    // Такси
    '4121': '🚕 Такси', '4131': '🚕 Такси',
    // Маркетплейсы
    '5999': '📦 Маркетплейсы',
    // Электроника
    '5732': '🖥️ Электроника', '5734': '🖥️ Электроника',
    // Развлечения
    '7832': '🎮 Развлечения', '7841': '🎮 Развлечения',
    // Красота
    '7230': '💅 Красота', '7298': '💅 Красота'
};

function mapBankCategory(bankCategory, description, code) {
    if (code?.toLowerCase().startsWith('c42')) return '📦 Маркетплейсы';
    const searchText = (bankCategory + ' ' + description).toLowerCase();
    
    // Извлекаем MCC код из описания
    const mccMatch = description.match(/MCC:\s*(\d{4})/i);
    if (mccMatch) {
        const mcc = mccMatch[1];
        if (MCC_CATEGORY_MAP[mcc]) {
            // Пытаемся также извлечь название заведения
            const placeMatch = description.match(/место совершения операции:\s*[^,]*\/([^,]+)/i);
            if (placeMatch) {
                const placeName = placeMatch[1].replace(/\s*\d+$/, '').trim();
                // Для кофе/фастфуда добавляем название заведения
                if (mcc === '5814' && placeName) {
                    return `☕ Кофе/Фастфуд: ${placeName}`;
                }
            }
            return MCC_CATEGORY_MAP[mcc];
        }
    }
    
    // Парсим "место совершения операции" для определения магазина
    const placeMatch = description.match(/место совершения операции:\s*[^,]*\/([^,]+)/i);
    if (placeMatch) {
        const storeName = placeMatch[1].toLowerCase().replace(/\s*\d+$/, '').trim();
        for (const [keyword, ourCategory] of Object.entries(STORE_NAME_MAP)) {
            if (storeName.includes(keyword)) return ourCategory;
        }
        // Если магазин не найден в словаре, но есть MCC для продуктов — это магазин
        if (mccMatch && ['5411', '5412', '5499', '5311', '5331', '5399'].includes(mccMatch[1])) {
            const placeName = placeMatch[1].replace(/\s*\d+$/, '').trim();
            return `🏪 Магазины: ${placeName}`;
        }
    }
    
    for (const [keyword, ourCategory] of Object.entries(BANK_CATEGORY_MAP)) {
        if (searchText.includes(keyword)) return ourCategory;
    }
    return null;
}

function detectSpecialTransfer(description, code) {
    if (code?.toLowerCase().startsWith('c42')) return '📦 Маркетплейсы';
    const lowerDesc = description.toLowerCase();
    
    // Проверяем, есть ли это перевод по СБП
    const isSbpTransfer = lowerDesc.includes('перевод') || lowerDesc.includes('сбп') || lowerDesc.includes('sbp');
    
    if (isSbpTransfer) {
        // Перевод Гале (если есть цифры "1048" в номере телефона)
        if (lowerDesc.includes('1048')) {
            return '💸 Переводы Гале';
        }
        
        // Перевод на Ozon
        if (lowerDesc.includes('ozon')) {
            return '📦 Маркетплейсы';
        }
        
        // Любой другой перевод по СБП
        return '💸 Перевод по СБП';
    }
    
    return description;
}

function isDuplicate(date, amount, description) {
    const expenses = getCurrentExpenses(), incomes = getCurrentIncomes();
    return expenses.some(e => e.date === date && Math.abs(e.amount - amount) < 0.01 && e.description === description) ||
           incomes.some(i => i.date === date && Math.abs(i.amount - amount) < 0.01 && i.description === description);
}

function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileData = new Uint8Array(e.target.result);
            const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
            if (jsonData.length <= START_ROW) { alert(`Файл содержит менее ${START_ROW + 1} строк.`); return; }
            const rawData = jsonData.slice(START_ROW);
            excelData = { expenses: [], incomes: [] };
            let skipped = 0;
            rawData.forEach(row => {
                if (!row?.length) return;
                const dateVal = row[BANK_COLUMNS.date], code = row[BANK_COLUMNS.code] || '', category = row[BANK_COLUMNS.category] || '';
                const description = row[BANK_COLUMNS.description] || '', amountVal = row[BANK_COLUMNS.amount];
                const date = parseExcelDate(dateVal), amountInfo = parseExcelAmount(amountVal);
                if (!date || !amountInfo || amountInfo.value === 0) { if (dateVal || amountVal) skipped++; return; }
                if (amountInfo.isIncome) { excelData.incomes.push({ date, description: '💵 Поступление', amount: amountInfo.value }); return; }
                const originalDesc = category && description ? `${category}: ${description}` : (category || description);
                let fullDescription = detectSpecialTransfer(originalDesc, code);
                if (fullDescription === originalDesc) {
                    const mappedCategory = mapBankCategory(category, description, code);
                    if (mappedCategory) fullDescription = mappedCategory;
                }
                if (isDuplicate(date, amountInfo.value, fullDescription)) { skipped++; return; }
                if (fullDescription) excelData.expenses.push({ date, description: fullDescription, amount: amountInfo.value });
            });
            if (!excelData.expenses.length && !excelData.incomes.length) { alert('Не найдено операций для импорта.'); return; }
            document.getElementById('excelRowCount').textContent = excelData.expenses.length;
            const totalIncome = excelData.incomes.reduce((s, i) => s + i.amount, 0);
            document.getElementById('excelSkippedCount').textContent = (totalIncome > 0 ? `💵 Поступления: ${totalIncome.toLocaleString()}` : '') + (skipped > 0 ? ` (пропущено: ${skipped})` : '');
            renderExcelPreview();
            document.getElementById('excelPreview').classList.remove('hidden');
        } catch (err) { console.error(err); alert('Ошибка чтения файла: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
}

function renderExcelPreview() {
    const previewRows = excelData.expenses.slice(0, 10);
    const totalIncome = excelData.incomes.reduce((s, i) => s + i.amount, 0);
    let html = '<table class="w-full text-xs"><thead><tr class="bg-gray-100"><th class="p-2 text-left">Дата</th><th class="p-2 text-left">Описание</th><th class="p-2 text-right">Сумма</th></tr></thead><tbody>';
    if (totalIncome > 0) html += `<tr class="border-t border-green-200 bg-green-50"><td class="p-2 text-green-600">💵</td><td class="p-2 text-green-700 font-medium">Поступления (${excelData.incomes.length} шт.)</td><td class="p-2 text-right font-bold text-green-600">+${totalIncome.toLocaleString()}</td></tr>`;
    previewRows.forEach(row => {
        const parts = row.date.split('-');
        html += `<tr class="border-t border-gray-100"><td class="p-2 text-gray-600">${parts[2]}.${parts[1]}.${parts[0]}</td><td class="p-2 text-gray-800">${row.description}</td><td class="p-2 text-right font-medium text-red-500">-${row.amount.toLocaleString()}</td></tr>`;
    });
    if (excelData.expenses.length > 10) html += `<tr class="border-t border-gray-200"><td colspan="3" class="p-2 text-center text-gray-400">... ещё ${excelData.expenses.length - 10} расходов</td></tr>`;
    const totalExpenses = excelData.expenses.reduce((sum, row) => sum + row.amount, 0);
    html += `<tr class="border-t-2 border-gray-300 bg-gray-50"><td colspan="2" class="p-2 font-medium text-gray-700">Итого расходов:</td><td class="p-2 text-right font-bold text-red-500">-${totalExpenses.toLocaleString()}</td></tr></tbody></table>`;
    document.getElementById('excelPreviewTable').innerHTML = html;
}

function parseExcelDate(value) {
    if (!value) return null;
    if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const str = String(value).trim();
    let match = str.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
    if (match) { let year = parseInt(match[3]); if (year < 100) year += 2000; return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`; }
    match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const date = new Date(str);
    return !isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
}

function parseExcelAmount(value) {
    if (!value) return null;
    const str = String(value).trim();
    const isExpense = str.includes('-');
    const num = parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(num) || num === 0 ? null : { value: Math.round(Math.abs(num) * 100) / 100, isIncome: !isExpense };
}

function importExcelData() {
    if (!excelData) { alert('Нет данных для импорта'); return; }
    const expenses = getCurrentExpenses(), incomes = getCurrentIncomes();
    lastImportData = { tab: currentTab, expenseIds: [], incomeIds: [] };
    excelData.expenses.forEach(row => {
        const newId = Date.now() + Math.random();
        expenses.push({ id: newId, date: row.date, description: row.description, amount: row.amount });
        lastImportData.expenseIds.push(newId);
    });
    excelData.incomes.forEach(row => {
        const newId = Date.now() + Math.random();
        incomes.push({ id: newId, date: row.date, description: row.description, amount: row.amount });
        lastImportData.incomeIds.push(newId);
    });
    syncData();
    renderAll();
    cancelExcelImport();
    updateUndoButton();
    const totalIncome = excelData.incomes.reduce((s, i) => s + i.amount, 0);
    alert(`✅ Импортировано: ${excelData.expenses.length} расходов` + (totalIncome > 0 ? `\n💵 Добавлено приходов: ${totalIncome.toLocaleString()}` : ''));
}

function undoLastImport() {
    if (!lastImportData) { alert('Нет данных для отмены'); return; }
    if (!confirm('Отменить последний импорт?')) return;
    const expenses = data[lastImportData.tab].expenses, incomes = data[lastImportData.tab].incomes;
    lastImportData.expenseIds.forEach(id => { const index = expenses.findIndex(e => e.id === id); if (index > -1) expenses.splice(index, 1); });
    lastImportData.incomeIds.forEach(id => { const index = incomes.findIndex(i => i.id === id); if (index > -1) incomes.splice(index, 1); });
    const count = lastImportData.expenseIds.length + lastImportData.incomeIds.length;
    lastImportData = null;
    syncData();
    renderAll();
    updateUndoButton();
    alert(`↩️ Отменено: ${count} операций`);
}

function updateUndoButton() {
    const container = document.getElementById('undoImportContainer');
    if (lastImportData && (lastImportData.expenseIds.length || lastImportData.incomeIds?.length)) {
        const count = lastImportData.expenseIds.length + (lastImportData.incomeIds?.length || 0);
        container.classList.remove('hidden');
        container.innerHTML = `<button onclick="undoLastImport()" class="w-full px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors text-sm">↩️ Отменить импорт (${count} операций)</button>`;
    } else container.classList.add('hidden');
}

function cancelExcelImport() {
    document.getElementById('excelPreview').classList.add('hidden');
    document.getElementById('excelFileInput').value = '';
    excelData = null;
}

// ======== ТЕМА ========
// Тема временно отключена

// ======== ПОИСК ОПЕРАЦИЙ ========
function searchOperations() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    if (!query) { resultsContainer.classList.add('hidden'); return; }
    
    const allExpenses = getCurrentExpenses();
    const allIncomes = getCurrentIncomes();
    const results = [
        ...allExpenses.filter(e => e.description.toLowerCase().includes(query)).map(e => ({...e, type: 'expense'})),
        ...allIncomes.filter(i => i.description.toLowerCase().includes(query)).map(i => ({...i, type: 'income'}))
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="text-gray-400 text-center py-2">Ничего не найдено</p>';
    } else {
        resultsContainer.innerHTML = results.map(r => {
            const date = new Date(r.date);
            const isIncome = r.type === 'income';
            return `<div class="flex items-center justify-between ${isIncome ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} rounded-lg px-3 py-2 border cursor-pointer hover:bg-gray-100" onclick="goToOperation('${r.date}')">
                <div class="flex items-center gap-2">
                    <span class="text-gray-500 text-xs">${date.getDate()}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}</span>
                    <span class="${isIncome ? 'text-green-700' : 'text-gray-800'}">${r.description}</span>
                </div>
                <span class="${isIncome ? 'text-green-600' : 'text-red-500'} font-medium">${isIncome ? '+' : '-'}${r.amount.toLocaleString()}</span>
            </div>`;
        }).join('');
    }
    resultsContainer.classList.remove('hidden');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').classList.add('hidden');
}

function goToOperation(dateStr) {
    const date = new Date(dateStr);
    currentViewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    clearSearch();
    renderAll();
    setDayFilter(dateStr);
}

// ======== СРАВНЕНИЕ МЕСЯЦЕВ ========
let comparisonChart = null;

function renderComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;
    
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = getMonthKey(date);
        months.push(monthNames[date.getMonth()].slice(0, 3));
        
        const monthIncomes = getCurrentIncomes().filter(inc => inc.date?.startsWith(monthKey));
        const monthExpenses = getCurrentExpenses().filter(exp => exp.date?.startsWith(monthKey));
        incomeData.push(monthIncomes.reduce((sum, i) => sum + i.amount, 0));
        expenseData.push(monthExpenses.reduce((sum, e) => sum + e.amount, 0));
    }
    
    if (comparisonChart) comparisonChart.destroy();
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Доходы', data: incomeData, backgroundColor: 'rgba(52, 168, 83, 0.7)', borderColor: '#34a853', borderWidth: 1 },
                { label: 'Расходы', data: expenseData, backgroundColor: 'rgba(234, 67, 53, 0.7)', borderColor: '#ea4335', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => (v/1000) + 'k' } } }
        }
    });
    
    // Таблица сравнения
    let tableHtml = '<table class="w-full text-xs"><thead><tr class="bg-gray-100"><th class="p-2 text-left">Месяц</th><th class="p-2 text-right">Доходы</th><th class="p-2 text-right">Расходы</th><th class="p-2 text-right">Баланс</th></tr></thead><tbody>';
    for (let i = 0; i < months.length; i++) {
        const balance = incomeData[i] - expenseData[i];
        tableHtml += `<tr class="border-t border-gray-200"><td class="p-2 font-medium">${months[i]}</td><td class="p-2 text-right text-green-600">+${incomeData[i].toLocaleString()}</td><td class="p-2 text-right text-red-500">-${expenseData[i].toLocaleString()}</td><td class="p-2 text-right font-medium ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}">${balance.toLocaleString()}</td></tr>`;
    }
    tableHtml += '</tbody></table>';
    document.getElementById('comparisonTable').innerHTML = tableHtml;
}

// ======== ЛИМИТЫ ПО КАТЕГОРИЯМ ========
function getCategoryLimits() {
    const d = getCurrentData();
    if (!d.categoryLimits) d.categoryLimits = [];
    return d.categoryLimits;
}

function addCategoryLimit() {
    if (currentTab === 'total') return;
    const category = document.getElementById('limitCategory').value.trim();
    const amount = parseFloat(document.getElementById('limitAmount').value);
    if (!category || !amount || amount <= 0) { alert('Введите категорию и сумму лимита'); return; }
    
    const limits = getCategoryLimits();
    const existing = limits.find(l => l.category.toLowerCase() === category.toLowerCase());
    if (existing) existing.amount = amount;
    else limits.push({ id: Date.now(), category, amount });
    
    document.getElementById('limitCategory').value = '';
    document.getElementById('limitAmount').value = '';
    syncData();
    renderLimits();
}

function removeCategoryLimit(id) {
    const limits = getCategoryLimits();
    const index = limits.findIndex(l => l.id === id);
    if (index > -1) limits.splice(index, 1);
    syncData();
    renderLimits();
}

function renderLimits() {
    const container = document.getElementById('limitsContainer');
    const limits = getCategoryLimits();
    const monthExpenses = getMonthExpenses();
    
    if (limits.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-2 text-sm">Нет установленных лимитов</p>';
        return;
    }
    
    container.innerHTML = limits.map(limit => {
        const spent = monthExpenses.filter(e => e.description.toLowerCase().includes(limit.category.toLowerCase())).reduce((sum, e) => sum + e.amount, 0);
        const percent = Math.round((spent / limit.amount) * 100);
        const isOver = percent > 100;
        const isWarning = percent > 80 && percent <= 100;
        const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500';
        const textColor = isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600';
        
        return `<div class="bg-white rounded-lg p-3 border border-gray-200">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-800">${limit.category}</span>
                <div class="flex items-center gap-2">
                    <span class="${textColor} font-medium">${spent.toLocaleString()} / ${limit.amount.toLocaleString()}</span>
                    <button onclick="removeCategoryLimit(${limit.id})" class="text-red-400 hover:text-red-600">&times;</button>
                </div>
            </div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full ${barColor} rounded-full transition-all" style="width: ${Math.min(percent, 100)}%"></div>
            </div>
            <div class="text-right text-xs mt-1 ${textColor}">${percent}%${isOver ? ' — превышен!' : ''}</div>
        </div>`;
    }).join('');
}

// ======== ОБНОВЛЕНИЕ renderAll ========
const originalRenderAll = renderAll;
renderAll = function() {
    originalRenderAll();
    if (currentTab !== 'total') {
        renderComparisonChart();
        renderLimits();
    }
};

// ======== GEMINI AI ========
function saveGeminiKey() {
    const key = document.getElementById('geminiApiKey').value.trim();
    if (!key) { alert('Введите API ключ'); return; }
    localStorage.setItem('geminiApiKey', key);
    document.getElementById('geminiStatus').innerHTML = '<span class="text-green-600">✅ Ключ сохранён</span>';
}

function loadGeminiKey() {
    const key = localStorage.getItem('geminiApiKey');
    if (key) {
        document.getElementById('geminiApiKey').value = key;
    }
}

async function testGeminiKey() {
    const key = document.getElementById('geminiApiKey').value.trim() || localStorage.getItem('geminiApiKey');
    if (!key) { 
        document.getElementById('geminiStatus').innerHTML = '<span class="text-red-600">❌ Введите API ключ</span>'; 
        return; 
    }
    
    document.getElementById('geminiStatus').innerHTML = '<span class="text-blue-600">⏳ Проверка...</span>';
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ответь одним словом: работает' }] }]
            })
        });
        
        if (response.ok) {
            document.getElementById('geminiStatus').innerHTML = '<span class="text-green-600">✅ Ключ работает!</span>';
        } else {
            const error = await response.json();
            document.getElementById('geminiStatus').innerHTML = `<span class="text-red-600">❌ Ошибка: ${error.error?.message || 'Неверный ключ'}</span>`;
        }
    } catch (e) {
        document.getElementById('geminiStatus').innerHTML = `<span class="text-red-600">❌ Ошибка подключения</span>`;
    }
}

async function categorizeWithGemini(description) {
    const key = localStorage.getItem('geminiApiKey');
    if (!key) return null;
    
    try {
        const prompt = `Определи категорию траты по описанию: "${description}".
        
Ответь ТОЛЬКО одним из вариантов (без объяснений):
- 🏪 Магазины: [название магазина]
- 🛒 Продукты
- 🍔 Еда
- ☕ Кофе
- 🚗 Транспорт
- ⛽ АЗС
- 💊 Здоровье
- 👕 Одежда
- 🎮 Развлечения
- 📦 Маркетплейсы
- 🏠 Дом
- 📱 Связь
- 💸 Переводы
- 💅 Красота
- 📚 Образование
- ✈️ Путешествия
- 📝 Другое

Если это магазин, укажи его название после двоеточия.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (result && result.length < 50) {
                return result;
            }
        }
    } catch (e) {
        console.error('Gemini error:', e);
    }
    return null;
}

// Функция для повторной проверки нераспознанных операций
async function recategorizeOperations() {
    const key = localStorage.getItem('geminiApiKey');
    if (!key) {
        alert('Сначала сохраните API ключ Gemini');
        return;
    }
    
    const statusEl = document.getElementById('geminiStatus');
    statusEl.innerHTML = '<span class="text-blue-600">🔄 Проверяю операции...</span>';
    
    // Категории-маркеры, которые считаем "нераспознанными"
    const uncategorizedMarkers = ['прочие операции', 'операция по карте', 'другое', '📝 другое'];
    
    // Собираем нераспознанные операции
    const expenses = getCurrentExpenses();
    const uncategorized = expenses.filter(e => {
        const descLower = e.description.toLowerCase();
        // Если описание содержит маркеры нераспознанных или не начинается с эмодзи
        const hasMarker = uncategorizedMarkers.some(m => descLower.includes(m));
        const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[\u{2600}-\u{26FF}]/u.test(e.description);
        return hasMarker || !startsWithEmoji;
    });
    
    if (uncategorized.length === 0) {
        statusEl.innerHTML = '<span class="text-green-600">✅ Все операции уже категоризированы!</span>';
        return;
    }
    
    statusEl.innerHTML = `<span class="text-blue-600">🔄 Найдено ${uncategorized.length} нераспознанных операций. Обрабатываю...</span>`;
    
    let updated = 0;
    let errors = 0;
    
    for (const expense of uncategorized) {
        try {
            // Сначала пробуем локальные словари
            const localCategory = mapBankCategory('', expense.description, '');
            
            if (localCategory) {
                expense.description = localCategory;
                updated++;
                console.log(`Local categorized: ${expense.description} → ${localCategory}`);
            } else {
                // Если локально не получилось — отправляем в Gemini
                const geminiCategory = await categorizeWithGemini(expense.description);
                if (geminiCategory && geminiCategory !== '📝 Другое') {
                    console.log(`Gemini categorized: ${expense.description} → ${geminiCategory}`);
                    expense.description = geminiCategory;
                    updated++;
                }
            }
            
            // Небольшая задержка чтобы не превысить лимит API
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (e) {
            console.error('Error categorizing:', e);
            errors++;
        }
    }
    
    // Сохраняем изменения
    if (updated > 0) {
        syncData();
        renderAll();
    }
    
    statusEl.innerHTML = `<span class="text-green-600">✅ Обновлено ${updated} из ${uncategorized.length} операций${errors > 0 ? ` (ошибок: ${errors})` : ''}</span>`;
}

// ======== СТАРТ ========
init();
loadGeminiKey();
