// ======== УПРАВЛЕНИЕ КОМНАТАМИ ========
const roomsManager = {
    currentRoomId: null,
    dataRef: null,
    options: {
        page: '',
        requireAuth: true,
        autoRedirectOnAuthSuccess: true
    },

    ensureDataStructure() {
        if (!data || typeof data !== 'object') {
            data = { users: [], roomPassword: null, shopping: { items: [], templates: [], telegram: { token: '', chatId: '' } } };
        }
        if (!Array.isArray(data.users)) data.users = [];
        if (!data.shopping || typeof data.shopping !== 'object') data.shopping = { items: [], templates: [], telegram: { token: '', chatId: '' } };
        if (!Array.isArray(data.shopping.items)) data.shopping.items = [];
        if (!Array.isArray(data.shopping.templates)) data.shopping.templates = [];
        if (!data.shopping.telegram) data.shopping.telegram = { token: '', chatId: '' };
    },

    init(options = {}) {
        this.options = {
            page: options.page || this.getCurrentPageName(),
            requireAuth: options.requireAuth !== false,
            autoRedirectOnAuthSuccess: options.autoRedirectOnAuthSuccess !== false
        };

        this.ensureDataStructure();
        this.updateRoomUI();

        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        const savedRoomId = localStorage.getItem('familyRoomId');
        const savedRoomPassword = localStorage.getItem('familyRoomPassword');
        const savedUserName = localStorage.getItem('familyUserName');
        const pageName = this.options.page;

        if (pageName === 'auth.html') {
            if (savedRoomId && savedRoomPassword) {
                const target = roomFromUrl || savedRoomId;
                this.joinRoomById(target, savedRoomPassword, false, true).then(success => {
                    if (success && this.options.autoRedirectOnAuthSuccess) {
                        this.redirectAfterAuth();
                    } else {
                        this.updateRoomUI();
                    }
                });
            } else {
                this.updateRoomUI();
            }
            return;
        }

        const targetRoomId = roomFromUrl || savedRoomId;
        if (!targetRoomId || !savedRoomPassword) {
            if (this.options.requireAuth) this.redirectToAuth();
            return;
        }

        const userNameForJoin = savedUserName || '';
        this.joinRoomById(targetRoomId, savedRoomPassword, false, true, userNameForJoin).then(success => {
            if (!success) this.redirectToAuth();
        });
    },

    getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    },

    redirectToAuth(force = false) {
        if (this.options.page === 'auth.html' && !force) return;
        const path = window.location.pathname.replace(/^\//, '') || 'index.html';
        const search = window.location.search || '';
        const next = encodeURIComponent(`${path}${search}`);
        window.location.href = `auth.html?next=${next}`;
    },

    redirectAfterAuth() {
        const params = new URLSearchParams(window.location.search);
        const nextParam = params.get('next');
        const decoded = nextParam ? decodeURIComponent(nextParam) : 'index.html';
        const url = new URL(decoded, window.location.origin);
        if (this.currentRoomId) url.searchParams.set('room', this.currentRoomId);
        window.location.href = url.href;
    },

    async createRoomWithPassword(password, userName) {
        if (!password) throw new Error('Введите пароль');
        if (!userName) throw new Error('Введите имя');
        const roomId = this.generateRoomId();
        data.roomPassword = password;
        this.ensureDataStructure();
        const success = await this.joinRoomById(roomId, password, true, false, userName);
        if (success === false) throw new Error('Не удалось создать комнату');
        this.saveRoomCredentials(roomId, password, userName);
        return roomId;
    },

    async joinRoomWithCredentials(roomId, password, userName) {
        if (!roomId || !password) throw new Error('Введите ID и пароль');
        if (!userName) throw new Error('Введите имя');
        const normalizedId = roomId.trim().toUpperCase();
        const success = await this.joinRoomById(normalizedId, password, false, false, userName);
        if (success === false) throw new Error('Неверный ID комнаты или пароль');
        this.saveRoomCredentials(normalizedId, password, userName);
        return normalizedId;
    },

    joinRoomById(roomId, password, isNew = false, silent = false, userName = '') {
        if (!db) {
            if (!silent) alert('Firebase недоступен');
            return Promise.resolve(false);
        }

        const normalizedId = roomId.trim().toUpperCase();
        if (this.dataRef) this.dataRef.off();
        this.currentRoomId = normalizedId;
        this.currentUserName = userName || localStorage.getItem('familyUserName') || '';
        this.dataRef = db.ref('family/' + normalizedId);

        return this.dataRef.once('value').then(snapshot => {
            const saved = snapshot.val();
            if (isNew) {
                this.ensureDataStructure();
                return this.dataRef.set({ data, lastUpdated: firebase.database.ServerValue.TIMESTAMP }).then(() => {
                    this.afterSuccessfulJoin(normalizedId, password);
                    return true;
                });
            } else {
                if (saved?.data?.roomPassword && saved.data.roomPassword !== password) {
                    if (!silent) alert('Неверный пароль комнаты');
                    this.currentRoomId = null;
                    this.removeSavedRoomCredentials();
                    return false;
                }
                data = saved?.data || { users: [], roomPassword: password, shopping: { items: [], templates: [], telegram: { token: '', chatId: '' } } };
                this.ensureDataStructure();
                this.setupListener();
                this.afterSuccessfulJoin(normalizedId, password);
                return true;
            }
        }).catch(err => {
            console.error('Room join error:', err);
            if (!silent) alert('Не удалось подключиться к комнате');
            this.currentRoomId = null;
            return false;
        });
    },

    afterSuccessfulJoin(roomId, password) {
        this.saveRoomCredentials(roomId, password);
        if (this.options.page !== 'auth.html') this.setRoomUrl(roomId);
        this.updateRoomUI();
        if (typeof updateConnectionStatus === 'function') updateConnectionStatus(true);
        if (typeof renderTabs === 'function') renderTabs();
        if (typeof renderAll === 'function') renderAll();
        if (typeof renderSettingsSection === 'function') renderSettingsSection();
        if (typeof loadShoppingFromRoom === 'function') loadShoppingFromRoom();

        if (this.options.page === 'auth.html' && this.options.autoRedirectOnAuthSuccess) {
            this.redirectAfterAuth();
        }
    },

    setupListener() {
        if (!this.dataRef) return;
        this.dataRef.on('value', snapshot => {
            const saved = snapshot.val();
            if (saved?.data) {
                data = saved.data;
                this.ensureDataStructure();
                if (!currentTab && data.users?.length > 0) currentTab = data.users[0].id;
                if (typeof renderTabs === 'function') renderTabs();
                if (typeof renderAll === 'function') renderAll();
                if (typeof renderSettingsSection === 'function') renderSettingsSection();
                if (typeof loadShoppingFromRoom === 'function') loadShoppingFromRoom();
            }
        });
    },

    leaveRoom() {
        if (this.dataRef) this.dataRef.off();
        this.currentRoomId = null;
        data = { users: [], roomPassword: null, shopping: { items: [], templates: [], telegram: { token: '', chatId: '' } } };
        currentTab = null;
        this.removeSavedRoomCredentials();
        this.clearRoomUrl();
        if (typeof updateConnectionStatus === 'function') updateConnectionStatus(false);
        if (typeof renderTabs === 'function') renderTabs();
        if (typeof renderAll === 'function') renderAll();
        if (typeof renderSettingsSection === 'function') renderSettingsSection();
        if (typeof loadShoppingFromRoom === 'function') loadShoppingFromRoom();
        this.redirectToAuth(true);
    },

    openChangePasswordModal() {
        if (!this.currentRoomId) return alert('Сначала подключитесь к комнате');
        const modal = document.getElementById('changePasswordModal');
        if (!modal) return alert('Модальное окно не найдено');
        modal.classList.remove('hidden');
        const input = document.getElementById('newRoomPasswordInput');
        if (input) input.value = '';
    },

    closeChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.classList.add('hidden');
    },

    confirmChangeRoomPassword() {
        const input = document.getElementById('newRoomPasswordInput');
        if (!input) return;
        const newPassword = input.value.trim();
        if (!newPassword) return alert('Введите новый пароль');
        if (!this.currentRoomId || !this.dataRef) return alert('Комната не подключена');
        data.roomPassword = newPassword;
        this.closeChangePasswordModal();
        syncData();
        this.saveRoomCredentials(this.currentRoomId, newPassword);
        alert('Пароль обновлён');
    },

    saveRoomCredentials(roomId, password) {
        localStorage.setItem('familyRoomId', roomId);
        if (password) localStorage.setItem('familyRoomPassword', password);
        this.updateNavigationLinks();
    },

    removeSavedRoomCredentials() {
        localStorage.removeItem('familyRoomId');
        localStorage.removeItem('familyRoomPassword');
        this.updateNavigationLinks();
    },

    setRoomUrl(roomId) {
        if (this.options.page === 'auth.html') return;
        const url = new URL(window.location.href);
        url.searchParams.set('room', roomId);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        this.updateNavigationLinks();
    },

    clearRoomUrl() {
        if (this.options.page === 'auth.html') return;
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        this.updateNavigationLinks();
    },

    updateNavigationLinks() {
        const links = document.querySelectorAll('[data-room-link]');
        links.forEach(link => {
            const target = link.getAttribute('data-room-link');
            if (!target) return;
            const url = new URL(target, window.location.origin);
            if (this.currentRoomId) url.searchParams.set('room', this.currentRoomId);
            else url.searchParams.delete('room');
            link.href = url.pathname.replace(window.location.origin, '') + url.search;
        });
    },

    updateRoomUI() {
        this.updateNavigationLinks();
        const info = document.getElementById('roomInfo');
        if (!info) return;
        if (this.currentRoomId) {
            info.classList.remove('hidden');
            const idEl = document.getElementById('currentRoomId');
            if (idEl) idEl.textContent = this.currentRoomId;
        } else {
            info.classList.add('hidden');
        }
    },

    copyRoomLink() {
        if (!this.currentRoomId) return alert('Комната не подключена');
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.currentRoomId);
        navigator.clipboard.writeText(url.href).then(() => alert('Ссылка скопирована!'));
    },

    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }
};
