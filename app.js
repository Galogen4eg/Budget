
        const DB = {
            init() {
                if(!localStorage.getItem('familyHub_transactions')) localStorage.setItem('familyHub_transactions', JSON.stringify([]));
                if(!localStorage.getItem('familyHub_events')) localStorage.setItem('familyHub_events', JSON.stringify([]));
                if(!localStorage.getItem('familyHub_templates')) localStorage.setItem('familyHub_templates', JSON.stringify([]));
                if(!localStorage.getItem('familyHub_shopping')) localStorage.setItem('familyHub_shopping', JSON.stringify([
                    { id: 1, name: 'Молоко', qty: 2, unit: 'л', category: 'dairy', shopId: 1, checked: false, priority: 'normal', price: 80 },
                    { id: 2, name: 'Хлеб', qty: 1, unit: 'шт', category: 'bakery', shopId: 1, checked: true, priority: 'normal', price: 40 }
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
        DB.init();

        const formatCurrency = (amount) => { const currency = DB.get('settings').currency || '₽'; return `${parseFloat(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`; };
        const formatDate = (dateStr) => { 
    if(!dateStr) return ''; 
    const d = new Date(dateStr);
    // Show time if available (simple heuristic: if input string implies time)
    // But since we want to support showing time for manual entries which we will add later, let's just default to date.
    // However, the prompt asks to SHOW time.
    // Let's format it as "15 дек, 14:30"
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

        // 0. Import Module
        const Import = {
            data: [],
            step: 1,
            isLoading: false,
            
            openModal() {
                this.step = 1;
                this.data = [];
                this.isLoading = false;
                this.render();
            },

            render() {
                let content = '';
                if (this.isLoading) {
                    content = `
                        <div class="p-12 text-center">
                            <div class="animate-spin text-4xl mb-4">⏳</div>
                            <p class="text-gray-500">Обработка файла...</p>
                        </div>
                    `;
                } else if(this.step === 1) {
                    content = `
                        <div class="p-6 text-center">
                            <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </div>
                            <h3 class="text-xl font-bold mb-2 dark:text-white">Импорт выписки</h3>
                            <p class="text-sm text-gray-500 mb-6">Загрузите файл из Альфа-Банка (CSV, Excel).</p>
                            
                            <label class="block w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                <input type="file" accept=".csv, .xls, .xlsx" onchange="Import.handleFile(this)" class="hidden">
                                <div class="text-gray-400 group-hover:text-blue-500 transition-colors flex flex-col items-center">
                                    <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    <span class="text-sm font-bold">Выберите файл</span>
                                </div>
                                <p class="text-xs text-gray-400 mt-2">CSV, XLS, XLSX</p>
                            </label>
                            
                            <button onclick="closeModal()" class="mt-6 text-gray-400 hover:text-gray-600 text-sm font-medium">Отмена</button>
                        </div>
                    `;
                } else {
                    const total = this.data.filter(t => t.importChecked).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
                    const cats = DB.get('categories');

                    // MODIFIED: Wide layout, Full descriptions, Duplicate indicators
                    content = `
                        <div class="p-6 h-[80vh] flex flex-col">
                            <div class="flex justify-between items-center mb-6">
                                <div>
                                    <h3 class="text-xl font-bold dark:text-white">Предпросмотр</h3>
                                    <p class="text-xs text-gray-500">${this.data.length} операций</p>
                                </div>
                                <button onclick="closeModal()" class="p-2 bg-gray-100 dark:bg-white/10 rounded-full">✕</button>
                            </div>
                            
                            <div class="flex-1 overflow-y-auto mb-6 border border-gray-100 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                                <table class="w-full text-sm">
                                    <thead class="bg-gray-100 dark:bg-white/10 sticky top-0 text-left text-xs uppercase text-gray-500 z-10">
                                        <tr>
                                            <th class="p-3 w-8"><input type="checkbox" checked onchange="Import.toggleAll(this)"></th>
                                            <th class="p-3 w-32">Дата</th>
                                            <th class="p-3 min-w-[300px]">Описание</th>
                                            <th class="p-3 w-40">Категория</th>
                                            <th class="p-3 text-right w-32">Сумма</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-200 dark:divide-white/10">
                                        ${this.data.map((t, index) => `
                                            <tr class="${t.isDuplicate ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}">
                                                <td class="p-3 align-top"><input type="checkbox" ${t.importChecked ? 'checked' : ''} onchange="Import.toggleItem(${index})"></td>
                                                <td class="p-3 text-gray-500 whitespace-nowrap align-top">${formatDate(t.date)}</td>
                                                <td class="p-3 align-top">
                                                    <div class="font-medium dark:text-white whitespace-normal break-words ${t.isDuplicate ? 'text-gray-400' : ''}">${t.description}</div>
                                                    ${t.isDuplicate ? '<span class="text-[10px] text-orange-500 font-bold uppercase tracking-wider">⚠️ Возможный дубликат</span>' : ''}
                                                </td>
                                                <td class="p-3 align-top">
                                                    <select onchange="Import.updateCategory(${index}, this.value)" class="text-xs bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 w-full">
                                                        ${cats.map(c => `<option value="${c.name}" ${t.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                                                        <option value="Разное" ${t.category === 'Разное' ? 'selected' : ''}>Разное</option>
                                                    </select>
                                                </td>
                                                <td class="p-3 text-right font-bold whitespace-nowrap align-top ${t.type === 'income' ? 'text-green-500' : 'text-gray-900 dark:text-white'}">
                                                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount).replace('₽','')}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="flex justify-between items-center border-t border-gray-100 dark:border-white/10 pt-4">
                                <div>
                                    <p class="text-xs text-gray-500">Итого к импорту</p>
                                    <p class="text-lg font-bold ${total >= 0 ? 'text-green-500' : 'text-red-500'}">${total > 0 ? '+' : ''}${formatCurrency(total)}</p>
                                </div>
                                <button onclick="Import.save()" class="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">
                                    Импортировать (${this.data.filter(t => t.importChecked).length})
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                // MODIFIED: Request a wide modal (90% width)
                openModal(content, 'max-w-[90vw]');
            },
            
            toggleAll(checkbox) {
                this.data.forEach(t => t.importChecked = checkbox.checked);
                this.render();
            },

            toggleItem(index) {
                this.data[index].importChecked = !this.data[index].importChecked;
                this.render();
            },

            updateCategory(index, val) {
                this.data[index].category = val;
            },

            handleFile(input) {
                const file = input.files[0];
                if(!file) return;
                
                this.isLoading = true;
                this.render();

                setTimeout(() => { // Allow UI to update
                    const name = file.name.toLowerCase();
                    
                    if (name.endsWith('.csv')) {
                        if (typeof Papa === 'undefined') {
                            this.isLoading = false; this.render();
                            return alert('Ошибка: Библиотека CSV не загружена');
                        }
                        Papa.parse(file, {
                            encoding: "Windows-1251",
                            skipEmptyLines: true,
                            complete: (res) => this.process(res.data),
                            error: (err) => {
                                this.isLoading = false; this.render();
                                alert('Ошибка: ' + err.message);
                            }
                        });
                    } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
                        if (typeof XLSX === 'undefined') {
                            this.isLoading = false; this.render();
                            return alert('Ошибка: Библиотека Excel не загружена');
                        }
                        this.readExcel(file);
                    } else {
                        this.isLoading = false; this.render();
                        alert('Формат не поддерживается. Используйте CSV или Excel.');
                    }
                }, 100);
            },

            readExcel(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, {type: 'array'});
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: '', raw: false});
                        this.process(rows);
                    } catch (err) {
                        this.isLoading = false; this.render();
                        alert('Ошибка чтения Excel: ' + err.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            },
            
            process(rows) {
                this.isLoading = false;
                
                // Get existing transactions for duplicate checking
                const existingTxs = DB.get('transactions');
                // Create a quick lookup map (date + amount + description) for speed
                const existingMap = new Set(existingTxs.map(t => `${t.date}|${t.amount}|${t.description}`));

                // Smart header detection
                let headerRowIdx = -1;
                const keywords = ['дата', 'date', 'сумма', 'amount', 'описание', 'description'];
                
                for(let i=0; i < Math.min(rows.length, 30); i++) {
                    const rowStr = rows[i].join(' ').toLowerCase();
                    let matches = 0;
                    keywords.forEach(k => { if(rowStr.includes(k)) matches++; });
                    if(matches >= 2) {
                        headerRowIdx = i;
                        break;
                    }
                }
                
                if(headerRowIdx === -1) headerRowIdx = 0;
                
                const header = rows[headerRowIdx].map(c => c.toString().toLowerCase());
                const dateIdx = header.findIndex(c => c.includes('дата') || c.includes('date'));
                const amountIdx = header.findIndex(c => c.includes('сумма') || c.includes('amount'));
                const descIdx = header.findIndex(c => c.includes('описание') || c.includes('назаначение') || c.includes('description') || c.includes('details'));
                
                const idx = {
                    date: dateIdx !== -1 ? dateIdx : 0,
                    amount: amountIdx !== -1 ? amountIdx : 3,
                    desc: descIdx !== -1 ? descIdx : (rows[headerRowIdx].length > 11 ? 11 : 9)
                };

                const txs = [];
                for(let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if(!row || row.length <= Math.max(idx.date, idx.amount)) continue;
                    
                    const dateRaw = row[idx.date];
                    const amountRaw = row[idx.amount]; 
                    const desc = row[idx.desc] || row[9] || 'Транзакция';
                    
                    if(!dateRaw || !amountRaw) continue;
                    
                    let val = 0;
                    if (typeof amountRaw === 'number') {
                        val = amountRaw;
                    } else {
                        val = parseFloat(amountRaw.toString().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
                    }
                    if(isNaN(val)) continue;
                    
                    let isoDate = new Date().toISOString().split('T')[0];
                    const dateStr = dateRaw.toString();
                    if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}/)) {
                        const parts = dateStr.split('.');
                        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                        isoDate = dateStr;
                    }
                    
                    const amount = Math.abs(val);
                    const mcc = row[10];
                    const cat = this.categorize(desc, mcc);
                    
                    // MODIFIED: Check for duplicates
                    const uniqueKey = `${isoDate}|${amount}|${desc}`;
                    const isDuplicate = existingMap.has(uniqueKey);

                    txs.push({
                        id: Date.now() + i,
                        date: isoDate,
                        amount: amount,
                        type: val > 0 ? 'income' : 'expense',
                        category: cat,
                        description: desc,
                        importId: Date.now(),
                        importChecked: !isDuplicate, // Uncheck duplicates by default
                        isDuplicate: isDuplicate
                    });
                }
                
                if(txs.length === 0) {
                    alert('Транзакции не найдены. Проверьте формат файла.');
                    return;
                }
                
                txs.sort((a, b) => new Date(b.date) - new Date(a.date));
                this.data = txs;
                this.step = 2;
                this.render();
            },

            categorize(desc, mcc) {
                if (typeof SmartCategorizer !== 'undefined') {
                    const res = SmartCategorizer.categorize(desc, mcc);
                    const cats = DB.get('categories');
                    const c = cats.find(x => x.id === res.categoryId);
                    if(c) return c.name;
                }
                return 'Разное';
            },
            
            save() {
                // MODIFIED: Only save checked items and remove temp fields
                const toImport = this.data
                    .filter(t => t.importChecked)
                    .map(({importChecked, isDuplicate, ...rest}) => rest);
                
                if (toImport.length === 0) {
                    closeModal();
                    return;
                }

                const current = DB.get('transactions');
                DB.save('transactions', [...current, ...toImport]);
                closeModal();
                showToast(`Импортировано ${toImport.length} записей`);
                router.refresh();
            }
        };

        // 0. Dashboard Module
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
                if(widget.type === 'recent_transactions') colSpan = 'col-span-1';
                if(widget.type === 'quick_actions') colSpan = 'col-span-1';

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
                if(type === 'budget_overview') return `<button onclick="router.navigate('budget')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></button>`;
                if(type === 'today_schedule') return `<button onclick="router.navigate('calendar')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></button>`;
                if(type === 'shopping_summary') {
                    const count = DB.get('shopping').filter(i => !i.checked).length;
                    return `<span class="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400">${count}</span>`;
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
                
                const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
                const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
                const balance = totalIncome - totalExpense;

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
                                <div class="mb-2 text-gray-300">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                </div>
                                <p class="text-sm">На сегодня планов нет</p>
                                <button onclick="Calendar.openAddModal('${todayStr}')" class="mt-4 text-xs bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg font-bold text-gray-600 dark:text-white hover:bg-gray-200 transition-colors">Добавить</button>
                            </div>
                        ` : todayEvents.map(e => {
                            const pIds = e.participantIds || [e.participantId];
                            const pColors = pIds.map(id => participants.find(p => p.id == id)?.color || '#ccc');
                            const bgStyle = pColors.length > 1 
                                ? `background: linear-gradient(to right, ${pColors.join(',')})` 
                                : `background: ${pColors[0]}`;
                            return `
                                <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onclick="Calendar.openEditModal(${e.id})">
                                    <div class="w-1.5 h-10 rounded-full mt-1 flex-shrink-0" style="${bgStyle}"></div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex justify-between">
                                            <h4 class="font-bold text-gray-900 dark:text-white truncate text-sm">${e.title}</h4>
                                            <span class="text-xs font-medium text-gray-400 flex-shrink-0 ml-2">${e.time || 'Весь день'}</span>
                                        </div>
                                        <p class="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                            ${e.location ? `📍 ${e.location}` : ''}
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
                    <div class="flex flex-col md:flex-row gap-6 h-full">
                        <div class="flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-end gap-3 mb-1">
                                    <span class="text-4xl font-extrabold text-gray-900 dark:text-white leading-none">${count}</span>
                                    <span class="text-sm text-gray-400 font-medium mb-1">товаров</span>
                                </div>
                                <p class="text-lg font-bold text-gray-900 dark:text-white">~${formatCurrency(total)}</p>
                            </div>
                            
                             <button onclick="router.navigate('shopping')" class="w-full mt-4 md:mt-0 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors">
                                Открыть список
                            </button>
                        </div>

                        <div class="flex-1 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/5 pt-4 md:pt-0 md:pl-6 min-w-0">
                             <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 md:hidden">Топ магазинов</p>
                             ${topShops.length === 0 ? '<p class="text-sm text-gray-400 italic">Список пуст</p>' : 
                                topShops.map(([name, c]) => `
                                <div class="flex justify-between items-center group/item">
                                    <span class="text-sm text-gray-600 dark:text-gray-400 font-medium truncate pr-2 group-hover/item:text-gray-900 dark:group-hover/item:text-white transition-colors">${name}</span>
                                    <span class="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-[11px] font-bold dark:text-white min-w-[24px] text-center">${c}</span>
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
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                        ${t.type === 'income' ? '↓' : '↑'}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-bold text-gray-900 dark:text-white break-words whitespace-normal">${t.description}</p>
                                        <p class="text-[10px] text-gray-500">${formatDate(t.date)}</p>
                                    </div>
                                </div>
                                <span class="text-sm font-bold whitespace-nowrap flex-shrink-0 ${t.type === 'income' ? 'text-green-500' : 'text-gray-900 dark:text-white'}">
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

        // 1. Budget Module
        const Budget = {
            currentDate: new Date(),
            selectedDate: null,

            render() {
                const transactions = DB.get('transactions');
                const year = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                const monthStr = String(month + 1).padStart(2, '0');
                
                const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
                const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
                const balance = income - expense;

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const startDay = new Date(year, month, 1).getDay() || 7; 
                
                const dailyExpenses = {};
                transactions.forEach(t => {
                    if (t.type === 'expense') {
                        dailyExpenses[t.date] = (dailyExpenses[t.date] || 0) + parseFloat(t.amount);
                    }
                });

                let listTxs = transactions;
                let listTitle = 'История';
                
                if (this.selectedDate) {
                    listTxs = transactions.filter(t => t.date === this.selectedDate);
                    listTitle = `История за ${formatDate(this.selectedDate)}`;
                } else {
                    listTxs = transactions.filter(t => t.date.startsWith(`${year}-${monthStr}`));
                    listTitle = `История за ${this.currentDate.toLocaleDateString('ru-RU', { month: 'long' })}`;
                }
                listTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

                let calendarHtml = `
                    <div class="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-white/5">
                        <div class="flex justify-between items-center mb-4">
                            <button onclick="Budget.nav(-1)" class="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">←</button>
                            <h3 class="font-bold capitalize dark:text-white">${this.currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h3>
                            <button onclick="Budget.nav(1)" class="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">→</button>
                        </div>
                        <div class="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-400">
                            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
                        </div>
                        <div class="grid grid-cols-7 gap-1">
                `;

                for (let i = 1; i < startDay; i++) calendarHtml += `<div></div>`;

                for (let d = 1; d <= daysInMonth; d++) {
                    const dateIso = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
                    const dayExpense = dailyExpenses[dateIso];
                    const isSelected = this.selectedDate === dateIso;
                    const isToday = dateIso === new Date().toISOString().split('T')[0];
                    
                    calendarHtml += `
                        <div onclick="Budget.selectDate('${dateIso}')" class="h-14 border border-gray-100 dark:border-white/5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-white/5'} ${isToday ? 'ring-1 ring-blue-400' : ''}">
                            <span class="text-xs ${isSelected ? 'font-bold text-blue-600' : 'text-gray-500'}">${d}</span>
                            ${dayExpense ? `<span class="text-[10px] font-bold text-red-500 truncate w-full text-center px-1">-${Math.round(dayExpense)}</span>` : ''}
                        </div>
                    `;
                }
                calendarHtml += `</div></div>`;

                return `
                    <div class="mb-8 h-full flex flex-col">
                        <div class="flex justify-between items-end mb-6 flex-shrink-0">
                            <h2 class="text-3xl font-bold dark:text-white tracking-tight">Финансы</h2>
                            <div class="flex gap-2">
                                <button onclick="Import.openModal()" class="ios-btn bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white px-4 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Импорт
                                </button>
                                <button onclick="Budget.openModal()" class="ios-btn bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl flex items-center gap-2">
                                    <span>+</span> Добавить
                                </button>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-shrink-0">
                            <div class="card p-6 bg-gradient-to-br from-white to-blue-50 dark:from-[#1C1C1E] dark:to-[#252527] border-0">
                                <h3 class="text-blue-500 text-sm font-semibold uppercase tracking-wider mb-2">Общий баланс</h3>
                                <p class="text-4xl font-extrabold text-gray-900 dark:text-white">${formatCurrency(balance)}</p>
                            </div>
                            <div class="card p-6">
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                                    <h3 class="text-gray-500 text-sm font-medium">Доходы</h3>
                                </div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">+${formatCurrency(income)}</p>
                            </div>
                            <div class="card p-6">
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                                    <h3 class="text-gray-500 text-sm font-medium">Расходы</h3>
                                </div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">-${formatCurrency(expense)}</p>
                            </div>
                        </div>

                        ${calendarHtml}

                        <div class="card p-8 flex-1 overflow-hidden flex flex-col">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-xl font-bold dark:text-white">${listTitle}</h2>
                                ${this.selectedDate ? `<button onclick="Budget.selectDate(null)" class="text-xs text-blue-500">Показать все</button>` : ''}
                            </div>
                            <div class="space-y-2 overflow-y-auto pr-2">
                                ${listTxs.length === 0 ? '<p class="text-gray-400">Нет записей.</p>' : 
                                listTxs.map(t => `
                                    <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group gap-4">
                                        <div class="flex items-center gap-4 flex-1 min-w-0">
                                            <div class="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg shadow-sm ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                                ${t.type === 'income' ? '↓' : '↑'}
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="font-semibold text-gray-900 dark:text-white break-words whitespace-normal" title="${t.description}">${t.description}</p>
                                                <p class="text-xs text-gray-500">${t.category} • ${formatDate(t.date)}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-4 flex-shrink-0">
                                            <span class="font-bold text-lg whitespace-nowrap ${t.type === 'income' ? 'text-green-500' : 'text-gray-900 dark:text-white'}">
                                                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                                            </span>
                                            <button onclick="Budget.delete(${t.id})" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            },
            
            nav(dir) {
                this.currentDate.setMonth(this.currentDate.getMonth() + dir);
                this.selectedDate = null; 
                router.refresh();
            },

            selectDate(dateStr) {
                if (this.selectedDate === dateStr) {
                    this.selectedDate = null;
                } else {
                    this.selectedDate = dateStr;
                }
                router.refresh();
            },

            openModal() {
                const cats = DB.get('categories');
                openModal(`<div class="p-8"><div class="flex justify-between items-center mb-6"><h3 class="text-2xl font-bold dark:text-white">Новая запись</h3><button onclick="closeModal()">✕</button></div><form onsubmit="Budget.submit(event)"><div class="space-y-5"><div><label class="block text-xs font-bold text-gray-500 uppercase mb-2">Тип</label><div class="grid grid-cols-2 gap-4"><label class="cursor-pointer"><input type="radio" name="type" value="expense" checked class="peer sr-only"><div class="p-3 text-center rounded-xl bg-gray-100 peer-checked:bg-red-500 peer-checked:text-white">Расход</div></label><label class="cursor-pointer"><input type="radio" name="type" value="income" class="peer sr-only"><div class="p-3 text-center rounded-xl bg-gray-100 peer-checked:bg-green-500 peer-checked:text-white">Доход</div></label></div></div><div><label class="block text-xs font-bold text-gray-500 uppercase mb-2">Сумма</label><input type="number" step="0.01" name="amount" required class="ios-input" placeholder="0"></div><div><label class="block text-xs font-bold text-gray-500 uppercase mb-2">Описание</label><input type="text" name="description" required class="ios-input" placeholder="..."></div><div><label class="block text-xs font-bold text-gray-500 uppercase mb-2">Категория</label><select name="category" class="ios-input">${cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</select></div><div>
    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Дата и время</label>
    <input type="datetime-local" name="date" required class="ios-input" value="${new Date().toISOString().slice(0, 16)}">
</div></div><div class="mt-8 flex justify-end"><button type="submit" class="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold">Сохранить</button></div></form></div>`);
            },
            submit(e) { e.preventDefault(); DB.add('transactions', Object.fromEntries(new FormData(e.target))); closeModal(); router.refresh(); },
            delete(id) { if(confirm('Удалить?')) { DB.delete('transactions', id); router.refresh(); } }
        };

        // 2. Calendar Module
        const Calendar = {
            currentDate: new Date(),
            view: 'month', // month, week, day
            render() {
                const header = `
                    <div class="flex justify-between items-center mb-6">
                        <div class="flex gap-2">
                            <button onclick="Calendar.setView('day')" class="px-3 py-1 rounded-lg text-sm font-bold ${this.view === 'day' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}">День</button>
                            <button onclick="Calendar.setView('week')" class="px-3 py-1 rounded-lg text-sm font-bold ${this.view === 'week' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}">Неделя</button>
                            <button onclick="Calendar.setView('month')" class="px-3 py-1 rounded-lg text-sm font-bold ${this.view === 'month' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}">Месяц</button>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="Calendar.nav(-1)" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/10">←</button>
                            <span class="font-bold w-32 text-center dark:text-white capitalize">${this.currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                            <button onclick="Calendar.nav(1)" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/10">→</button>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="Calendar.openTemplates()" class="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                            </button>
                            <button onclick="Calendar.openAddModal()" class="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-sm">+ Создать</button>
                        </div>
                    </div>
                `;
                let content = '';
                let eventsList = '';
                if(this.view === 'month') {
                    content = this.renderMonth();
                    eventsList = this.renderPeriodList('month');
                }
                else if(this.view === 'week') {
                    content = this.renderWeek();
                    eventsList = this.renderPeriodList('week');
                }
                else content = this.renderDay();
                
                return `<div>${header}${content}${eventsList}</div>`;
            },
            setView(v) { this.view = v; router.refresh(); },
            nav(d) {
                if(this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + d);
                else if(this.view === 'week') this.currentDate.setDate(this.currentDate.getDate() + d * 7);
                else this.currentDate.setDate(this.currentDate.getDate() + d);
                router.refresh();
            },
            
            renderMonth() {
                const year = this.currentDate.getFullYear(), month = this.currentDate.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const startDay = new Date(year, month, 1).getDay() || 7; 
                
                let html = '<div class="calendar-grid">';
                for(let i=1; i<startDay; i++) html += '<div class="calendar-day bg-gray-50/50"></div>';
                
                const events = DB.get('events');
                const parts = DB.get('participants');
                
                for(let d=1; d<=daysInMonth; d++) {
                    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const dayEvents = events.filter(e => e.date === dateStr);
                    
                    html += `
                        <div class="calendar-day p-2 border-b border-r dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative group" onclick="Calendar.openAddModal('${dateStr}')">
                            <span class="text-sm font-semibold text-gray-500">${d}</span>
                            <div class="mt-1 space-y-1">
                                ${dayEvents.map(e => {
                                    const pIds = e.participantIds || [e.participantId];
                                    const pColors = pIds.map(id => parts.find(p => p.id == id)?.color || '#ccc');
                                    const bgStyle = pColors.length > 1 
                                        ? `background: linear-gradient(to right, ${pColors.join(',')})` 
                                        : `background: ${pColors[0]}`;
                                    return `<div onclick="event.stopPropagation(); Calendar.openEditModal(${e.id})" class="text-[10px] text-white px-1.5 py-0.5 rounded truncate shadow-sm hover:brightness-110 cursor-pointer" style="${bgStyle}">${e.title}</div>`;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
                return html + '</div>';
            },
            
            renderWeek() {
                const s = DB.get('settings');
                const startHour = s.calendar?.startHour ?? 6;
                const endHour = s.calendar?.endHour ?? 23;

                const startOfWeek = new Date(this.currentDate);
                const day = startOfWeek.getDay() || 7;
                if(day !== 1) startOfWeek.setDate(startOfWeek.getDate() - day + 1);
                
                let html = '<div class="timeline-grid"><div class="timeline-header-cell"></div>';
                const days = [];
                for(let i=0; i<7; i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(d.getDate() + i);
                    days.push(d);
                    const isToday = d.toDateString() === new Date().toDateString();
                    html += `<div class="timeline-header-cell font-bold text-sm ${isToday ? 'text-blue-500' : 'text-gray-500'} ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">${d.toLocaleDateString('ru-RU', {weekday:'short', day:'numeric'})}</div>`;
                }
                html += '</div><div class="timeline-body relative">';
                
                for(let h=startHour; h<=endHour; h++) {
                    html += `<div class="timeline-grid time-slot"><div class="text-xs text-gray-400 text-right pr-2 pt-1 border-r border-gray-100 dark:border-gray-800">${h}:00</div>`;
                    for(let i=0; i<7; i++) html += `<div class="border-r border-gray-50 dark:border-gray-800 relative h-full" onclick="Calendar.openAddModal('${days[i].toISOString().split('T')[0]}', '${String(h).padStart(2,'0')}:00')"></div>`;
                    html += `</div>`;
                }
                
                const events = DB.get('events');
                const parts = DB.get('participants');
                days.forEach((d, colIndex) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const dayEvents = events.filter(e => e.date === dateStr);
                    dayEvents.forEach(e => {
                        const h = parseInt(e.time?.split(':')[0] || 9);
                        const m = parseInt(e.time?.split(':')[1] || 0);
                        if(h < startHour) return;
                        
                        const top = (h - startHour) * 60 + m;
                        const height = e.duration || 60;
                        const pIds = e.participantIds || [e.participantId];
                        const pColors = pIds.map(id => parts.find(p => p.id == id)?.color || '#ccc');
                        const bgStyle = pColors.length > 1 
                            ? `background: linear-gradient(135deg, ${pColors.join(',')})` 
                            : `background: ${pColors[0]}`;
                            
                        html += `
                            <div onclick="event.stopPropagation(); Calendar.openEditModal(${e.id})" 
                                 class="timeline-event text-white cursor-pointer hover:brightness-110 shadow-md" 
                                 style="top: ${top}px; height: ${height}px; left: calc(60px + ${(colIndex * 100)/7}% + 2px); width: calc(${100/7}% - 4px); ${bgStyle}">
                                <div class="font-bold truncate text-[10px]">${e.title}</div>
                                <div class="text-[9px] opacity-90">${e.time}</div>
                            </div>
                        `;
                    });
                });
                return html + '</div>';
            },
            
            renderDay() {
                const s = DB.get('settings');
                const startHour = s.calendar?.startHour ?? 6;
                const endHour = s.calendar?.endHour ?? 23;

                const dateStr = this.currentDate.toISOString().split('T')[0];
                const events = DB.get('events').filter(e => e.date === dateStr);
                const parts = DB.get('participants');
                
                let html = `<div class="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center"><h2 class="text-xl font-bold dark:text-white">${new Date(dateStr).toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'})}</h2><span class="text-sm text-gray-500">${events.length} событий</span></div>`;
                html += '<div class="timeline-body relative border-t border-gray-200 dark:border-gray-800">';
                
                for(let h=startHour; h<=endHour; h++) {
                    html += `
                        <div class="flex h-[60px] border-b border-gray-100 dark:border-gray-800">
                            <div class="w-16 flex-shrink-0 text-xs text-gray-400 text-right pr-4 pt-2 border-r border-gray-100 dark:border-gray-800">${h}:00</div>
                            <div class="flex-1 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onclick="Calendar.openAddModal('${dateStr}', '${String(h).padStart(2,'0')}:00')"></div>
                        </div>
                    `;
                }
                
                events.forEach(e => {
                    const h = parseInt(e.time?.split(':')[0] || 9);
                    const m = parseInt(e.time?.split(':')[1] || 0);
                    if(h < startHour) return;
                    
                    const top = (h - startHour) * 60 + m;
                    const height = e.duration || 60;
                    const pIds = e.participantIds || [e.participantId];
                    const pColors = pIds.map(id => parts.find(p => p.id == id)?.color || '#ccc');
                    const bgStyle = pColors.length > 1 
                        ? `background: linear-gradient(135deg, ${pColors.join(',')})` 
                        : `background: ${pColors[0]}`;
                        
                    html += `
                        <div onclick="event.stopPropagation(); Calendar.openEditModal(${e.id})" 
                             class="absolute left-20 right-4 rounded-xl p-3 text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-transform z-10" 
                             style="top: ${top}px; height: ${height}px; ${bgStyle}">
                            <div class="flex justify-between items-start">
                                <div class="font-bold text-lg">${e.title}</div>
                                <div class="text-xs bg-black/20 px-2 py-1 rounded">${e.time}</div>
                            </div>
                            <div class="text-sm opacity-90 mt-1">${e.location || 'Нет места'}</div>
                            <div class="flex -space-x-2 mt-2">
                                ${pIds.map(id => {
                                    const p = parts.find(x => x.id == id);
                                    return p ? `<div class="w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] bg-gray-200 text-gray-800" title="${p.name}">${p.name[0]}</div>` : '';
                                }).join('')}
                            </div>
                        </div>
                    `;
                });
                return html + '</div>';
            },

            renderPeriodList(period) {
                const events = DB.get('events');
                let filteredEvents = [];
                let title = '';

                if (period === 'month') {
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    filteredEvents = events.filter(e => {
                        const d = new Date(e.date);
                        return d.getFullYear() === year && d.getMonth() === month;
                    });
                    title = 'События месяца';
                } else if (period === 'week') {
                    const startOfWeek = new Date(this.currentDate);
                    const day = startOfWeek.getDay() || 7;
                    if(day !== 1) startOfWeek.setDate(startOfWeek.getDate() - day + 1);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(endOfWeek.getDate() + 6);
                    
                    filteredEvents = events.filter(e => {
                        const d = new Date(e.date);
                        return d >= startOfWeek && d <= endOfWeek;
                    });
                    title = 'События недели';
                }

                filteredEvents.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
                const parts = DB.get('participants');

                return `
                    <div class="mt-6 p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5">
                        <h3 class="font-bold text-lg mb-4 dark:text-white">${title}</h3>
                        <div class="space-y-3">
                            ${filteredEvents.length === 0 ? '<p class="text-gray-400 text-sm">Нет событий в этом периоде</p>' : 
                            filteredEvents.map(e => {
                                const pIds = e.participantIds || [e.participantId];
                                const pColors = pIds.map(id => parts.find(p => p.id == id)?.color || '#ccc');
                                const bgStyle = pColors.length > 1 
                                    ? `background: linear-gradient(to right, ${pColors.join(',')})` 
                                    : `background: ${pColors[0]}`;
                                return `
                                    <div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onclick="Calendar.openEditModal(${e.id})">
                                        <div class="w-1.5 h-10 rounded-full" style="${bgStyle}"></div>
                                        <div class="flex-1">
                                            <div class="flex justify-between">
                                                <h4 class="font-bold dark:text-white">${e.title}</h4>
                                                <span class="text-xs text-gray-500">${formatDate(e.date)} ${e.time}</span>
                                            </div>
                                            <p class="text-xs text-gray-500">${e.location || ''}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            },
            
            openAddModal(dateStr = '', timeStr = '12:00', eventId = null) {
                const parts = DB.get('participants');
                if(!dateStr) dateStr = new Date().toISOString().split('T')[0];
                
                let event = null;
                let endTimeStr = '';
                let reminder = 0;

                if(eventId) {
                    event = DB.get('events').find(e => e.id === eventId);
                    if(event) {
                        dateStr = event.date;
                        timeStr = event.time;
                        if (event.duration) {
                            const [h, m] = timeStr.split(':').map(Number);
                            const endDate = new Date();
                            endDate.setHours(h, m + event.duration);
                            endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                        } else if (event.endTime) {
                            endTimeStr = event.endTime;
                        }
                        reminder = event.reminder || 0;
                    }
                }

                const isCustom = ![0, 5, 10, 30, 60, 1440].includes(reminder);
                let customVal = reminder;
                let customUnit = 1;
                if (isCustom && reminder > 0) {
                    if (reminder % 1440 === 0) { customVal = reminder / 1440; customUnit = 1440; }
                    else if (reminder % 60 === 0) { customVal = reminder / 60; customUnit = 60; }
                }

                const participantsHtml = parts.map(p => {
                    const isChecked = event ? (event.participantIds || [event.participantId]).includes(p.id.toString()) : false;
                    return `
                        <label class="cursor-pointer">
                            <input type="checkbox" name="participants" value="${p.id}" ${isChecked ? 'checked' : ''} class="peer sr-only">
                            <div class="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 peer-checked:ring-2 ring-offset-1 text-sm transition-all border border-transparent peer-checked:border-[${p.color}] text-gray-700 dark:text-gray-300" style="--tw-ring-color: ${p.color}">
                                ${p.name}
                            </div>
                        </label>
                    `;
                }).join('');

                openModal(`
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-2xl font-bold dark:text-white">${event ? 'Редактирование' : 'Новое событие'}</h3>
                            <button onclick="closeModal()">✕</button>
                        </div>
                        <form onsubmit="Calendar.save(event)">
                            <input type="hidden" name="id" value="${event ? event.id : ''}">
                            <div class="space-y-4">
                                <input type="text" name="title" value="${event ? event.title : ''}" required class="ios-input font-bold text-lg" placeholder="Название события">
                                <div class="grid grid-cols-1 gap-4">
                                    <input type="date" name="date" required class="ios-input" value="${dateStr}">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-xs text-gray-500 uppercase font-bold ml-1">Начало</label>
                                            <input type="time" name="startTime" class="ios-input" value="${timeStr}" required>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-500 uppercase font-bold ml-1">Конец (необязательно)</label>
                                            <input type="time" name="endTime" class="ios-input" value="${endTimeStr}" placeholder="--:--">
                                        </div>
                                    </div>
                                </div>
                                <input type="text" name="location" value="${event ? event.location || '' : ''}" class="ios-input" placeholder="📍 Место">
                                
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Напоминание</label>
                                    <select name="reminderSelect" class="ios-input" onchange="this.nextElementSibling.classList.toggle('hidden', this.value !== 'custom')">
                                        <option value="0" ${reminder === 0 ? 'selected' : ''}>Без напоминания</option>
                                        <option value="5" ${reminder === 5 ? 'selected' : ''}>За 5 минут</option>
                                        <option value="10" ${reminder === 10 ? 'selected' : ''}>За 10 минут</option>
                                        <option value="30" ${reminder === 30 ? 'selected' : ''}>За 30 минут</option>
                                        <option value="60" ${reminder === 60 ? 'selected' : ''}>За 1 час</option>
                                        <option value="1440" ${reminder === 1440 ? 'selected' : ''}>За 1 день</option>
                                        <option value="custom" ${isCustom && reminder > 0 ? 'selected' : ''}>Другое...</option>
                                    </select>
                                    <div class="flex gap-2 mt-2 ${isCustom && reminder > 0 ? '' : 'hidden'}">
                                        <input type="number" name="customRemVal" class="ios-input w-1/3" placeholder="Число" value="${isCustom ? customVal : ''}">
                                        <select name="customRemUnit" class="ios-input w-2/3">
                                            <option value="1" ${customUnit === 1 ? 'selected' : ''}>Минут</option>
                                            <option value="60" ${customUnit === 60 ? 'selected' : ''}>Часов</option>
                                            <option value="1440" ${customUnit === 1440 ? 'selected' : ''}>Дней</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Участники</label>
                                    <div class="flex flex-wrap gap-2">${participantsHtml}</div>
                                </div>
                                <div class="flex gap-2 items-center text-sm text-gray-500 mt-2">
                                    <button type="button" onclick="Calendar.saveTemplateFromForm(this.form)" class="text-yellow-500 font-bold hover:underline flex items-center gap-1">⭐ Сохранить как шаблон</button>
                                </div>
                            </div>
                            <div class="mt-6 flex justify-between items-center">
                                <div class="flex gap-2">
                                    ${event ? `<button type="button" onclick="Calendar.deleteEvent(${event.id})" class="text-red-500 font-bold text-sm hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">Удалить</button>` : ''}
                                    ${event ? `<button type="button" onclick="Calendar.copyEvent(${event.id})" class="text-blue-500 font-bold text-sm hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">📋 Копировать</button>` : ''}
                                </div>
                                <button type="submit" class="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors">Сохранить</button>
                            </div>
                        </form>
                    </div>
                `);
            },
            
            openEditModal(id) {
                this.openAddModal(null, null, id);
            },
            
            save(e) {
                e.preventDefault();
                const formData = new FormData(e.target);
                const pIds = formData.getAll('participants');
                const id = formData.get('id');
                
                const startTime = formData.get('startTime');
                const endTime = formData.get('endTime');
                let duration = 60; // Default 1 hour

                if (endTime) {
                    const [h1, m1] = startTime.split(':').map(Number);
                    const [h2, m2] = endTime.split(':').map(Number);
                    duration = (h2 * 60 + m2) - (h1 * 60 + m1);
                    if (duration < 0) duration += 24 * 60; // Handle overnight simply
                }

                let reminder = 0;
                const remSelect = formData.get('reminderSelect');
                if (remSelect === 'custom') {
                    const val = parseInt(formData.get('customRemVal') || 0);
                    const unit = parseInt(formData.get('customRemUnit') || 1);
                    reminder = val * unit;
                } else {
                    reminder = parseInt(remSelect);
                }

                const data = {
                    title: formData.get('title'),
                    date: formData.get('date'),
                    time: startTime,
                    endTime: endTime,
                    duration: duration,
                    location: formData.get('location'),
                    participantIds: pIds.length ? pIds : [1],
                    reminder: reminder
                };
                
                if(id) {
                    DB.update('events', id, data);
                } else {
                    DB.add('events', data);
                }
                
                closeModal();
                router.refresh();
            },
            
            deleteEvent(id) {
                if(confirm('Удалить событие?')) {
                    DB.delete('events', id);
                    closeModal();
                    router.refresh();
                }
            },

            copyEvent(id) {
                const event = DB.get('events').find(e => e.id === id);
                if (event) {
                    closeModal();
                    setTimeout(() => {
                        this.openAddModal(event.date, event.time);
                        setTimeout(() => {
                            document.querySelector('input[name="title"]').value = event.title + " (Копия)";
                            document.querySelector('input[name="startTime"]').value = event.time;
                            if(event.endTime) document.querySelector('input[name="endTime"]').value = event.endTime;
                            document.querySelector('input[name="location"]').value = event.location || '';
                        }, 50);
                    }, 300);
                }
            },
            
            openTemplates() {
                const templates = DB.get('templates');
                openModal(`
                    <div class="p-6 relative">
                        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold dark:text-white">Шаблоны</h3>
                        </div>
                        <div class="space-y-2 max-h-[300px] overflow-y-auto">
                            ${templates.length === 0 ? '<p class="text-gray-400">Нет шаблонов</p>' : 
                            templates.map(t => `
                                <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onclick="Calendar.useTemplate(${t.id})">
                                    <span class="font-bold dark:text-white">${t.title}</span>
                                    <button onclick="event.stopPropagation(); Calendar.deleteTemplate(${t.id})" class="text-red-500 p-2 hover:bg-red-50 rounded-lg">✕</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            },
            saveTemplateFromForm(form) {
                const title = form.title.value;
                if(!title) return alert('Введите название');
                // Approximate duration from times
                const startTime = form.startTime.value;
                const endTime = form.endTime.value;
                let duration = 60;
                if(endTime) {
                     const [h1, m1] = startTime.split(':').map(Number);
                     const [h2, m2] = endTime.split(':').map(Number);
                     duration = (h2 * 60 + m2) - (h1 * 60 + m1);
                }

                DB.add('templates', { id: Date.now(), title, duration: duration });
                alert('Шаблон сохранен');
            },
            useTemplate(id) {
                const t = DB.get('templates').find(x => x.id === id);
                if(t) {
                    closeModal();
                    setTimeout(() => {
                        this.openAddModal(null, '10:00');
                        setTimeout(() => {
                            document.querySelector('input[name="title"]').value = t.title;
                            // Set end time based on template duration
                            const [h, m] = '10:00'.split(':').map(Number);
                            const endD = new Date();
                            endD.setHours(h, m + (t.duration || 60));
                            const endStr = `${String(endD.getHours()).padStart(2,'0')}:${String(endD.getMinutes()).padStart(2,'0')}`;
                            document.querySelector('input[name="endTime"]').value = endStr;
                        }, 50);
                    }, 200);
                }
            },
            deleteTemplate(id) {
                DB.delete('templates', id);
                this.openTemplates();
            }
        };

        // 3. Shopping Module
        const Shopping = {
            render() {
                const items = DB.get('shopping');
                const active = items.filter(i => !i.checked);
                const checked = items.filter(i => i.checked);
                
                const renderItem = (i) => `
                    <div class="flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] border-b border-gray-100 dark:border-white/5 last:border-0" onclick="Shopping.edit(${i.id})">
                        <div onclick="event.stopPropagation(); Shopping.toggle(${i.id})" class="w-6 h-6 rounded-full border-2 ${i.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'} flex items-center justify-center cursor-pointer transition-colors">
                            ${i.checked ? '<span class="text-white text-xs">✓</span>' : ''}
                        </div>
                        <div class="flex-1">
                            <div class="font-medium ${i.checked ? 'line-through text-gray-400' : 'dark:text-white'}">${i.name}</div>
                            <div class="text-xs text-gray-500">${i.qty} ${i.unit} • ${i.price || 0}₽</div>
                        </div>
                    </div>
                `;
                
                return `
                    <div class="h-full flex flex-col">
                        <div class="flex justify-between items-end mb-4">
                            <h2 class="text-3xl font-bold dark:text-white">Покупки</h2>
                            <div class="flex gap-2">
                                <button onclick="Shopping.openScanner()" class="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 transition-colors">📷</button>
                                <button onclick="Shopping.openAddModal()" class="p-2 bg-black text-white rounded-full px-4 font-bold hover:opacity-90 transition-opacity">+ Товар</button>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-4">
                            <div class="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E]">
                                ${active.length ? active.map(renderItem).join('') : '<div class="p-4 text-center text-gray-400">Список пуст</div>'}
                            </div>
                            
                            ${checked.length ? `
                                <div class="opacity-60">
                                    <div class="flex justify-between items-center mb-2 px-2">
                                        <h4 class="font-bold text-sm text-gray-500">Куплено</h4>
                                        <button onclick="Shopping.clearCompleted()" class="text-xs text-red-500 hover:underline">Очистить</button>
                                    </div>
                                    <div class="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E]">
                                        ${checked.map(renderItem).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            },
            toggle(id) { const i = DB.get('shopping').find(x => x.id === id); if(i) { i.checked = !i.checked; DB.update('shopping', id, {checked: i.checked}); router.refresh(); } },
            openAddModal() { this.openEditModal(); },
            openEditModal(id, prefill={}) {
                const item = id ? DB.get('shopping').find(i => i.id === id) : prefill;
                openModal(`
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold dark:text-white">${id ? 'Редактировать' : 'Новый товар'}</h3>
                            <button onclick="closeModal()">✕</button>
                        </div>
                        <form onsubmit="Shopping.save(event, ${id})">
                            <input type="text" name="name" value="${item.name||''}" class="ios-input mb-3 font-bold" placeholder="Название" required>
                            
                            <select name="priority" class="ios-input w-full mb-3">
                                <option value="normal" ${item.priority === 'normal' ? 'selected' : ''}>Обычный</option>
                                <option value="high" ${item.priority === 'high' ? 'selected' : ''}>🔥 Важный</option>
                                <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Низкий</option>
                            </select>

                            <div class="flex gap-3 mb-3">
                                <input type="number" min="0" step="any" name="qty" value="${item.qty || ''}" class="ios-input" placeholder="Кол-во">
                                <input type="text" name="unit" value="${item.unit||'шт'}" class="ios-input w-20" placeholder="Ед.">
                            </div>
                            <input type="number" min="0" step="any" name="price" value="${item.price||''}" class="ios-input mb-6" placeholder="Цена">
                            <button class="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">Сохранить</button>
                        </form>
                        ${id ? `<button onclick="Shopping.delete(${id})" class="w-full mt-2 text-red-500 py-2">Удалить</button>` : ''}
                    </div>
                `);
            },
            save(e, id) { 
                e.preventDefault(); 
                const d = Object.fromEntries(new FormData(e.target));
                if (d.qty && parseFloat(d.qty) < 0) d.qty = 0;
                if (d.price && parseFloat(d.price) < 0) d.price = 0;

                if(id) DB.update('shopping', id, d); 
                else DB.add('shopping', {...d, checked:false}); 
                closeModal(); 
                router.refresh(); 
            },
            delete(id) { if(confirm('Удалить товар?')) { DB.delete('shopping', id); closeModal(); router.refresh(); } },
            edit(id) { this.openEditModal(id); },
            clearCompleted() {
                const items = DB.get('shopping');
                items.filter(i => i.checked).forEach(i => DB.delete('shopping', i.id));
                router.refresh();
            },
            openScanner() {
                Scanner.start((code) => {
                    Scanner.stop();
                    showToast('Поиск товара...');
                    fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
                        .then(r => r.json())
                        .then(d => {
                            if(d.status === 1) {
                                const name = d.product.product_name_ru || d.product.product_name;
                                this.openEditModal(null, {name});
                            } else {
                                showToast('Товар не найден', false);
                            }
                        })
                        .catch(() => showToast('Ошибка сети', false));
                });
            }
        };

        // 4. Settings Module
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

        const Scanner = {
            reader: null,
            init() { if(!this.reader && window.ZXing) this.reader = new ZXing.BrowserMultiFormatReader(); },
            start(cb) {
                this.init();
                const el = document.createElement('div'); el.id = 'scanner-overlay';
                el.innerHTML = `<div class="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center"><video id="video" class="w-full h-full object-cover opacity-50"></video><div class="absolute w-64 h-48 border-2 border-white/50 rounded-2xl z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-0.5 bg-red-500 shadow-[0_0_10px_red] animate-pulse z-30"></div><button onclick="Scanner.stop()" class="absolute bottom-10 bg-white text-black px-6 py-2 rounded-full font-bold z-30">Закрыть</button></div>`;
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
                
                // Hide nav items if configured
                updateNavigationVisibility();
            },
            refresh() { this.render(); }
        };

        window.openModal = (html, widthClass = 'max-w-lg') => { 
            const o = document.getElementById('modal-overlay'); 
            const c = document.getElementById('modal-content'); 
            // Reset base classes and apply width
            c.className = `bg-white dark:bg-[#1C1C1E] w-full ${widthClass} rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-95 opacity-0 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto`;
            c.innerHTML = html; 
            o.classList.remove('hidden'); 
            setTimeout(() => { c.classList.remove('scale-95', 'opacity-0'); c.classList.add('scale-100', 'opacity-100'); }, 10); 
        };
        window.closeModal = () => { const o = document.getElementById('modal-overlay'); const c = document.getElementById('modal-content'); c.classList.remove('scale-100', 'opacity-100'); c.classList.add('scale-95', 'opacity-0'); setTimeout(() => o.classList.add('hidden'), 200); };

        document.addEventListener('DOMContentLoaded', () => {
            router.navigate('dashboard');
            updateNavigationVisibility();
        });
