const plannerApp = {
    events: [],
    currentView: 'month',
    currentDate: new Date(),
    editingId: null,

    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.monthBtn = document.getElementById('btnMonthView');
        this.weekBtn = document.getElementById('btnWeekView');
        this.periodLabel = document.getElementById('plannerPeriod');
        this.monthGrid = document.getElementById('monthGrid');
        this.weekGrid = document.getElementById('weekGrid');
        this.btnAddEvent = document.getElementById('btnAddEvent');
        this.modal = document.getElementById('eventModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.btnCloseModal = document.getElementById('btnCloseModal');
        this.btnSaveEvent = document.getElementById('btnSaveEvent');
        this.btnDeleteEvent = document.getElementById('btnDeleteEvent');
        this.typeInput = document.getElementById('eventType');
        this.categoryInput = document.getElementById('eventCategory');
        this.dateInput = document.getElementById('eventDate');
        this.timeInput = document.getElementById('eventTime');
        this.titleInput = document.getElementById('eventTitleInput');
        this.descriptionInput = document.getElementById('eventDescription');
        this.repeatSelect = document.getElementById('eventRepeat');
        this.repeatEndInput = document.getElementById('eventRepeatEnd');
        this.upcomingList = document.getElementById('upcomingList');
    },

    bindEvents() {
        this.monthBtn?.addEventListener('click', () => this.changeView('month'));
        this.weekBtn?.addEventListener('click', () => this.changeView('week'));
        document.getElementById('btnPrev')?.addEventListener('click', () => this.shiftPeriod(-1));
        document.getElementById('btnNext')?.addEventListener('click', () => this.shiftPeriod(1));
        this.btnAddEvent?.addEventListener('click', () => this.openModal());
        this.btnCloseModal?.addEventListener('click', () => this.closeModal());
        this.btnSaveEvent?.addEventListener('click', () => this.saveEvent());
        this.btnDeleteEvent?.addEventListener('click', () => this.deleteEvent());
    },

    changeView(view) {
        this.currentView = view;
        this.monthBtn?.classList.toggle('active', view === 'month');
        this.weekBtn?.classList.toggle('active', view === 'week');
        document.getElementById('monthlyView')?.classList.toggle('hidden', view !== 'month');
        document.getElementById('weeklyView')?.classList.toggle('hidden', view !== 'week');
        this.render();
    },

    shiftPeriod(delta) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + delta * 7);
        }
        this.render();
    },

    render() {
        this.renderPeriodLabel();
        if (this.currentView === 'month') this.renderMonth();
        else this.renderWeek();
        this.renderUpcoming();
    },

    renderPeriodLabel() {
        this.periodLabel.textContent = this.currentDate.toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
        });
    },

    renderMonth() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const cells = [];

        for (let i = 0; i < startOffset; i++) cells.push('<div></div>');
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayEvents = this.events.filter(e => e.date === dateKey);
            const pills = dayEvents.slice(0,3).map(evt => `
                <span class="event-pill" style="background:${evt.color || '#4f46e5'}">
                    ${evt.title}
                </span>
            `).join('');
            const more = dayEvents.length > 3 ? `<span class="text-xs text-gray-400">+${dayEvents.length - 3}</span>` : '';
            cells.push(`
                <div class="planner-day" data-date="${dateKey}" onclick="plannerApp.openModal('${dateKey}')">
                    <div class="date-label">${day}</div>
                    <div class="flex flex-col gap-2">${pills}${more}</div>
                </div>
            `);
        }
        this.monthGrid.innerHTML = cells.join('');
    },

    renderWeek() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
        const columns = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dateKey = day.toISOString().slice(0,10);
            const events = this.events.filter(e => e.date === dateKey);
            columns.push(`
                <div class="bg-white rounded-2xl border border-gray-200 p-3 min-h-[240px]">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium text-gray-700">${day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                        <span class="text-xs text-gray-400">${day.getDate()}</span>
                    </div>
                    <div class="space-y-2">
                        ${events.map(evt => `
                            <div class="p-2 rounded-xl text-xs text-white" style="background:${evt.color || '#4f46e5'}">
                                <div class="font-semibold">${evt.time || '—'}</div>
                                <div>${evt.title}</div>
                            </div>
                        `).join('') || '<p class="text-gray-300 text-xs">Нет событий</p>'}
                    </div>
                </div>
            `);
        }
        this.weekGrid.innerHTML = columns.join('');
    },

    renderUpcoming() {
        const upcoming = [...this.events]
            .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))
            .slice(0,5);
        if (upcoming.length === 0) {
            this.upcomingList.innerHTML = '<p class="text-gray-400 text-sm">Нет запланированных событий</p>';
            return;
        }
        this.upcomingList.innerHTML = upcoming.map(evt => `
            <div class="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div>
                    <div class="font-medium text-gray-800">${evt.title || 'Без названия'}</div>
                    <div class="text-xs text-gray-500">${evt.date} · ${evt.time || '—'} · ${evt.userName || 'Неизвестно'}</div>
                </div>
                <button class="btn-secondary text-xs" onclick="plannerApp.openModal(null, '${evt.id}')">Редактировать</button>
            </div>
        `).join('');
    },

    openModal(date = null, id = null) {
        this.editingId = id;
        if (id) {
            const event = this.events.find(e => e.id === id);
            if (!event) return;
            this.modalTitle.textContent = 'Редактирование события';
            this.typeInput.value = event.type;
            this.categoryInput.value = event.category || '';
            this.dateInput.value = event.date;
            this.timeInput.value = event.time || '';
            this.titleInput.value = event.title || '';
            this.descriptionInput.value = event.description || '';
            this.repeatSelect.value = event.recurring?.pattern || 'none';
            this.repeatEndInput.value = event.recurring?.endDate || '';
            this.btnDeleteEvent.classList.remove('hidden');
        } else {
            this.modalTitle.textContent = 'Новое событие';
            this.typeInput.value = 'meeting';
            this.categoryInput.value = '';
            this.dateInput.value = date || new Date().toISOString().slice(0,10);
            this.timeInput.value = '09:00';
            this.titleInput.value = '';
            this.descriptionInput.value = '';
            this.repeatSelect.value = 'none';
            this.repeatEndInput.value = '';
            this.btnDeleteEvent.classList.add('hidden');
        }
        this.modal.classList.add('show');
    },

    closeModal() {
        this.modal.classList.remove('show');
        this.editingId = null;
    },

    saveEvent() {
        const data = {
            id: this.editingId || 'evt_' + Date.now(),
            type: this.typeInput.value,
            category: this.categoryInput.value.trim(),
            date: this.dateInput.value,
            time: this.timeInput.value,
            title: this.titleInput.value.trim(),
            description: this.descriptionInput.value.trim(),
            recurring: {
                pattern: this.repeatSelect.value,
                endDate: this.repeatEndInput.value
            },
            userName: roomsManager.currentUserName || 'Без имени',
            color: this.getUserColor(roomsManager.currentUserName)
        };
        const exists = this.events.findIndex(e => e.id === data.id);
        if (exists >= 0) this.events[exists] = data;
        else this.events.push(data);
        this.sync();
        this.closeModal();
    },

    deleteEvent() {
        if (!this.editingId) return;
        this.events = this.events.filter(e => e.id !== this.editingId);
        this.sync();
        this.closeModal();
    },

    sync() {
        roomsManager.data = roomsManager.data || {};
        roomsManager.data.planner = roomsManager.data.planner || {};
        roomsManager.data.planner.events = this.events;
        if (roomsManager.syncData) roomsManager.syncData();
        this.render();
    },

    loadFromRoom() {
        const roomEvents = roomsManager.data?.planner?.events;
        this.events = Array.isArray(roomEvents) ? roomEvents : [];
        this.render();
    },

    getUserColor(name = '') {
        const palette = ['#4f46e5','#9333ea','#f97316','#0ea5e9','#14b8a6','#22c55e'];
        if (!name) return palette[0];
        let sum = 0;
        for (const char of name) sum += char.charCodeAt(0);
        return palette[sum % palette.length];
    }
};

roomsManager.init({ page: 'planner.html' });
document.addEventListener('DOMContentLoaded', () => {
    plannerApp.init();
    plannerApp.loadFromRoom();
});
