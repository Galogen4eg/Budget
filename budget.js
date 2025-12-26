
const Import = {
    data: [],
    step: 1,
    
    openModal() {
        this.step = 1;
        this.data = [];
        this.render();
    },

    render() {
        let content = '';
        if(this.step === 1) {
            content = `
                <div class="p-6 text-center">
                    <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📥</div>
                    <h3 class="text-xl font-bold mb-2 dark:text-white">Импорт выписки</h3>
                    <p class="text-sm text-gray-500 mb-6">Загрузите CSV/Excel файл.</p>
                    <label class="block w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                        <input type="file" accept=".csv, .xls, .xlsx" onchange="Import.handleFile(this)" class="hidden">
                        <div class="text-gray-400 group-hover:text-blue-500 transition-colors">
                            <span class="text-4xl block mb-2">📄</span>
                            <span class="text-sm font-bold">Выберите файл</span>
                        </div>
                    </label>
                    <button onclick="closeModal()" class="mt-6 text-gray-400 hover:text-gray-600 text-sm font-medium">Отмена</button>
                </div>
            `;
        } else {
            content = `
                <div class="p-6 h-[80vh] flex flex-col">
                    <div class="flex justify-between items-center mb-6">
                        <div><h3 class="text-xl font-bold dark:text-white">Предпросмотр</h3><p class="text-xs text-gray-500">${this.data.length} операций</p></div>
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
                                            <div class="text-xs text-gray-500">${t.category}</div>
                                        </td>
                                        <td class="p-3 text-right font-bold whitespace-nowrap align-top ${t.type === 'income' ? 'text-green-500' : 'text-gray-900 dark:text-white'}">
                                            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount).replace('₽','')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center pt-4">
                        <button onclick="Import.save()" class="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">Импортировать</button>
                    </div>
                </div>
            `;
        }
        openModal(content, 'max-w-[90vw]');
    },
    
    toggleAll(checkbox) { this.data.forEach(t => t.importChecked = checkbox.checked); this.render(); },
    toggleItem(index) { this.data[index].importChecked = !this.data[index].importChecked; this.render(); },

    handleFile(input) {
        const file = input.files[0];
        if(!file) return;
        
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                encoding: "Windows-1251",
                skipEmptyLines: true,
                complete: (res) => this.process(res.data),
                error: (err) => alert('Ошибка: ' + err.message)
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof XLSX === 'undefined') return alert('Библиотека Excel не загружена');
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {header: 1, defval: '', raw: false});
                this.process(rows);
            };
            reader.readAsArrayBuffer(file);
        }
    },
    
    process(rows) {
        const existingTxs = DB.get('transactions');
        const existingMap = new Set(existingTxs.map(t => `${t.date}|${t.amount}|${t.description}`));
        let headerRowIdx = rows.findIndex(r => r.join(';').includes('Дата') || r.join(';').includes('Date'));
        if(headerRowIdx === -1) headerRowIdx = 0;
        
        const txs = [];
        for(let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if(!row || row.length < 3) continue;
            
            const dateRaw = row[0];
            const amountRaw = row[3]; 
            const desc = row[11] || row[9] || 'Транзакция';
            if(!dateRaw || !amountRaw) continue;
            
            let val = typeof amountRaw === 'number' ? amountRaw : parseFloat(amountRaw.replace(/\s/g, '').replace(',', '.'));
            if(isNaN(val)) continue;
            
            // Date Parsing
            let isoDate = new Date().toISOString().split('T')[0];
            if (dateRaw.match(/^\d{2}\.\d{2}\.\d{4}/)) {
                const parts = dateRaw.split('.');
                isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            const amount = Math.abs(val);
            const catRes = SmartCategorizer.categorize(desc, row[10]);
            const cats = DB.get('categories');
            const catName = cats.find(c => c.id === catRes.categoryId)?.name || 'Разное';
            
            const uniqueKey = `${isoDate}|${amount}|${desc}`;
            const isDuplicate = existingMap.has(uniqueKey);

            txs.push({
                id: Date.now() + i,
                date: isoDate,
                amount: amount,
                type: val > 0 ? 'income' : 'expense',
                category: catName,
                description: desc,
                importId: Date.now(),
                importChecked: !isDuplicate,
                isDuplicate: isDuplicate
            });
        }
        
        this.data = txs.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.step = 2;
        this.render();
    },
    
    save() {
        const toImport = this.data.filter(t => t.importChecked).map(({importChecked, isDuplicate, ...rest}) => rest);
        if (toImport.length === 0) return closeModal();
        const current = DB.get('transactions');
        DB.save('transactions', [...current, ...toImport]);
        closeModal();
        showToast(`Импортировано ${toImport.length} записей`);
        router.refresh();
    }
};

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
                            📥 Импорт
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
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${t.type === 'income' ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}"></path></svg>
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
        openModal(`
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold dark:text-white">Новая запись</h3>
                    <button onclick="closeModal()">✕</button>
                </div>
                <form onsubmit="Budget.submit(event)">
                    <div class="space-y-5">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Тип</label>
                            <div class="grid grid-cols-2 gap-4">
                                <label class="cursor-pointer">
                                    <input type="radio" name="type" value="expense" checked class="peer sr-only">
                                    <div class="p-3 text-center rounded-xl bg-gray-100 dark:bg-white/5 dark:text-gray-400 peer-checked:bg-red-500 peer-checked:text-white transition-colors">Расход</div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="type" value="income" class="peer sr-only">
                                    <div class="p-3 text-center rounded-xl bg-gray-100 dark:bg-white/5 dark:text-gray-400 peer-checked:bg-green-500 peer-checked:text-white transition-colors">Доход</div>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Сумма</label>
                            <input type="number" step="0.01" name="amount" required class="ios-input" placeholder="0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Описание</label>
                            <input type="text" name="description" required class="ios-input" placeholder="...">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Категория</label>
                            <select name="category" class="ios-input">
                                ${cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Дата и время</label>
                            <input type="datetime-local" name="date" required class="ios-input" value="${new Date().toISOString().slice(0, 16)}">
                        </div>
                    </div>
                    <div class="mt-8 flex justify-end">
                        <button type="submit" class="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold">Сохранить</button>
                    </div>
                </form>
            </div>
        `);
    },
    submit(e) { e.preventDefault(); DB.add('transactions', Object.fromEntries(new FormData(e.target))); closeModal(); router.refresh(); },
    delete(id) { if(confirm('Удалить?')) { DB.delete('transactions', id); router.refresh(); } }
};
