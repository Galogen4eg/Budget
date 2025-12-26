
const Settings = {
    currentSection: 'members',
    render() {
        const sections = [ 
            { id: 'members', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>', label: 'Участники' }, 
            { id: 'sections', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>', label: 'Разделы' }, 
            { id: 'appearance', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>', label: 'Внешний вид' }, 
            { id: 'notifications', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>', label: 'Уведомления' }, 
            { id: 'widgets', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>', label: 'Виджеты' }, 
            { id: 'integrations', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>', label: 'Интеграции' },
            { id: 'privacy', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>', label: 'Приватность' },
            { id: 'data', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>', label: 'Данные' } 
        ];
        
        return `
            <div class="flex flex-col md:flex-row h-full md:h-[calc(100vh-100px)] gap-6">
                <div class="w-full md:w-64 flex-shrink-0 space-y-1 overflow-x-auto md:overflow-visible flex md:block gap-2 md:gap-0 pb-2 md:pb-0 scrollbar-hide">
                    ${sections.map(s => `
                        <button onclick="Settings.navigate('${s.id}')" class="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-colors whitespace-nowrap ${this.currentSection === s.id ? 'bg-white dark:bg-white/10 shadow-sm font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}">
                            <span class="text-gray-500 dark:text-gray-400">${s.icon}</span><span>${s.label}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="flex-1 bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm overflow-y-auto border border-gray-100 dark:border-white/5">
                    ${this.renderSection(this.currentSection)}
                </div>
            </div>
        `;
    },
    navigate(section) { this.currentSection = section; router.refresh(); },
    renderSection(section) {
        if(section === 'members') return this.renderMembers();
        if(section === 'sections') return this.renderSections();
        if(section === 'appearance') return this.renderAppearance();
        if(section === 'notifications') return this.renderNotifications();
        if(section === 'widgets') return this.renderWidgets();
        if(section === 'integrations') return this.renderIntegrations();
        if(section === 'privacy') return this.renderPrivacy();
        if(section === 'data') return this.renderData();
        return '';
    },
    renderSections() {
        const s = DB.get('settings');
        const sections = s.sections || { dashboard: true, budget: true, calendar: true, shopping: true };
        
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Видимость разделов</h3>
                <p class="text-sm text-gray-500 mb-6">Выберите разделы, которые будут отображаться в меню.</p>
                <div class="space-y-4">
                    ${Object.entries({
                        dashboard: 'Обзор',
                        budget: 'Бюджет',
                        calendar: 'Календарь',
                        shopping: 'Покупки'
                    }).map(([key, label]) => `
                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <span class="font-medium dark:text-white">${label}</span>
                            <label class="relative cursor-pointer">
                                <input type="checkbox" class="sr-only peer" ${sections[key] !== false ? 'checked' : ''} onchange="Settings.toggleSection('${key}')">
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    toggleSection(key) {
        const s = DB.get('settings');
        if (!s.sections) s.sections = { dashboard: true, budget: true, calendar: true, shopping: true };
        s.sections[key] = !s.sections[key];
        DB.save('settings', s);
        updateNavigationVisibility();
    },
    renderMembers() {
        const parts = DB.get('participants');
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Участники семьи</h3>
                <p class="text-sm text-gray-500 mb-6">Управляйте профилями членов семьи и их цветами.</p>
                <div class="space-y-3 mb-6">
                    ${parts.map(p => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${p.color}">${p.name[0]}</div>
                                <div>
                                    <p class="font-bold dark:text-white">${p.name}</p>
                                    <p class="text-xs text-gray-500">${p.role === 'admin' ? 'Администратор' : 'Участник'}</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="Settings.editPart(${p.id})" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">✏️</button>
                                <button onclick="Settings.deletePart(${p.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="Settings.addPart()" class="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 transition-colors">Добавить участника</button>
            </div>
        `;
    },
    renderAppearance() {
        const s = DB.get('settings');
        const startHour = s.calendar?.startHour ?? 6;
        const endHour = s.calendar?.endHour ?? 23;
        
        const hours = Array.from({length: 25}, (_, i) => i);

        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Внешний вид</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div>
                            <p class="font-medium dark:text-white">Тёмная тема</p>
                            <p class="text-xs text-gray-500">Использовать темное оформление интерфейса</p>
                        </div>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${s.darkMode ? 'checked' : ''} onchange="Settings.toggleTheme()">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                        </label>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div>
                            <p class="font-medium dark:text-white">Валюта</p>
                            <p class="text-xs text-gray-500">Основная валюта приложения</p>
                        </div>
                        <select class="bg-transparent font-bold text-blue-600 outline-none" onchange="Settings.update('currency', this.value)">
                            <option value="₽" ${s.currency === '₽' ? 'selected' : ''}>RUB (₽)</option>
                            <option value="$" ${s.currency === '$' ? 'selected' : ''}>USD ($)</option>
                            <option value="€" ${s.currency === '€' ? 'selected' : ''}>EUR (€)</option>
                        </select>
                    </div>
                    
                    <div class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p class="font-medium dark:text-white mb-3">Настройки календаря</p>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs text-gray-500 block mb-1">Начало дня</label>
                                <select class="ios-input" onchange="Settings.updateNested('calendar', 'startHour', parseInt(this.value))">
                                    ${hours.map(h => `<option value="${h}" ${h === startHour ? 'selected' : ''}>${h}:00</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="text-xs text-gray-500 block mb-1">Конец дня</label>
                                <select class="ios-input" onchange="Settings.updateNested('calendar', 'endHour', parseInt(this.value))">
                                    ${hours.map(h => `<option value="${h}" ${h === endHour ? 'selected' : ''}>${h}:00</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    renderNotifications() {
        const s = DB.get('settings');
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Уведомления</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div>
                            <p class="font-medium dark:text-white">Разрешить уведомления</p>
                            <p class="text-xs text-gray-500">Push-уведомления о событиях</p>
                        </div>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${s.notifications.enabled ? 'checked' : ''} onchange="Settings.updateNested('notifications', 'enabled', this.checked)">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                        </label>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div>
                            <p class="font-medium dark:text-white">Звук</p>
                            <p class="text-xs text-gray-500">Звуковой сигнал при уведомлении</p>
                        </div>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${s.notifications.sound ? 'checked' : ''} onchange="Settings.updateNested('notifications', 'sound', this.checked)">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                        </label>
                    </div>
                </div>
            </div>
        `;
    },
    renderWidgets() {
        const config = DB.get('dashboard');
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Виджеты на главном</h3>
                <p class="text-sm text-gray-500 mb-6">Выберите, какие блоки отображать на экране "Обзор".</p>
                <div class="space-y-3">
                    ${config.widgets.map(w => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <span class="font-medium dark:text-white">${w.name}</span>
                            <label class="relative cursor-pointer">
                                <input type="checkbox" class="sr-only peer" ${w.enabled ? 'checked' : ''} onchange="Dashboard.toggleWidget('${w.id}')">
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    renderIntegrations() {
        const s = DB.get('settings');
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Интеграции</h3>
                <div class="space-y-4">
                    <div class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div class="flex justify-between items-center mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </div>
                                <div>
                                    <p class="font-bold dark:text-white">Telegram Bot</p>
                                    <p class="text-xs text-gray-500">${s.telegram.chat_id ? 'Подключено' : 'Не подключено'}</p>
                                </div>
                            </div>
                            <button onclick="Settings.connectTelegram()" class="px-4 py-2 ${s.telegram.chat_id ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} rounded-lg text-sm font-bold">
                                ${s.telegram.chat_id ? 'Отключить' : 'Подключить'}
                            </button>
                        </div>
                        ${!s.telegram.chat_id ? `
                            <div class="space-y-4 mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">1. Bot Token</label>
                                    <input type="text" placeholder="Токен от @BotFather" class="ios-input text-sm" id="tg-token">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">2. Chat ID</label>
                                    <input type="text" placeholder="Ваш ID (число)" class="ios-input text-sm" id="tg-chat-id">
                                    <p class="text-[10px] text-gray-400 mt-1">
                                        Напишите <span class="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">/start</span> боту 
                                        <a href="https://t.me/userinfobot" target="_blank" class="text-blue-500 hover:underline">@userinfobot</a>, 
                                        чтобы узнать свой ID.
                                    </p>
                                </div>
                            </div>
                        ` : `
                            <div class="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                                <p class="text-green-700 dark:text-green-400 font-bold flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                    Бот успешно подключен
                                </p>
                                <p class="text-xs text-gray-500 mt-1 pl-6">Chat ID: <span class="font-mono">${s.telegram.chat_id}</span></p>
                            </div>
                        `}
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                                <p class="font-bold dark:text-white">Google Calendar</p>
                                <p class="text-xs text-gray-500">Синхронизация событий</p>
                            </div>
                        </div>
                        <button onclick="alert('Функция в разработке (API Required)')" class="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold">Скоро</button>
                    </div>
                </div>
            </div>
        `;
    },
    renderPrivacy() {
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Приватность</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div>
                            <p class="font-medium dark:text-white">Публичный доступ</p>
                            <p class="text-xs text-gray-500">Разрешить доступ по ссылке</p>
                        </div>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-500 transition-all"></div>
                        </label>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p class="font-medium dark:text-white mb-2">Хранение данных</p>
                        <p class="text-sm text-gray-500">Все данные хранятся локально в вашем браузере (LocalStorage). Мы не передаем информацию на сторонние серверы.</p>
                    </div>
                </div>
            </div>
        `;
    },
    renderData() {
        return `
            <div>
                <h3 class="text-xl font-bold mb-4 dark:text-white">Управление данными</h3>
                <div class="space-y-3">
                    <button onclick="Settings.exportData()" class="w-full py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Экспорт данных (JSON)
                    </button>
                    <label class="w-full py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12"></path></svg> Импорт данных
                        <input type="file" class="hidden" onchange="Settings.importData(this)">
                    </label>
                    <button onclick="localStorage.clear(); location.reload()" class="w-full py-3 text-red-500 font-bold bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-colors mt-6">
                        Сбросить все данные
                    </button>
                </div>
            </div>
        `;
    },
    addPart() {
        this.openMemberModal();
    },
    editPart(id) {
        const part = DB.get('participants').find(p => p.id === id);
        this.openMemberModal(part);
    },
    openMemberModal(part = null) {
        const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FF2D55'];
        
        openModal(`
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold dark:text-white">${part ? 'Редактировать' : 'Новый участник'}</h3>
                    <button onclick="closeModal()">✕</button>
                </div>
                <form onsubmit="Settings.savePart(event, ${part ? part.id : 'null'})">
                    <div class="space-y-4">
                        <input type="text" name="name" value="${part ? part.name : ''}" required class="ios-input font-bold" placeholder="Имя">
                        
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Роль</label>
                            <select name="role" class="ios-input">
                                <option value="member" ${part && part.role === 'member' ? 'selected' : ''}>Участник</option>
                                <option value="admin" ${part && part.role === 'admin' ? 'selected' : ''}>Администратор</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Цвет</label>
                            <div class="flex flex-wrap gap-3">
                                ${colors.map(c => `
                                    <label class="cursor-pointer">
                                        <input type="radio" name="color" value="${c}" ${part && part.color === c ? 'checked' : (!part && c === colors[0] ? 'checked' : '')} class="peer sr-only">
                                        <div class="w-8 h-8 rounded-full border-2 border-transparent peer-checked:scale-110 peer-checked:shadow-lg peer-checked:border-gray-400" style="background-color: ${c}"></div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="mt-6">
                        <button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">Сохранить</button>
                    </div>
                </form>
            </div>
        `);
    },
    savePart(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            role: formData.get('role'),
            color: formData.get('color')
        };
        
        if (id) {
            DB.update('participants', id, data);
        } else {
            DB.add('participants', data);
        }
        closeModal();
        router.refresh();
    },
    deletePart(id) { if(confirm('Удалить участника?')) { DB.delete('participants', id); router.refresh(); } },
    toggleTheme() {
        const s = DB.get('settings'); s.darkMode = !s.darkMode; DB.save('settings', s);
        if(s.darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
        router.refresh();
    },
    update(key, value) {
        const s = DB.get('settings'); s[key] = value; DB.save('settings', s); router.refresh();
    },
    updateNested(parent, key, value) {
        const s = DB.get('settings'); s[parent][key] = value; DB.save('settings', s); router.refresh();
    },
    connectTelegram() {
        const s = DB.get('settings');
        if(s.telegram.chat_id) {
            if(confirm('Отключить интеграцию с Telegram?')) {
                s.telegram.chat_id = '';
                s.telegram.token = '';
                DB.save('settings', s);
                router.refresh();
                showToast('Telegram отключен');
            }
        } else {
            const token = document.getElementById('tg-token').value;
            const chatId = document.getElementById('tg-chat-id').value;
            
            if(token && chatId) {
                s.telegram.token = token;
                s.telegram.chat_id = chatId;
                DB.save('settings', s);
                router.refresh();
                showToast('Telegram успешно подключен');
            } else {
                alert('Пожалуйста, заполните оба поля: Bot Token и Chat ID');
            }
        }
    },
    exportData() {
        const data = {
            transactions: DB.get('transactions'),
            events: DB.get('events'),
            shopping: DB.get('shopping'),
            participants: DB.get('participants'),
            settings: DB.get('settings')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'familyhub_backup.json';
        a.click();
    },
    importData(input) {
        const file = input.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if(data.transactions) DB.save('transactions', data.transactions);
                    if(data.events) DB.save('events', data.events);
                    if(data.shopping) DB.save('shopping', data.shopping);
                    if(data.participants) DB.save('participants', data.participants);
                    if(data.settings) DB.save('settings', data.settings);
                    alert('Данные восстановлены');
                    location.reload();
                } catch(err) {
                    alert('Ошибка файла');
                }
            };
            reader.readAsText(file);
        }
    }
};
