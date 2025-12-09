window.data = window.data || {
    users: [],
    roomPassword: null,
    shopping: {
        items: [],
        templates: [],
        telegram: { token: '', chatId: '' }
    }
};

window.firebaseConfig = window.firebaseConfig || {
    databaseURL: 'https://budg-1d5e0-default-rtdb.europe-west1.firebasedatabase.app'
};

window.db = window.db || null;
(function initFirebaseCore() {
    try {
        if (typeof firebase !== 'undefined') {
            if (firebase.apps.length === 0) firebase.initializeApp(window.firebaseConfig);
            window.db = firebase.database();
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }
})();

window.syncData = function syncData() {
    if (window.db && window.roomsManager?.currentRoomId && window.roomsManager.dataRef) {
        window.roomsManager.dataRef.update({ data: window.data, lastUpdated: firebase.database.ServerValue.TIMESTAMP });
    }
};
