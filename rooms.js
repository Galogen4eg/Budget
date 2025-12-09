// ======== УПРАВЛЕНИЕ КОМНАТАМИ ========
const roomsManager = {
    currentRoomId: null,
    dataRef: null,
    pendingRoomId: null,

    ensureDataStructure() {
        if (!data || typeof data !== 'object') data = { users: [], roomPassword: null, shopping: { items: [], templates: [] } };
        if (!Array.isArray(data.users)) data.users = [];
        if (!data.shopping || typeof data.shopping !== 'object') data.shopping = { items: [], templates: [] };
        if (!Array.isArray(data.shopping.items)) data.shopping.items = [];
        if (!Array.isArray(data.shopping.templates)) data.shopping.templates = [];
    },

    init() {
        this.ensureDataStructure();
        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        const savedRoomId = localStorage.getItem('familyRoomId');
        const savedRoomPassword = localStorage.getItem('familyRoomPassword');

        if (roomFromUrl) {
            this.joinRoomById(roomFromUrl, savedRoomPassword || '', false, true);
        } else if (savedRoomId && savedRoomPassword) {
            this.joinRoomById(savedRoomId, savedRoomPassword, false, true);
        }
    },

    createRoom() {
        document.getElementById('createRoomModal').classList.remove('hidden');
        document.getElementById('newRoomPassword').value = '';
    },

    closeCreateRoomModal() {
        document.getElementById('createRoomModal').classList.add('hidden');
    },

    confirmCreateRoom() {
        const password = document.getElementById('newRoomPassword').value.trim();
        if (!password) return alert('Введите пароль');
        const roomId = this.generateRoomId();
        data.roomPassword = password;
        this.closeCreateRoomModal();
        this.joinRoomById(roomId, password, true);
        this.saveRoomCredentials(roomId, password);
        this.setRoomUrl(roomId);
    },

    joinRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim().toUpperCase();
        if (!roomId) return;
        this.pendingRoomId = roomId;
        document.getElementById('passwordModal').classList.remove('hidden');
        document.getElementById('roomPassword').value = '';
        document.getElementById('passwordError').classList.add('hidden');
    },

    closePasswordModal() {
        document.getElementById('passwordModal').classList.add('hidden');
        this.pendingRoomId = null;
    },

    confirmPassword() {
        const password = document.getElementById('roomPassword').value;
        this.joinRoomById(this.pendingRoomId, password, false);
    },

    joinRoomById(roomId, password, isNew = false, silent = false) {
        if (!db) return alert('Firebase недоступен');
        this.currentRoomId = roomId;
        this.saveRoomCredentials(roomId, password);
        this.setRoomUrl(roomId);
        this.dataRef = db.ref('family/' + roomId);
        this.dataRef.once('value').then(snapshot => {
            const saved = snapshot.val();
            if (isNew) {
                this.ensureDataStructure();
                this.dataRef.set({ data, lastUpdated: firebase.database.ServerValue.TIMESTAMP });
                this.setupListener();
            } else {
                if (saved?.data?.roomPassword && saved.data.roomPassword !== password) {
                    if (!silent) document.getElementById('passwordError').classList.remove('hidden');
                    else this.removeSavedRoomCredentials();
                    return;
                }
                this.closePasswordModal();
                data = saved?.data || { users: [], roomPassword: password, shopping: { items: [], templates: [] } };
                this.ensureDataStructure();
                this.setupListener();
            }
            this.updateRoomUI();
            updateConnectionStatus(true);
            if (data.users?.length > 0) currentTab = data.users[0].id;
            this.saveRoomCredentials(roomId, password);
            this.setRoomUrl(roomId);
            renderTabs();
            renderAll();
            renderSettingsSection();
        }).catch(() => {
            if (silent) this.removeSavedRoomCredentials();
        });
    },

    setupListener() {
        if (!this.dataRef) return;
        this.dataRef.on('value', snapshot => {
            const saved = snapshot.val();
            if (saved?.data) {
                data = saved.data;
                if (!currentTab && data.users?.length > 0) currentTab = data.users[0].id;
                renderTabs();
                renderAll();
                renderSettingsSection();
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
        this.updateRoomUI();
        updateConnectionStatus(false);
        renderTabs();
        renderAll();
        renderSettingsSection();
    },

    openChangePasswordModal() {
        if (!this.currentRoomId) return alert('Сначала подключитесь к комнате');
        document.getElementById('changePasswordModal').classList.remove('hidden');
        document.getElementById('newRoomPasswordInput').value = '';
    },

    closeChangePasswordModal() {
        document.getElementById('changePasswordModal').classList.add('hidden');
    },

    confirmChangeRoomPassword() {
        const newPassword = document.getElementById('newRoomPasswordInput').value.trim();
        if (!newPassword) return alert('Введите новый пароль');
        if (!this.currentRoomId || !this.dataRef) return alert('Комната не подключена');
        data.roomPassword = newPassword;
        this.closeChangePasswordModal();
        syncData();
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
        const base = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState(null, '', `${base}?room=${roomId}`);
    },

    clearRoomUrl() {
        const base = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState(null, '', base);
    },

    updateRoomUI() {
        const info = document.getElementById('roomInfo');
        if (this.currentRoomId) {
            info.classList.remove('hidden');
            document.getElementById('currentRoomId').textContent = this.currentRoomId;
        } else {
            info.classList.add('hidden');
        }
    },

    copyRoomLink() {
        if (!this.currentRoomId) return;
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
