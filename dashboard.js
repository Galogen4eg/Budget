
const Dashboard = {
    render() {
        const config = DB.get('dashboard');
        const widgets = config.widgets.filter(w => w.enabled);
        const participants = DB.get('participants');
        const admin = participants.find(p => p.role === 'admin') || participants[0] || { name: 'Пользователь' };
        
        const hour = new Date().getHours();
        let greeting = 'Добрый день';
        if (hour < 6) greeting = 'Доброй ночи';
        else if (hour < 12) greeting = 'Доброе утро';
        else if (hour >= 18) greeting = 'Добрый вечер';
        
        const dateStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

        return `
            <div class="space-y-6 animate-fade-in h-full flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-end flex-shrink-0">
                    <div>
                        <h1 class="text-3xl font-bold dark:text-white tracking-tight">${greeting}!</h1>
                        <p class="text-gray-500 dark:text-gray-400 capitalize mt-1">${dateStr}</p>
                    </div>
                    <button onclick="Dashboard.openSettings()" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                </div>

                <!-- Widget Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min grid-flow-dense pb-10">
                    ${widgets.map(w => this.renderWidget(w)).join('')}
                </div>
            </div>
        `;
    },

    renderWidget(widget) {
        let colSpan = 'col-span-1';
        
        if(widget.type === 'budget_overview') colSpan = 'md:col-span-2 lg:col-span-2';
        if(widget.type === 'today_schedule') colSpan = 'md:col-span-1 lg:col-span-2';
        if(widget.type === 'shopping_summary') colSpan = 'md:col-span-2 lg:col-span-2'; 
        if(widget.type === 'recent_transactions') colSpan = 'md:col-span-1 lg:col-span-2';

        const isCollapsed = widget.collapsed || false;
        const icon = this.getWidgetIcon(widget.type);
        const body = this.getWidgetBody(widget.type);
        const action = this.getWidgetAction(widget.type);

        return `
            <div class="card p-6 flex flex-col justify-between ${colSpan} hover:shadow-lg transition-shadow duration-300 border border-gray-100 dark:border-white/5 h-fit group">
                <div class="flex justify-between items-center ${isCollapsed ? '' : 'mb-4'}">
                    <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-[15px]">
                        ${icon} ${widget.name}
                    </h3>
                    <div class="flex items-center gap-2">
                        ${!isCollapsed ? action : ''}
                        <button onclick="Dashboard.toggleCollapse('${widget.id}')" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <svg class="w-5 h-5 transform transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}">
                    ${body}
                </div>
            </div>
        `;
    },

    getWidgetIcon(type) {
        // Uniform monochrome icons (Gray)
        const baseClass = "w-6 h-6 text-gray-400 dark:text-gray-500";
        const icons = {
            'budget_overview': `<svg class="${baseClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            'today_schedule': `<svg class="${baseClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
            'shopping_summary': `<svg class="${baseClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>`,
            'quick_actions': `<svg class="${baseClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
            'recent_transactions': `<svg class="${baseClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`
        };
        return icons[type] || '';
    },

    getWidgetAction(type) {
        if(type === 'budget_overview') return `<button onclick="router.navigate('budget')" class="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded text-xs font-bold">Подробнее</button>`;
        if(type === 'today_schedule') return `<button onclick="router.navigate('calendar')" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded text-xs font-bold">Календарь</button>`;
        if(type === 'shopping_summary') {
            const count = DB.get('shopping').filter(i => !i.checked).length;
            return `<span class="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">${count}</span>`;
        }
        return '';
    },

    getWidgetBody(type) {
            const contentMap = {
            'budget_overview': this.getBudgetBody(),
            'today_schedule': this.getScheduleBody(),
            'shopping_summary': this.getShoppingBody(),
            'quick_actions': this.getQuickActionsBody(),
            'recent_transactions': this.getTransactionsBody()
        };
        return contentMap[type] || '';
    },

    getBudgetBody() {
        const transactions = DB.get('transactions');
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const thisMonthTx = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const income = thisMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = thisMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const balance = income - expense;
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const limit = income > 0 ? income * 0.8 : 50000; 
        const percent = Math.min(100, (expense / limit) * 100);

        return `
            <div>
                <div class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">${formatCurrency(balance)}</div>
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl">
                        <p class="text-xs text-green-600 font-bold mb-1">Доходы (мес)</p>
                        <p class="text-lg font-bold text-gray-900 dark:text-white">+${formatCurrency(income)}</p>
                    </div>
                    <div class="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl">
                        <p class="text-xs text-red-600 font-bold mb-1">Расходы (мес)</p>
                        <p class="text-lg font-bold text-gray-900 dark:text-white">-${formatCurrency(expense)}</p>
                    </div>
                </div>
                <div>
                        <div class="flex justify-between text-xs font-medium mb-2">
                        <span class="text-gray-500">Расход бюджета</span>
                        <span class="text-gray-900 dark:text-white">${Math.round(percent)}%</span>
                    </div>
                    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-1000" style="width: ${percent}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Потрачено: ${formatCurrency(expense)}</span>
                        <span>Лимит: ~${formatCurrency(limit)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    getScheduleBody() {
        const events = DB.get('events');
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEvents = events
            .filter(e => e.date === todayStr)
            .sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
        
        const participants = DB.get('participants');

        return `
            <div class="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[250px] hide-scrollbar">
                ${todayEvents.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-6 text-center text-gray-400">
                        <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <p class="text-sm">На сегодня планов нет</p>
                        <button onclick="Calendar.openAddModal('${todayStr}')" class="mt-4 text-xs bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg font-bold text-gray-600 dark:text-white hover:bg-gray-200 transition-colors">Добавить</button>
                    </div>
                ` : todayEvents.map(e => {
                    const p = participants.find(x => x.id == e.participantId) || { color: '#ccc' };
                    return `
                        <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onclick="Calendar.openEditModal('${e.id}')">
                            <div class="w-1.5 h-10 rounded-full mt-1 flex-shrink-0" style="background-color: ${p.color}"></div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between">
                                    <h4 class="font-bold text-gray-900 dark:text-white truncate text-sm">${e.title}</h4>
                                    <span class="text-xs font-medium text-gray-400 flex-shrink-0 ml-2">${e.time || 'Весь день'}</span>
                                </div>
                                <p class="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                    <span class="w-2 h-2 rounded-full inline-block" style="background-color: ${p.color}"></span> ${p.name}
                                    ${e.location ? `• 📍 ${e.location}` : ''}
                                </p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            ${todayEvents.length > 0 ? `
                <button onclick="Calendar.openAddModal('${todayStr}')" class="w-full mt-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors dashed-border">
                    + Добавить событие
                </button>
            ` : ''}
        `;
    },

    getShoppingBody() {
        const items = DB.get('shopping');
        const active = items.filter(i => !i.checked);
        const count = active.length;
        const total = active.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (parseFloat(i.qty) || 1)), 0);

        const shops = DB.get('shops');
        const byShop = {};
        active.forEach(i => {
            const sName = shops.find(s => s.id == i.shopId)?.name || 'Разное';
            byShop[sName] = (byShop[sName] || 0) + 1;
        });
        const topShops = Object.entries(byShop).sort((a,b) => b[1] - a[1]).slice(0, 3);

        return `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="flex-1">
                    <div class="flex items-end gap-4 mb-2">
                        <span class="text-4xl font-extrabold text-gray-900 dark:text-white">${count}</span>
                        <span class="text-sm text-gray-400 mb-1.5">товаров</span>
                    </div>
                    <p class="text-lg font-bold text-gray-900 dark:text-white mb-4">~${formatCurrency(total)}</p>
                    
                        <button onclick="router.navigate('shopping')" class="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors">
                        Открыть список
                    </button>
                </div>

                <div class="flex-1 space-y-2 border-l border-gray-100 dark:border-white/5 pl-0 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0">
                        ${topShops.length === 0 ? '<p class="text-sm text-gray-400">Список пуст</p>' : 
                        topShops.map(([name, c]) => `
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400 font-medium truncate pr-2">${name}</span>
                            <span class="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-bold dark:text-white">${c}</span>
                        </div>
                        `).join('')}
                </div>
            </div>
        `;
    },

    getQuickActionsBody() {
        return `
            <div class="grid grid-cols-2 gap-3">
                <button onclick="Budget.openModal()" class="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors group">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Расход</span>
                </button>
                <button onclick="Calendar.openAddModal()" class="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors group">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Событие</span>
                </button>
                <button onclick="Shopping.openAddModal()" class="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors group">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Товар</span>
                </button>
                <button onclick="Shopping.openScanner()" class="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors group">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Скан</span>
                </button>
            </div>
        `;
    },

    getTransactionsBody() {
        const transactions = DB.get('transactions')
            .sort((a,b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4);

        return `
            <div class="space-y-3">
                ${transactions.length === 0 ? '<p class="text-xs text-gray-400">История пуста</p>' : 
                transactions.map(t => `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                ${t.type === 'income' ? '↓' : '↑'}
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[100px]">${t.description}</p>
                                <p class="text-[10px] text-gray-500">${formatDate(t.date)}</p>
                            </div>
                        </div>
                        <span class="text-sm font-bold ${t.type === 'income' ? 'text-green-500' : 'text-gray-900 dark:text-white'}">
                            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    toggleCollapse(id) {
        const config = DB.get('dashboard');
        const w = config.widgets.find(x => x.id === id);
        if(w) {
            w.collapsed = !w.collapsed;
            DB.save('dashboard', config);
            router.refresh();
        }
    },

    openSettings() {
        const config = DB.get('dashboard');
        
        const renderList = () => {
            return config.widgets.map((w, index) => `
                <div class="widget-item flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 group transition-all cursor-move" 
                        draggable="true" 
                        data-index="${index}"
                        ondragstart="Dashboard.dragStart(event)" 
                        ondragover="Dashboard.dragOver(event)" 
                        ondrop="Dashboard.drop(event)"
                        ondragenter="this.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20')"
                        ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20')"
                >
                    <div class="flex items-center gap-3 pointer-events-none">
                        <div class="p-2 text-gray-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                        </div>
                        <span class="font-bold text-gray-900 dark:text-white select-none">${w.name}</span>
                    </div>
                    <label class="relative cursor-pointer pointer-events-auto">
                        <input type="checkbox" class="sr-only peer" ${w.enabled ? 'checked' : ''} onchange="Dashboard.toggleWidget('${w.id}')">
                        <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>
            `).join('');
        };

        const modalHtml = `
            <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold dark:text-white">Настройка Обзора</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <p class="text-sm text-gray-500 mb-4">Перетаскивайте элементы для изменения порядка.</p>
                
                <div id="widget-settings-list" class="space-y-2 max-h-[400px] overflow-y-auto" ondragover="event.preventDefault()">
                    ${renderList()}
                </div>

                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal()" class="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 transition-colors">Готово</button>
                </div>
            </div>
        `;
        openModal(modalHtml);
    },

    toggleWidget(id) {
        const config = DB.get('dashboard');
        const w = config.widgets.find(x => x.id === id);
        if(w) {
            w.enabled = !w.enabled;
            DB.save('dashboard', config);
            router.refresh(); 
        }
    },

    dragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-index'));
        e.target.style.opacity = '0.5';
    },

    dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    },

    drop(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        let target = e.target;
        while (target && !target.hasAttribute('data-index')) {
            target = target.parentElement;
        }
        
        document.querySelectorAll('.widget-item').forEach(el => {
            el.style.opacity = '1';
            el.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        if (target) {
            const toIndex = parseInt(target.getAttribute('data-index'));
            if (fromIndex !== toIndex && !isNaN(fromIndex) && !isNaN(toIndex)) {
                const config = DB.get('dashboard');
                const item = config.widgets.splice(fromIndex, 1)[0];
                config.widgets.splice(toIndex, 0, item);
                DB.save('dashboard', config);
                this.openSettings(); 
                router.refresh();
            }
        }
        return false;
    }
};
