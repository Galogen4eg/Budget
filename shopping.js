
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
                        <button onclick="Shopping.openScanner()" class="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </button>
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
