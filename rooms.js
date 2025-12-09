const roomsManager = {
    currentRoomId: null,
    currentUserName: null,
    dataRef: null,
    data: {
        users: [],
        shopping: { items: [], templates: [] }
    },
    savedRoomId: null,
    savedPassword: null,
    savedUserName: null,
    isAuthPage: false,
    isProtectedPage: false,
    isRedirecting: false,

    init(options = {}) {
        this.page = options.page || this._getPage();
        this.isAuthPage = this.page === 'auth.html';
        this.isProtectedPage = !this.isAuthPage;
        this.requireAuth = options.requireAuth !== false;
        this._checkSavedCredentials();

        if (this.isAuthPage) {
            this._initAuthPage();
        } else {
            this._initProtectedPage();
        }
    },

    createRoomWithPassword(password, userName) {
        if (!password || !userName) {
            return Promise.reject(new Error('Введите имя и пароль комнаты'));
        }
        const roomId = this._generateRoomId();
        this.currentRoomId = roomId;
        this.currentUserName = userName;
        this.data = {
            users: [],
            shopping: { items: [], templates: [] }
        };
        this._ensureUser(userName);
        this._persistRoom({ roomPassword: password });
        this._saveCredentials(roomId, password, userName);
        this._redirectToTargetPage(roomId);
        return Promise.resolve(roomId);
    },

    joinRoomWithCredentials(roomId, password, userName) {
        if (!roomId || !password || !userName) {
            return Promise.reject(new Error('Введите ID комнаты, пароль и имя')); 
        }
        this.currentUserName = userName;
        return this.joinRoomById(roomId, password, { redirect: true });
    },

    joinRoomById(roomId, password, options = {}) {
        const { redirect = true, silent = false } = options;
        if (!roomId || !password) return Promise.reject(new Error('Нет идентификатора комнаты'));
        this.currentRoomId = roomId;
        this._saveCredentials(roomId, password, this.currentUserName);
        this._persistRoom({ roomPassword: password });

        return new Promise((resolve, reject) => {
            if (!window.firebase?.database) {
                return reject(new Error('Firebase не настроен'));
            }
            if (this.dataRef) this.dataRef.off();
            this.dataRef = firebase.database().ref('family/' + roomId);
            this.dataRef.once('value').then(snapshot => {
                const payload = snapshot.val?.()?.data || { users: [], shopping: { items: [], templates: [] } };
                this.data = payload;
                this._ensureUser(this.currentUserName);
                if (redirect && this.isAuthPage) {
                    this._redirectToTargetPage(roomId);
                }
                resolve(roomId);
            }).catch(err => {
                if (!silent) this._redirectToAuth();
                reject(err);
            });
        });
    },

    leaveRoom() {
        if (this.dataRef) {
            this.dataRef.off();
            this.dataRef = null;
        }
        this.currentRoomId = null;
        this.currentUserName = null;
        this.data = { users: [], shopping: { items: [], templates: [] } };
        this._clearSavedCredentials();
        this._redirectToAuth(true);
    },

    _initAuthPage() {
        if (this.savedRoomId && this.savedPassword && this.savedUserName) {
            if (!sessionStorage.getItem('rooms_authed')) {
                this.joinRoomById(this.savedRoomId, this.savedPassword, { redirect: true, silent: true })
                    .then(() => sessionStorage.setItem('rooms_authed', '1'))
                    .catch(() => {
                        this._clearSavedCredentials();
                        sessionStorage.removeItem('rooms_authed');
                    });
            }
        }
    },

    _initProtectedPage() {
        if (!this.savedRoomId || !this.savedPassword || !this.savedUserName) {
            this._redirectToAuth();
            return;
        }
        this.currentUserName = this.savedUserName;
        this.joinRoomById(this.savedRoomId, this.savedPassword, { redirect: false, silent: true })
            .catch(() => this._redirectToAuth());
    },

    _redirectToAuth(force = false) {
        if (this.isAuthPage && !force) return;
        if (this.isRedirecting) return;
        this.isRedirecting = true;
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = 'auth.html?next=' + next;
    },

    _redirectToTargetPage(roomId) {
        const urlHasRoom = window.location.search.includes('?room=');
        const basePath = window.location.origin + window.location.pathname;
        const nextParam = new URLSearchParams(window.location.search).get('next');
        const target = nextParam ? decodeURIComponent(nextParam) : (urlHasRoom ? window.location.pathname + window.location.search : '/index.html');
        const separator = target.includes('?') ? '&' : '?';
        const dest = target.split('?')[0] + '?room=' + roomId;
        window.location.href = dest;
    },

    _ensureUser(name) {
        if (!name) return;
        if (!Array.isArray(this.data.users)) this.data.users = [];
        const exists = this.data.users.find(u => u.name === name);
        if (!exists) {
            this.data.users.push({ id: 'user_' + Date.now(), name, settings: { savingsPercent: 0 }, fixedPayments: [], expenses: [], incomes: [], customCategories: [] });
        }
        this._syncData();
    },

    _persistRoom(payload) {
        if (!window.firebase?.database || !this.currentRoomId) return;
        const ref = firebase.database().ref('family/' + this.currentRoomId);
        ref.set({ data: this.data, roomPassword: payload?.roomPassword || null, lastUpdated: firebase.database.ServerValue.TIMESTAMP });
    },

    _syncData() {
        if (!window.firebase?.database || !this.currentRoomId) return;
        const ref = firebase.database().ref('family/' + this.currentRoomId);
        ref.update({ data: this.data, lastUpdated: firebase.database.ServerValue.TIMESTAMP });
    },

    _saveCredentials(roomId, password, userName) {
        localStorage.setItem('budgetRoomId', roomId);
        localStorage.setItem('budgetRoomPassword', password);
        localStorage.setItem('budgetUserName', userName);
        this.savedRoomId = roomId;
        this.savedPassword = password;
        this.savedUserName = userName;
    },

    _checkSavedCredentials() {
        this.savedRoomId = localStorage.getItem('budgetRoomId');
        this.savedPassword = localStorage.getItem('budgetRoomPassword');
        this.savedUserName = localStorage.getItem('budgetUserName');
    },

    _clearSavedCredentials() {
        localStorage.removeItem('budgetRoomId');
        localStorage.removeItem('budgetRoomPassword');
        localStorage.removeItem('budgetUserName');
        this.savedRoomId = null;
        this.savedPassword = null;
        this.savedUserName = null;
    },

    _getPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    },

    _generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};

window.roomsManager = roomsManager;
