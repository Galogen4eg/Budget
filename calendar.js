
const Calendar = {
    currentDate: new Date(),
    view: 'month', 
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
