// ======== УПРАВЛЕНИЕ КОМНАТАМИ ========
const roomsManager = {
    currentRoomId: null,
    dataRef: null,
    pendingRoomId: null,
    options: {
        page: '',
        requireAuth: false,
        autoRedirectOnAuthSuccess: true
    },

    ensureDataStructure() {
        if (!data || typeof data !== 'object') data = { users: [], roomPassword: null, shopping: { items: [], templates: [] } };
        if (!Array.isArray(data.users)) data.users = [];
        if (!data.shopping || typeof data.shopping !== 'object') data.shopping = { items: [], templates: [] };
        if (!Array.isArray(data.shopping.items)) data.shopping.items = [];
        if (!Array.isArray(data.shopping.templates)) data.shopping.templates = [];
    },

    init(options = {}) {
        this.options = {
            page: options.page || this.getCurrentPageName(),
            requireAuth: !!options.requireAuth,
            autoRedirectOnAuthSuccess: options.autoRedirectOnAuthSuccess !== false
        };

        this.ensureDataStructure();
        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        const savedRoomId = localStorage.getItem('familyRoomId');
        const savedRoomPassword = localStorage.getItem('familyRoomPassword');

        const tryJoin = (id, password, silent = false) => {
            if (!id || !password) return Promise.resolve(false);
            return this.joinRoomById(id, password, false, silent).then(success => {
                if (!success && !silent && this.options.requireAuth) this.redirectToAuth();
                return success;
            });
        };

        if (roomFromUrl && savedRoomPassword) {
            tryJoin(roomFromUrl, savedRoomPassword, true).then(success => {
                if (!success && this.options.requireAuth) this.redirectToAuth();
            });
            return;
        }

        if (savedRoomId && savedRoomPassword) {
            tryJoin(savedRoomId, savedRoomPassword, true).then(success => {
                if (!success && this.options.requireAuth) this.redirectToAuth();
            });
            return;
        }

        if (this.options.requireAuth) {
            this.redirectToAuth();
        } else {
            this.updateRoomUI();
        }
    },

    getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    },

    redirectToAuth() {
        const next = encodeURIComponent(this.options.page || 'index.html');
        window.location.href = `auth.html?next=${next}`;
    },

    redirectAfterAuth() {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || 'index.html';
        const target = `${next}?room=${this.currentRoomId}`;
        window.location.href = target;
    },

    async createRoomWithPassword(password) {
        if (!password) throw new Error('Введите пароль');
        const roomId = this.generateRoomId();
        data.roomPassword = password;
        const success = await this.joinRoomById(roomId, password, true, false);
        if (success === false) throw new Error('Не удалось создать комнату');
        this.saveRoomCredentials(roomId, password);
        return roomId;
    },

    async joinRoomWithCredentials(roomId, password) {
        if (!roomId || !password) throw new Error('Введите ID и пароль');
        const normalizedId = roomId.trim().toUpperCase();
        const success = await this.joinRoomById(normalizedId, password, false, false);
        if (success === false) throw new Error('Неверный ID комнаты или пароль');
        this.saveRoomCredentials(normalizedId, password);
        return normalizedId;
    },

    joinRoomById(roomId, password, isNew = false, silent = false) {
        if (!db) {
            if (!silent) alert('Firebase недоступен');
            return Promise.resolve(false);
        }

        if (this.dataRef) this.dataRef.off();
        this.currentRoomId = roomId;
        this.dataRef = db.ref('family/' + roomId);

        return this.dataRef.once('value').then(snapshot => {
            const saved = snapshot.val();
            if (isNew) {
                this.ensureDataStructure();
                return this.dataRef.set({ data, lastUpdated: firebase.database.ServerValue.TIMESTAMP }).then(() => {
                    this.afterSuccessfulJoin(roomId, password);
                    return true;
                });
            } else {
                if (saved?.data?.roomPassword && saved.data.roomPassword !== password) {
                    if (!silent) alert('Неверный пароль комнаты');
                    this.currentRoomId = null;
                    return false;
                }
                data = saved?.data || { users: [], roomPassword: password, shopping: { items: [], templates: [] } };
                this.ensureDataStructure();
                this.setupListener();
                this.afterSuccessfulJoin(roomId, password);
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
        data = { users: [], roomPassword: null, shopping: { items: [], templates: [] } };
        currentTab = null;
        this.removeSavedRoomCredentials();
        this.clearRoomUrl();
        if (typeof updateConnectionStatus === 'function') updateConnectionStatus(false);
        if (typeof renderTabs === 'function') renderTabs();
        if (typeof renderAll === 'function') renderAll();
        if (typeof renderSettingsSection === 'function') renderSettingsSection();
        if (typeof loadShoppingFromRoom === 'function') loadShoppingFromRoom();
        if (this.options.requireAuth) this.redirectToAuth();
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
    },

    removeSavedRoomCredentials() {
        localStorage.removeItem('familyRoomId');
        localStorage.removeItem('familyRoomPassword');
    },

    setRoomUrl(roomId) {
        if (this.options.page === 'auth.html') return;
        const base = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState(null, '', `${base}?room=${roomId}`);
        this.updateNavigationLinks();
    },

    clearRoomUrl() {
        if (this.options.page === 'auth.html') return;
        const base = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState(null, '', base);
        this.updateNavigationLinks();
    },

    updateNavigationLinks() {
        const links = document.querySelectorAll('[data-room-link]');
        links.forEach(link => {
            const target = link.getAttribute('data-room-link');
            if (!target) return;
            if (this.currentRoomId) {
                link.href = `${target}?room=${this.currentRoomId}`;
            } else {
                link.href = target;
            }
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
        const link = `${window.location.origin}${window.location.pathname}?room=${this.currentRoomId}`;
        navigator.clipboard.writeText(link).then(() => alert('Ссылка скопирована!'));
    },

    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }
};
