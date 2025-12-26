
const DB = {
    init() {
        if(!localStorage.getItem('familyHub_transactions')) localStorage.setItem('familyHub_transactions', JSON.stringify([]));
        if(!localStorage.getItem('familyHub_events')) localStorage.setItem('familyHub_events', JSON.stringify([]));
        if(!localStorage.getItem('familyHub_templates')) localStorage.setItem('familyHub_templates', JSON.stringify([]));
        if(!localStorage.getItem('familyHub_shopping')) localStorage.setItem('familyHub_shopping', JSON.stringify([
            { id: 1, name: 'Молоко', qty: 2, unit: 'л', category: 'cat_1', shopId: 1, checked: false, priority: 'normal', price: 80 },
            { id: 2, name: 'Хлеб', qty: 1, unit: 'шт', category: 'cat_1', shopId: 1, checked: true, priority: 'normal', price: 40 }
        ]));
        if(!localStorage.getItem('familyHub_shops')) localStorage.setItem('familyHub_shops', JSON.stringify([
            { id: 1, name: 'Пятёрочка' }, { id: 2, name: 'Магнит' }, { id: 3, name: 'Ашан' }, { id: 4, name: 'ВкусВилл' }
        ]));
        if(!localStorage.getItem('familyHub_categories')) localStorage.setItem('familyHub_categories', JSON.stringify([
            {id: 'cat_1', name: 'Продукты'}, {id: 'cat_2', name: 'Дом'}, {id: 'cat_3', name: 'Транспорт'},
            {id: 'cat_4', name: 'Развлечения'}, {id: 'cat_5', name: 'Зарплата'}, {id: 'cat_6', name: 'Здоровье'},
            {id: 'cat_7', name: 'Кафе'}, {id: 'cat_8', name: 'Разное'}
        ]));
        if(!localStorage.getItem('familyHub_participants')) localStorage.setItem('familyHub_participants', JSON.stringify([
            {id: 1, name: 'Мама', role: 'admin', color: '#FF3B30'}, {id: 2, name: 'Папа', role: 'admin', color: '#007AFF'}, 
            {id: 3, name: 'Сын', role: 'member', color: '#34C759'}, {id: 4, name: 'Дочь', role: 'member', color: '#FF9500'}
        ]));
        
        let settings = JSON.parse(localStorage.getItem('familyHub_settings'));
        if(!settings) {
            settings = {
                darkMode: false, currency: '₽', notifications: { enabled: true, sound: true, telegram: false }, telegram: { token: '', chat_id: '' },
                widgets: [ { id: 'calendar', name: 'Календарь', enabled: true }, { id: 'budget', name: 'Баланс', enabled: true }, { id: 'chart', name: 'График расходов', enabled: true }, { id: 'shopping', name: 'Покупки', enabled: false } ],
                sections: { dashboard: true, budget: true, calendar: true, shopping: true }
            };
            localStorage.setItem('familyHub_settings', JSON.stringify(settings));
        } else if(!settings.sections) {
            settings.sections = { dashboard: true, budget: true, calendar: true, shopping: true };
            localStorage.setItem('familyHub_settings', JSON.stringify(settings));
        }
        
        if(!settings.calendar) {
            settings.calendar = { startHour: 6, endHour: 23 };
            localStorage.setItem('familyHub_settings', JSON.stringify(settings));
        }

        if(!localStorage.getItem('familyHub_dashboard')) localStorage.setItem('familyHub_dashboard', JSON.stringify({
            widgets: [
                { id: 'budget_overview', type: 'budget_overview', name: 'Финансы', enabled: true, collapsed: false },
                { id: 'today_schedule', type: 'today_schedule', name: 'Расписание', enabled: true, collapsed: false },
                { id: 'shopping_summary', type: 'shopping_summary', name: 'Покупки', enabled: true, collapsed: false },
                { id: 'quick_actions', type: 'quick_actions', name: 'Действия', enabled: true, collapsed: false },
                { id: 'recent_transactions', type: 'recent_transactions', name: 'Операции', enabled: true, collapsed: false }
            ]
        }));
        
        if(settings.darkMode) document.documentElement.classList.add('dark');
    },
    get(collection) { return JSON.parse(localStorage.getItem(`familyHub_${collection}`)) || []; },
    save(collection, data) { localStorage.setItem(`familyHub_${collection}`, JSON.stringify(data)); },
    add(collection, item) { const data = this.get(collection); item.id = Date.now(); data.push(item); this.save(collection, data); return item; },
    update(collection, id, updates) { const data = this.get(collection); const index = data.findIndex(i => i.id === Number(id)); if (index !== -1) { data[index] = { ...data[index], ...updates }; this.save(collection, data); } },
    delete(collection, id) { let data = this.get(collection); data = data.filter(i => i.id !== Number(id)); this.save(collection, data); }
};

const formatCurrency = (amount) => { const currency = DB.get('settings').currency || '₽'; return `${parseFloat(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`; };
const formatDate = (dateStr) => { 
    if(!dateStr) return ''; 
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); 
};
const showToast = (msg, isSuccess=true) => {
    const toast = document.getElementById('toast'); document.getElementById('toast-message').innerText = msg;
    if(window.innerWidth >= 768) { toast.classList.remove('translate-y-32'); setTimeout(() => toast.classList.add('translate-y-32'), 3000); } 
    else { toast.classList.remove('translate-x-full'); setTimeout(() => toast.classList.add('translate-x-full'), 3000); }
};
const toggleMobileMenu = () => { document.getElementById('mobile-menu').classList.toggle('hidden'); };

function updateNavigationVisibility() {
    const s = DB.get('settings').sections || { dashboard: true, budget: true, calendar: true, shopping: true };
    const set = (id, visible) => {
        const el = document.getElementById(id);
        const mobileEl = document.getElementById('mobile-' + id);
        if (el) el.classList.toggle('hidden', !visible);
        if (mobileEl) mobileEl.classList.toggle('hidden', !visible);
    };
    set('nav-dashboard', s.dashboard);
    set('nav-budget', s.budget);
    set('nav-calendar', s.calendar);
    set('nav-shopping', s.shopping);
}

const SmartCategorizer = {
    rules: [
        { pattern: /пятерочка|магнит|дикси|вкусвилл|ашан|лента|перекресток|метро|окей|spar|eurospar|азбука вкуса|продукты/i, categoryId: 'cat_1' },
        { pattern: /яндекс.*такси|uber|gett|ситимобил|maxim|метро|транспорт|автобус|троллейбус|трамвай|парковка|заправка|азс|лукойл|газпром/i, categoryId: 'cat_3' },
        { pattern: /макдональдс|вкусно и точка|бургер кинг|kfc|ростикс|теремок|додо|ресторан|кафе|кофейня|бар|паб|доставка еды|delivery|яндекс.еда/i, categoryId: 'cat_7' },
        { pattern: /аптека|здоровье|доктор|клиника|медицин|стоматолог|инвитро/i, categoryId: 'cat_6' },
        { pattern: /жкх|квартплата|электроэнерг|мосэнерго|газ|вода|интернет|провайдер|ростелеком|мгтс|дом.ру|леруа|икеа|хофф|obi|строитель|ремонт/i, categoryId: 'cat_2' },
        { pattern: /зарплата|аванс|премия/i, categoryId: 'cat_5' },
        { pattern: /кино|театр|концерт|билет|ivi|netflix|kinopoisk|яндекс.плюс/i, categoryId: 'cat_4' }
    ],
    mccMap: { '5411': 'cat_1', '5812': 'cat_7', '4111': 'cat_3', '5912': 'cat_6', '5541': 'cat_3' },
    categorize(desc, mcc) {
        const lowerDesc = (desc || '').toLowerCase();
        if (mcc && this.mccMap[mcc]) return { categoryId: this.mccMap[mcc] };
        for (const rule of this.rules) {
            if (rule.pattern.test(lowerDesc)) return { categoryId: rule.categoryId };
        }
        return { categoryId: 'cat_8' };
    }
};

const Scanner = {
    reader: null,
    init() { if(!this.reader && window.ZXing) this.reader = new ZXing.BrowserMultiFormatReader(); },
    start(cb) {
        this.init();
        const el = document.createElement('div'); el.id = 'scanner-overlay';
        el.innerHTML = `<div class="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center"><video id="video" class="w-full h-full object-cover opacity-50"></video><div class="absolute w-64 h-48 border-2 border-white/50 rounded-2xl z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div><button onclick="Scanner.stop()" class="absolute bottom-10 bg-white text-black px-6 py-2 rounded-full font-bold z-30">Закрыть</button></div>`;
        document.body.appendChild(el);
        if(this.reader) this.reader.decodeFromVideoDevice(null, 'video', (res) => { if(res) cb(res.getText()); });
    },
    stop() { if(this.reader) this.reader.reset(); document.getElementById('scanner-overlay')?.remove(); }
};

const router = {
    current: 'dashboard',
    navigate(r) { this.current = r; this.render(); },
    render() {
        const c = document.getElementById('app-content');
        if(this.current === 'dashboard') c.innerHTML = Dashboard.render();
        if(this.current === 'budget') c.innerHTML = Budget.render();
        if(this.current === 'calendar') c.innerHTML = Calendar.render();
        if(this.current === 'shopping') c.innerHTML = Shopping.render();
        if(this.current === 'settings') c.innerHTML = Settings.render();
        
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        document.getElementById(`nav-${this.current}`)?.classList.add('active');
        updateNavigationVisibility();
    },
    refresh() { this.render(); }
};
