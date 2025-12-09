const authPage = {
    init() {
        roomsManager.init({ page: 'auth.html', requireAuth: false, autoRedirectOnAuthSuccess: true });
        const createInput = document.getElementById('authCreatePassword');
        const roomInput = document.getElementById('authRoomId');
        const passInput = document.getElementById('authRoomPassword');
        [createInput, roomInput, passInput].forEach(input => {
            if (!input) return;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (input === createInput) this.createRoom();
                    else this.joinRoom();
                }
            });
        });
    },

    async createRoom() {
        const input = document.getElementById('authCreatePassword');
        const password = input?.value.trim();
        if (!password) return alert('Введите пароль');
        try {
            await roomsManager.createRoomWithPassword(password);
            input.value = '';
        } catch (e) {
            console.error(e);
            alert(e.message || 'Не удалось создать комнату');
        }
    },

    async joinRoom() {
        const idInput = document.getElementById('authRoomId');
        const passInput = document.getElementById('authRoomPassword');
        const errorEl = document.getElementById('authJoinError');
        const roomId = idInput?.value.trim().toUpperCase();
        const password = passInput?.value;
        if (!roomId || !password) {
            errorEl?.classList.remove('hidden');
            return;
        }
        try {
            const success = await roomsManager.joinRoomWithCredentials(roomId, password);
            if (!success) throw new Error('Неверный ID или пароль');
            idInput.value = '';
            passInput.value = '';
            errorEl?.classList.add('hidden');
        } catch (e) {
            errorEl?.classList.remove('hidden');
            setTimeout(() => errorEl?.classList.add('hidden'), 3000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => authPage.init());
