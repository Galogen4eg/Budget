const authPage = {
    init() {
        // Инициализация roomsManager происходит здесь, на странице auth
        roomsManager.init({ page: 'auth.html', requireAuth: false });
        
        // Навешиваем обработчики на формы
        document.getElementById('createRoomForm').addEventListener('submit', this.handleCreateRoom.bind(this));
        document.getElementById('joinRoomForm').addEventListener('submit', this.handleJoinRoom.bind(this));
    },

    async handleCreateRoom(event) {
        event.preventDefault();
        const name = document.getElementById('createName').value.trim();
        const password = document.getElementById('createPassword').value.trim();
        const errorEl = document.getElementById('createError');
        errorEl.classList.add('hidden');
        
        try {
            if (!name || !password) throw new Error('Введите имя и пароль');
            const roomId = await roomsManager.createRoomWithPassword(password, name);
            // Редирект произойдёт автоматически в afterSuccessfulJoin
        } catch (e) {
            errorEl.textContent = e.message || 'Не удалось создать комнату';
            errorEl.classList.remove('hidden');
        }
    },

    async handleJoinRoom(event) {
        event.preventDefault();
        const name = document.getElementById('joinName').value.trim();
        const roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
        const password = document.getElementById('joinRoomPassword').value.trim();
        const errorEl = document.getElementById('joinError');
        errorEl.classList.add('hidden');
        
        try {
            if (!name || !roomId || !password) throw new Error('Введите имя, ID и пароль комнаты');
            await roomsManager.joinRoomWithCredentials(roomId, password, name);
            // Редирект произойдёт автоматически в afterSuccessfulJoin
        } catch (e) {
            errorEl.textContent = e.message || 'Неверный ID или пароль';
            errorEl.classList.remove('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => authPage.init());
