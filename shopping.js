const shoppingState = {
    items: [],
    manualTemplates: [],
    catalogFilter: 'all',
    categoryFilter: 'all',
    telegram: { token: '', chatId: '' }
};

const elements = {};

const catalogItems = [
    { emoji: '🍎', name: 'Яблоки', category: 'Продукты', quantity: '1 кг', unit: 'кг' },
    { emoji: '🍌', name: 'Бананы', category: 'Продукты', quantity: '1 кг', unit: 'кг' },
    { emoji: '🥛', name: 'Молоко', category: 'Продукты', quantity: '2 л', unit: 'л' },
    { emoji: '🥚', name: 'Яйца', category: 'Продукты', quantity: '10 шт', unit: 'шт' },
    { emoji: '🧀', name: 'Сыр', category: 'Продукты', quantity: '300 г', unit: 'г' },
    { emoji: '🍞', name: 'Хлеб', category: 'Продукты', quantity: '1 шт', unit: 'шт' },
    { emoji: '🥔', name: 'Картофель', category: 'Продукты', quantity: '2 кг', unit: 'кг' },
    { emoji: '🥦', name: 'Брокколи', category: 'Овощи', quantity: '500 г', unit: 'г' },
    { emoji: '🥕', name: 'Морковь', category: 'Овощи', quantity: '1 кг', unit: 'кг' },
    { emoji: '🍅', name: 'Помидоры', category: 'Овощи', quantity: '700 г', unit: 'г' },
    { emoji: '🧼', name: 'Мыло', category: 'Бытовая химия', quantity: '2 шт', unit: 'шт' },
    { emoji: '🧻', name: 'Бумага', category: 'Бытовая химия', quantity: '12 рулонов', unit: 'шт' },
    { emoji: '🧴', name: 'Шампунь', category: 'Бытовая химия', quantity: '1 шт', unit: 'шт' },
    { emoji: '🧽', name: 'Губки', category: 'Бытовая химия', quantity: '4 шт', unit: 'шт' },
    { emoji: '🍫', name: 'Шоколад', category: 'Сладкое', quantity: '2 плитки', unit: 'шт' },
    { emoji: '🍪', name: 'Печенье', category: 'Сладкое', quantity: '1 уп', unit: 'уп' },
    { emoji: '☕', name: 'Кофе', category: 'Напитки', quantity: '250 г', unit: 'г' },
    { emoji: '🍵', name: 'Чай', category: 'Напитки', quantity: '1 уп', unit: 'уп' },
    { emoji: '🥫', name: 'Консервы', category: 'Продукты', quantity: '2 шт', unit: 'шт' },
    { emoji: '🧂', name: 'Соль', category: 'Продукты', quantity: '1 шт', unit: 'шт' }
];

function initShopping() {
    cacheElements();
    loadState();
    bindEvents();
    renderAllShopping();
}

function cacheElements() {
    elements.itemName = document.getElementById('itemName');
    elements.itemQuantity = document.getElementById('itemQuantity');
    elements.itemCategory = document.getElementById('itemCategory');
    elements.itemsList = document.getElementById('itemsList');
    elements.statTotal = document.getElementById('statTotal');
    elements.statActive = document.getElementById('statActive');
    elements.statDone = document.getElementById('statDone');
    elements.manualTemplates = document.getElementById('manualTemplates');
    elements.categoryFilterChips = document.getElementById('categoryFilterChips');
    elements.catalogGrid = document.getElementById('catalogGrid');
    elements.catalogCategoryTabs = document.getElementById('catalogCategoryTabs');
    elements.catalogSearch = document.getElementById('catalogSearch');
    elements.topItemsList = document.getElementById('topItemsList');
    elements.categoriesList = document.getElementById('categoriesList');
    elements.telegramStatus = document.getElementById('telegramStatus');
    elements.settingsToken = document.getElementById('settingsTelegramToken');
    elements.settingsChatId = document.getElementById('settingsTelegramChatId');
}

function bindEvents() {
    document.getElementById('addItemBtn')?.addEventListener('click', () => handleAddItem());
    document.getElementById('clearList')?.addEventListener('click', clearList);
    elements.catalogSearch?.addEventListener('input', renderCatalog);
}

function loadState() {
    try {
        const items = localStorage.getItem('shoppingItems');
        const templates = localStorage.getItem('shoppingManualTemplates');
        const telegram = localStorage.getItem('shoppingTelegram');
        if (items) shoppingState.items = JSON.parse(items);
        if (templates) shoppingState.manualTemplates = JSON.parse(templates);
        if (telegram) {
            shoppingState.telegram = JSON.parse(telegram);
            elements.settingsToken.value = shoppingState.telegram.token || '';
            elements.settingsChatId.value = shoppingState.telegram.chatId || '';
        }
    } catch (e) {
        console.error('Load error', e);
    }
}

function saveState() {
    localStorage.setItem('shoppingItems', JSON.stringify(shoppingState.items));
    localStorage.setItem('shoppingManualTemplates', JSON.stringify(shoppingState.manualTemplates));
}

function handleAddItem(payload) {
    let name, quantity, category;
    if (payload) ({ name, quantity, category } = payload);
    else {
        name = elements.itemName.value.trim();
        quantity = elements.itemQuantity.value.trim();
        category = elements.itemCategory.value.trim();
    }
    if (!name) return alert('Введите название');
    if (!quantity) quantity = '1 шт';
    if (!category) category = 'П��одукты';
    const item = {
        id: crypto.randomUUID(),
        name,
        quantity,
        category,
        done: false,
        created: Date.now()
    };
    shoppingState.items.push(item);
    if (!payload) storeManualTemplate(name, quantity, category);
    clearInputs();
    saveState();
    renderAllShopping();
}

function storeManualTemplate(name, quantity, category) {
    const exists = shoppingState.manualTemplates.find(t => t.name === name);
    if (!exists) {
        shoppingState.manualTemplates.push({ id: crypto.randomUUID(), name, quantity, category });
        localStorage.setItem('shoppingManualTemplates', JSON.stringify(shoppingState.manualTemplates));
    }
}

function quickAdd(name, quantity, category) {
    handleAddItem({ name, quantity, category });
}

function clearInputs() {
    elements.itemName.value = '';
    elements.itemQuantity.value = '';
    elements.itemCategory.value = '';
}

function clearList() {
    if (!confirm('Очистить весь список?')) return;
    shoppingState.items = [];
    saveState();
    renderAllShopping();
}

function toggleItem(id) {
    shoppingState.items = shoppingState.items.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
    );
    saveState();
    renderAllShopping();
}

function deleteItem(id) {
    shoppingState.items = shoppingState.items.filter(item => item.id !== id);
    saveState();
    renderAllShopping();
}

function editItem(id) {
    const item = shoppingState.items.find(i => i.id === id);
    if (!item) return;
    openTemplateModal({ ...item, existingId: id });
}

function renderAllShopping() {
    renderStats();
    renderItems();
    renderManualTemplates();
    renderCategoryFilters();
    renderCatalog();
    renderTopItems();
    renderCategoryStats();
}

function renderStats() {
    const total = shoppingState.items.length;
    const done = shoppingState.items.filter(i => i.done).length;
    const active = total - done;
    elements.statTotal.textContent = total;
    elements.statActive.textContent = active;
    elements.statDone.textContent = done;
}

function renderItems() {
    if (!elements.itemsList) return;
    if (shoppingState.items.length === 0) {
        elements.itemsList.innerHTML = '<p class="text-gray-400 text-center py-4">Список пуст</p>';
        return;
    }
    const items = shoppingState.items.filter(item =>
        shoppingState.categoryFilter === 'all' || item.category === shoppingState.categoryFilter
    );
    elements.itemsList.innerHTML = items.map(item => `
        <div class="flex items-center justify-between bg-white rounded-lg p-3 border shopping-item ${item.done ? 'opacity-60' : ''}">
            <div class="flex items-center gap-3">
                <button class="btn-secondary px-2 py-1" onclick="toggleItem('${item.id}')">${item.done ? '↩️' : '✔️'}</button>
                <div onclick="editItem('${item.id}')" class="cursor-pointer">
                    <div class="font-medium ${item.done ? 'line-through text-gray-500' : 'text-gray-800'}">${item.name}</div>
                    <div class="text-xs text-gray-500">${item.quantity} · ${item.category}</div>
                </div>
            </div>
            <button class="text-red-400" onclick="deleteItem('${item.id}')">✕</button>
        </div>`).join('');
}

function renderManualTemplates() {
    if (!elements.manualTemplates) return;
    if (shoppingState.manualTemplates.length === 0) {
        elements.manualTemplates.innerHTML = '';
        return;
    }
    elements.manualTemplates.innerHTML = shoppingState.manualTemplates.map(t => `
        <button class="chip bg-white border" onclick="quickAdd('${t.name}', '${t.quantity}', '${t.category}')">
            ${t.name}
            <span class="ml-2 text-red-400" onclick="event.stopPropagation(); removeManualTemplate('${t.id}')">✕</span>
        </button>`).join('');
}

function removeManualTemplate(id) {
    shoppingState.manualTemplates = shoppingState.manualTemplates.filter(t => t.id !== id);
    localStorage.setItem('shoppingManualTemplates', JSON.stringify(shoppingState.manualTemplates));
    renderManualTemplates();
}

function renderCategoryFilters() {
    const categories = Array.from(new Set(shoppingState.items.map(i => i.category)));
    const chips = ['all', ...categories];
    elements.categoryFilterChips.innerHTML = chips.map(cat => `
        <button class="chip ${shoppingState.categoryFilter === cat ? 'bg-blue-100 text-blue-600' : ''}" onclick="setCategoryFilter('${cat}')">
            ${cat === 'all' ? 'Все' : cat}
        </button>`).join('');
}

function setCategoryFilter(cat) {
    shoppingState.categoryFilter = cat;
    renderItems();
}

function renderCatalog() {
    if (!elements.catalogGrid) return;
    const search = elements.catalogSearch.value.trim().toLowerCase();
    const filtered = catalogItems.filter(item => {
        const matchesCategory = shoppingState.catalogFilter === 'all' || item.category === shoppingState.catalogFilter;
        const matchesSearch = `${item.emoji} ${item.name}`.toLowerCase().includes(search);
        return matchesCategory && matchesSearch;
    });
    renderCatalogTabs();
    elements.catalogGrid.innerHTML = filtered.map(item => `
        <div class="catalog-card">
            <div class="font-medium catalog-title">${item.emoji} ${item.name}</div>
            <div class="text-xs text-gray-500">${item.category}</div>
            <button class="btn-secondary text-xs" onclick='openTemplateModal(${JSON.stringify(item)})'>+ Добавить</button>
        </div>`).join('');
}

function renderCatalogTabs() {
    const categories = ['all', ...new Set(catalogItems.map(i => i.category))];
    elements.catalogCategoryTabs.innerHTML = categories.map(cat => `
        <button class="chip ${shoppingState.catalogFilter === cat ? 'bg-blue-100 text-blue-600' : ''}" onclick="setCatalogFilter('${cat}')">
            ${cat === 'all' ? 'Все' : cat}
        </button>`).join('');
}

function setCatalogFilter(cat) {
    shoppingState.catalogFilter = cat;
    renderCatalog();
}

function renderTopItems() {
    const map = {};
    shoppingState.items.forEach(item => {
        map[item.name] = (map[item.name] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    elements.topItemsList.innerHTML = sorted.length ? sorted.map(([name, count]) => `
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
            <div>
                <div class="font-medium text-gray-800">${name}</div>
                <div class="text-xs text-gray-500">${count} раз</div>
            </div>
            <button class="btn-secondary text-xs" onclick="quickAdd('${name}', '1 шт', 'Продукты')">+ Добавить снова</button>
        </div>`).join('') : '<p class="text-gray-400 text-sm">Нет данных</p>';
}

function renderCategoryStats() {
    if (!elements.categoriesList) return;
    const map = {};
    shoppingState.items.forEach(item => {
        map[item.category] = (map[item.category] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    elements.categoriesList.innerHTML = sorted.length ? sorted.map(([category, count]) => `
        <div class="flex justify-between bg-gray-50 px-3 py-2 rounded">
            <span>${category}</span>
            <span class="text-gray-700 font-medium">${count}</span>
        </div>`).join('') : '<p class="text-gray-400 text-sm">Нет данных</p>';
}

function openTemplateModal(data) {
    const modal = document.getElementById('shoppingModal') || createModal();
    modal.dataset.payload = JSON.stringify(data);
    modal.querySelector('#modalItemName').textContent = `${data.emoji || ''} ${data.name}`.trim();
    modal.querySelector('#modalQuantity').value = data.quantity || suggestQuantity(data.name);
    modal.querySelector('#modalCategory').value = data.category || 'Продукты';
    modal.classList.remove('hidden');
}

function createModal() {
    const div = document.createElement('div');
    div.id = 'shoppingModal';
    div.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden';
    div.innerHTML = `
        <div class="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h3 class="text-lg font-semibold text-gray-800">Настроить по��ицию</h3>
            <p id="modalItemName" class="text-gray-500"></p>
            <input id="modalQuantity" type="text" class="input-field" placeholder="Количество" />
            <input id="modalCategory" type="text" class="input-field" placeholder="Категория" />
            <div class="flex gap-2">
                <button class="btn-primary flex-1 rounded-lg" id="modalConfirm">Сохранить</button>
                <button class="btn-secondary rounded-lg" id="modalCancel">Отмена</button>
            </div>
        </div>`;
    document.body.appendChild(div);
    div.querySelector('#modalCancel').addEventListener('click', () => div.classList.add('hidden'));
    div.querySelector('#modalConfirm').addEventListener('click', confirmModal);
    return div;
}

function confirmModal() {
    const modal = document.getElementById('shoppingModal');
    const payload = JSON.parse(modal.dataset.payload || '{}');
    const quantity = modal.querySelector('#modalQuantity').value.trim();
    const category = modal.querySelector('#modalCategory').value.trim() || 'Продукты';
    if (payload.existingId) {
        shoppingState.items = shoppingState.items.map(item =>
            item.id === payload.existingId ? { ...item, quantity, category } : item
        );
    } else {
        handleAddItem({ name: payload.name, quantity, category });
    }
    modal.classList.add('hidden');
    saveState();
    renderAllShopping();
}

function suggestQuantity(name) {
    const lower = name.toLowerCase();
    if (lower.includes('молоко') || lower.includes('сок') || lower.includes('вода')) return '1 л';
    if (lower.includes('сыр') || lower.includes('колбас') || lower.includes('рыба')) return '300 г';
    if (lower.includes('яйц')) return '10 шт';
    if (lower.includes('хлеб')) return '1 шт';
    return '1 шт';
}

function saveTelegramSettings() {
    shoppingState.telegram.token = elements.settingsToken.value.trim();
    shoppingState.telegram.chatId = elements.settingsChatId.value.trim();
    localStorage.setItem('shoppingTelegram', JSON.stringify(shoppingState.telegram));
    showTelegramStatus('✅ Настройки сохранены', 'green');
}

async function testTelegramSettings() {
    try {
        await sendTelegramMessage('🛍️ Тестовое сообщение из списка покупок');
        showTelegramStatus('✅ Сообщение отправлено', 'green');
    } catch (e) {
        showTelegramStatus('❌ Ошибка отправки', 'red');
    }
}

async function sendTelegramList() {
    if (!shoppingState.items.length) return alert('Список пуст');
    const lines = shoppingState.items.map(item => `${item.done ? '✅' : '⬜️'} ${item.name} — ${item.quantity}`);
    const text = `🛍️ Список покупок\n${lines.join('\n')}`;
    try {
        await sendTelegramMessage(text);
        showTelegramStatus('✅ Список отправлен', 'green');
    } catch (e) {
        showTelegramStatus('❌ Ошибка отправки', 'red');
    }
}

async function sendTelegramMessage(text) {
    const { token, chatId } = shoppingState.telegram;
    if (!token || !chatId) throw new Error('Нет настроек');
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { chat_id: chatId, text };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Telegram error');
}

function showTelegramStatus(text, color = 'gray') {
    if (!elements.telegramStatus) return;
    const colors = { green: 'text-green-600', red: 'text-red-600', gray: 'text-gray-500' };
    elements.telegramStatus.className = `${colors[color] || colors.gray} text-sm`;
    elements.telegramStatus.textContent = text;
}

window.handleAddItem = handleAddItem;
window.quickAdd = quickAdd;
window.clearList = clearList;
window.toggleItem = toggleItem;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.setCategoryFilter = setCategoryFilter;
window.setCatalogFilter = setCatalogFilter;
window.openTemplateModal = openTemplateModal;
window.saveTelegramSettings = saveTelegramSettings;
window.testTelegramSettings = testTelegramSettings;
window.sendTelegramList = sendTelegramList;
window.removeManualTemplate = removeManualTemplate;

document.addEventListener('DOMContentLoaded', initShopping);
