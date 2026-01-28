// Главный файл инициализации
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация
    initEventListeners();
    initServerStatus();
    initSocketHandlers();
    
    // Показываем соответствующий экран
    if (auth.currentUser) {
        auth.showScreen('profile-screen');
        loadUserProfile();
    } else {
        auth.showScreen('welcome-screen');
    }
});

// Состояние приложения
const appState = {
    currentRoom: null,
    roomPlayers: [],
    isReady: false,
    isCreator: false,
    gameState: null,
    roomsList: [],
    roomsUpdateTimeout: null,
    // ⭐ ДОБАВЛЕНО: Локальное хранилище комнат
    localRooms: new Map()
};

// ⭐ ИСПРАВЛЕНО: Проверяем, не объявлен ли уже api
if (typeof window.api === 'undefined') {
    // ⭐ ДОБАВЛЕНО: Простой API объект для совместимости
    window.api = {
        async getUser(userId) {
            try {
                // Если есть аутентификация, используем ее данные
                if (auth.currentUser) {
                    return {
                        success: true,
                        user: auth.currentUser
                    };
                }
                
                // Или просто возвращаем базовые данные
                const token = localStorage.getItem('detective_token');
                if (token) {
                    const response = await fetch('/api/user/profile', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        return await response.json();
                    }
                }
                
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            } catch (error) {
                console.error('API getUser error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        async getLeaderboard(limit = 10) {
            try {
                const response = await fetch(`/api/leaderboard?limit=${limit}`);
                if (response.ok) {
                    return await response.json();
                }
                return {
                    success: false,
                    error: 'Ошибка загрузки рейтинга'
                };
            } catch (error) {
                console.error('API getLeaderboard error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        async checkHealth() {
            try {
                const response = await fetch('/api/health');
                if (response.ok) {
                    return await response.json();
                }
                return {
                    status: 'error',
                    message: 'Сервер не отвечает'
                };
            } catch (error) {
                console.error('API health check error:', error);
                return {
                    status: 'offline',
                    message: error.message
                };
            }
        }
    };
}

// ⭐ ИСПРАВЛЕНО: Упрощенная функция загрузки профиля
async function loadUserProfile() {
    if (!auth.currentUser) return;
    
    try {
        // Используем данные из auth.currentUser напрямую
        const user = auth.currentUser;
        
        // Обновляем UI
        document.getElementById('profile-username').textContent = user.display_name || user.username;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-rating').textContent = user.rating || 1000;
        document.getElementById('profile-rank').textContent = user.rank?.name || 'Новичок';
        
        document.getElementById('stat-games').textContent = user.games_played || 0;
        document.getElementById('stat-wins').textContent = user.games_won || 0;
        document.getElementById('stat-winrate').textContent = `${user.win_rate || 0}%`;
        
        if (user.best_time) {
            const minutes = Math.floor(user.best_time / 60);
            const seconds = user.best_time % 60;
            document.getElementById('stat-best-time').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        console.log('[DEBUG] Профиль загружен из auth.currentUser');
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

function initEventListeners() {
    // Навигация
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        auth.showScreen(auth.currentUser ? 'profile-screen' : 'welcome-screen');
    });
    
    document.getElementById('nav-lobby').addEventListener('click', async (e) => {
        e.preventDefault();
        await enterLobby();
    });
    
    document.getElementById('nav-leaderboard').addEventListener('click', async (e) => {
        e.preventDefault();
        auth.showScreen('leaderboard-screen');
        await loadLeaderboard();
    });
    
    document.getElementById('nav-profile').addEventListener('click', (e) => {
        e.preventDefault();
        auth.showScreen('profile-screen');
    });
    
    document.getElementById('nav-logout').addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
    });
    
    // Кнопки на главной
    document.getElementById('show-login-btn').addEventListener('click', () => {
        auth.showScreen('login-screen');
    });
    
    document.getElementById('show-register-btn').addEventListener('click', () => {
        auth.showScreen('register-screen');
    });
    
    document.getElementById('quick-play-btn').addEventListener('click', () => {
        // Быстрый старт игры (создание комнаты с рандомным названием)
        if (auth.currentUser) {
            quickStartGame();
        } else {
            auth.showNotification('Войдите в систему для игры', 'info');
            auth.showScreen('login-screen');
        }
    });
    
    // Форма входа
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const loginBtn = e.target.querySelector('button[type="submit"]');
        const originalText = loginBtn.innerHTML;
        
        try {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
            loginBtn.disabled = true;
            
            await auth.login(email, password);
        } catch (error) {
            // Ошибка уже обработана в auth.login()
        } finally {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    });
    
    // Форма регистрации
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('register-email').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        // Проверка паролей
        if (password !== passwordConfirm) {
            auth.showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        const registerBtn = e.target.querySelector('button[type="submit"]');
        const originalText = registerBtn.innerHTML;
        
        try {
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
            registerBtn.disabled = true;
            
            await auth.register(email, username, password);
        } catch (error) {
            // Ошибка уже обработана в auth.register()
        } finally {
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
    });
    
    // Переключение между формами
    document.getElementById('show-register-from-login').addEventListener('click', (e) => {
        e.preventDefault();
        auth.showScreen('register-screen');
    });
    
    document.getElementById('show-login-from-register').addEventListener('click', (e) => {
        e.preventDefault();
        auth.showScreen('login-screen');
    });
    
    // Кнопки "Назад"
    document.getElementById('back-to-welcome-from-login').addEventListener('click', () => {
        auth.showScreen('welcome-screen');
    });
    
    document.getElementById('back-to-welcome-from-register').addEventListener('click', () => {
        auth.showScreen('welcome-screen');
    });
    
    document.getElementById('back-from-leaderboard').addEventListener('click', () => {
        auth.showScreen(auth.currentUser ? 'profile-screen' : 'welcome-screen');
    });
    
    // Переключение видимости пароля
    document.getElementById('toggle-login-password').addEventListener('click', function() {
        togglePasswordVisibility('login-password', this);
    });
    
    document.getElementById('toggle-register-password').addEventListener('click', function() {
        togglePasswordVisibility('register-password', this);
    });
    
    // ===== ПРОФИЛЬ =====
    
    document.getElementById('enter-lobby-btn').addEventListener('click', async () => {
        await enterLobby();
    });
    
    document.getElementById('create-room-btn').addEventListener('click', () => {
        showCreateRoomModal();
    });
    
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        auth.showNotification('Редактирование профиля в разработке', 'info');
    });
    
    // ===== ЛОББИ =====
    
    document.getElementById('refresh-rooms-btn').addEventListener('click', async () => {
        await loadRoomsList();
    });
    
    document.getElementById('back-to-profile-btn').addEventListener('click', () => {
        auth.showScreen('profile-screen');
        leaveCurrentRoom();
    });
    
    document.getElementById('create-room-btn-lobby').addEventListener('click', () => {
        createRoomFromLobby();
    });
    
    // Модальное окно создания комнаты
    document.getElementById('modal-room-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-room-form').dispatchEvent(new Event('submit'));
        }
    });
    
    document.getElementById('create-room-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createRoomFromModal();
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('create-room-modal');
        });
    });
    
    // ===== КОМНАТА =====
    
    document.getElementById('leave-room-btn').addEventListener('click', () => {
        leaveCurrentRoom();
    });
    
    document.getElementById('ready-btn').addEventListener('click', () => {
        toggleReadyStatus();
    });
    
    document.getElementById('start-game-btn').addEventListener('click', () => {
        startCurrentGame();
    });
    
    document.getElementById('send-chat-btn').addEventListener('click', () => {
        sendChatMessage();
    });
    
    document.getElementById('chat-input-field').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // ===== ИГРА =====
    
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        leaveCurrentGame();
    });
    
    document.getElementById('send-game-chat-btn').addEventListener('click', () => {
        sendGameChatMessage();
    });
    
    document.getElementById('game-chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendGameChatMessage();
        }
    });
    
    document.getElementById('vote-btn').addEventListener('click', () => {
        showVoteModal();
    });
    
    document.getElementById('examine-btn').addEventListener('click', () => {
        examineClue();
    });
    
    // Обновление лидерборда
    document.getElementById('refresh-leaderboard').addEventListener('click', async () => {
        await loadLeaderboard();
    });
}

function initSocketHandlers() {
    const socket = window.socketManager;
    
    // Успешное подключение
    socket.on('socket:connected', () => {
        console.log('Socket connected');
    });
    
    // Аутентификация успешна
    socket.on('auth:success', (data) => {
        // Обновляем профиль если показываем
        if (document.getElementById('profile-screen').classList.contains('active')) {
            loadUserProfile();
        }
    });
    
    // Комната создана
    socket.on('room:created', (data) => {
        console.log('[DEBUG] Комната создана:', data);
        appState.currentRoom = data.roomId;
        appState.isCreator = true;
        updateRoomUI(data.room);
        showActiveRoomSection();
        auth.showNotification('Комната создана!', 'success');
        
        // ⭐ ИСПРАВЛЕНО: Сохраняем комнату в локальное хранилище
        if (data.room) {
            appState.localRooms.set(data.roomId, data.room);
            console.log('[DEBUG] Комната сохранена в локальное хранилище');
        }
        
        // ⭐ ИСПРАВЛЕНО: Отправляем уведомление через socketManager
        if (window.socketManager && window.socketManager.socket) {
            window.socketManager.socket.emit('broadcast_room_update', {
                action: 'created',
                room: data.room
            });
            console.log('[DEBUG] Отправлено broadcast уведомление о комнате');
        }
    });
    
    // Обновление комнаты
    socket.on('room:updated', (data) => {
        updateRoomUI(data);
        appState.roomPlayers = data.players || [];
        
        // Проверяем, все ли игроки готовы
        const allReady = data.players?.every(p => p.isReady) || false;
        updateReadyButton(allReady);
        
        // Показываем/скрываем кнопку "Начать игру"
        const startBtn = document.getElementById('start-game-btn');
        if (appState.isCreator && data.players?.length >= 2 && allReady) {
            startBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'none';
        }
    });
    
    // Игрок присоединился
    socket.on('room:player_joined', (data) => {
        addChatMessage(`${data.player.name} присоединился к комнате`, 'system');
        updateRoomPlayers(data.players);
    });
    
    // Игрок вышел
    socket.on('room:player_left', (data) => {
        addChatMessage(`${data.playerName} покинул комнату`, 'system');
        updateRoomPlayers(data.players);
        
        // Обновляем создателя если нужно
        if (data.newCreatorId === auth.currentUser?.userId) {
            appState.isCreator = true;
            document.getElementById('start-game-btn').style.display = 'block';
        }
    });
    
    // Игрок готов
    socket.on('room:player_ready', (data) => {
        const status = data.isReady ? 'готов' : 'не готов';
        addChatMessage(`${data.playerName} ${status}`, 'system');
        updateRoomPlayers(data.players);
    });
    
    // Все игроки готовы
    socket.on('room:all_ready', (data) => {
        addChatMessage('Все игроки готовы! Создатель может начать игру.', 'system');
        if (appState.isCreator) {
            auth.showNotification('Все игроки готовы! Нажмите "Начать игру"', 'success');
        }
    });
    
    // Сообщение в чат
    socket.on('room:chat_message', (data) => {
        addChatMessage(data.message, 'player', data.playerName);
    });
    
    // Обновление списка комнат
    socket.on('rooms:updated', (data) => {
        console.log('[DEBUG] Получено обновление комнат:', data);
        
        if (data.action === 'created' && data.room) {
            // ⭐ ИСПРАВЛЕНО: Сохраняем комнату и показываем
            appState.localRooms.set(data.room.id, data.room);
            console.log('[DEBUG] Получена новая комната от другого игрока:', data.room.name);
            
            // Обновляем UI если мы в лобби
            if (document.getElementById('lobby-screen').classList.contains('active')) {
                addNewRoomToList(data.room);
                auth.showNotification(`Создана новая комната: ${data.room.name}`, 'info');
            }
        } else if (data.action === 'updated' && data.room) {
            // Обновляем существующую комнату
            updateRoomInList(data.room);
        } else if (data.action === 'deleted' && data.roomId) {
            // Удаляем комнату из списка
            removeRoomFromList(data.roomId);
            appState.localRooms.delete(data.roomId);
        }
    });
    
    // ⭐ ДОБАВЛЕНО: Обработчик прямого события о новой комнате
    socket.on('room:new', (roomData) => {
        console.log('[DEBUG] Прямое событие о новой комнате:', roomData);
        if (roomData && roomData.id) {
            appState.localRooms.set(roomData.id, roomData);
            
            if (document.getElementById('lobby-screen').classList.contains('active')) {
                addNewRoomToList(roomData);
            }
        }
    });
    
    // Игра начинается
    socket.on('game:starting', (data) => {
        auth.showNotification(`Игра начинается через ${data.countdown}...`, 'success');
        startGameCountdown(data.countdown);
    });
    
    // Обратный отсчет
    socket.on('game:countdown', (data) => {
        updateGameCountdown(data.countdown);
    });
    
    // Игра началась
    socket.on('game:started', (data) => {
        startGame(data);
    });
    
    // Ошибки подключения
    socket.on('socket:error', (data) => {
        console.error('Socket error:', data);
    });
    
    socket.on('socket:connection_failed', (data) => {
        auth.showNotification('Не удалось подключиться к игровому серверу', 'error');
    });
}

// ===== ФУНКЦИИ ЛОББИ =====

async function enterLobby() {
    try {
        // Подключаемся к WebSocket если не подключены
        await socketManager.checkConnection();
        
        // Показываем экран лобби
        auth.showScreen('lobby-screen');
        
        // Загружаем список комнат из локального хранилища
        showLocalRooms();
        
        // Запускаем автообновление комнат (только для WebSocket событий)
        startRoomsAutoRefresh();
        
    } catch (error) {
        auth.showNotification(`Ошибка входа в лобби: ${error.message}`, 'error');
        console.error('Ошибка входа в лобби:', error);
    }
}

// ⭐ ИСПРАВЛЕНО: Упрощенная функция загрузки комнат
async function loadRoomsList() {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) return;
    
    try {
        roomsList.innerHTML = '<div class="loading">Загрузка комнат...</div>';
        console.log('[DEBUG] Пробуем получить комнаты...');
        
        // ⭐ ИЗМЕНЕНО: Просто показываем локальные комнаты
        showLocalRooms();
        
    } catch (error) {
        console.error('[ERROR] Ошибка загрузки комнат:', error);
        
        // Все равно показываем локальные комнаты
        showLocalRooms();
    }
}

// ⭐ ДОБАВЛЕНО: Показ комнат из локального хранилища
function showLocalRooms() {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) return;
    
    const localRooms = Array.from(appState.localRooms.values());
    console.log('[DEBUG] Показываем локальные комнаты:', localRooms.length);
    
    if (localRooms.length === 0) {
        roomsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Нет доступных комнат</p>
                <p class="hint">Создайте новую комнату или подождите, пока кто-то создаст</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    localRooms.forEach(room => {
        html += `
            <div class="room-item" data-room-id="${room.id}">
                <div class="room-info">
                    <div class="room-name">${room.name || 'Без названия'}</div>
                    <div class="room-meta">
                        <span class="room-creator">
                            <i class="fas fa-user"></i> ${room.creator_name || room.creator || 'Игрок'}
                        </span>
                        <span class="room-players-count">
                            <i class="fas fa-users"></i> ${room.player_count || 1}/${room.max_players || 4}
                        </span>
                        <span class="room-status ${room.status || 'waiting'}">
                            ${(room.status || 'waiting') === 'waiting' ? 'Ожидание' : 'Начинается'}
                        </span>
                    </div>
                </div>
                <button class="btn btn-small join-room-btn" data-room-id="${room.id}">
                    <i class="fas fa-door-open"></i> Присоединиться
                </button>
            </div>
        `;
    });
    
    roomsList.innerHTML = html;
    appState.roomsList = localRooms;
    
    // Добавляем обработчики для кнопок присоединения
    document.querySelectorAll('.join-room-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const roomId = e.currentTarget.getAttribute('data-room-id');
            await joinRoom(roomId);
        });
    });
    
    console.log('[DEBUG] Показано локальных комнат:', localRooms.length);
}

// ⭐ ДОБАВЛЕНО: Функция для добавления новой комнаты в список
function addNewRoomToList(roomData) {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) return;
    
    console.log('[DEBUG] Добавление комнаты в список:', roomData.name);
    
    // Убираем сообщение "нет комнат"
    const emptyState = roomsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Проверяем, нет ли уже такой комнаты
    const existingRoom = roomsList.querySelector(`[data-room-id="${roomData.id}"]`);
    if (existingRoom) {
        console.log('[DEBUG] Комната уже есть, обновляем...');
        // Обновляем существующую
        existingRoom.querySelector('.room-name').textContent = roomData.name;
        existingRoom.querySelector('.room-players-count').innerHTML = 
            `<i class="fas fa-users"></i> ${roomData.player_count || 1}/${roomData.max_players || 4}`;
        return;
    }
    
    // Добавляем новую комнату
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    roomElement.setAttribute('data-room-id', roomData.id);
    
    roomElement.innerHTML = `
        <div class="room-info">
            <div class="room-name">${roomData.name || 'Без названия'}</div>
            <div class="room-meta">
                <span class="room-creator">
                    <i class="fas fa-user"></i> ${roomData.creator_name || roomData.creator || 'Игрок'}
                </span>
                <span class="room-players-count">
                    <i class="fas fa-users"></i> ${roomData.player_count || 1}/${roomData.max_players || 4}
                </span>
                <span class="room-status ${roomData.status || 'waiting'}">
                    ${(roomData.status || 'waiting') === 'waiting' ? 'Ожидание' : 'Начинается'}
                </span>
            </div>
        </div>
        <button class="btn btn-small join-room-btn" data-room-id="${roomData.id}">
            <i class="fas fa-door-open"></i> Присоединиться
        </button>
    `;
    
    roomsList.prepend(roomElement); // Добавляем в начало
    
    // Добавляем обработчик
    const joinBtn = roomElement.querySelector('.join-room-btn');
    joinBtn.addEventListener('click', async (e) => {
        const roomId = e.currentTarget.getAttribute('data-room-id');
        await joinRoom(roomId);
    });
    
    // Обновляем локальное хранилище
    appState.localRooms.set(roomData.id, roomData);
    
    console.log('[DEBUG] Комната добавлена в локальное хранилище');
}

// ⭐ ДОБАВЛЕНО: Обновление комнаты в списке
function updateRoomInList(roomData) {
    const roomElement = document.querySelector(`[data-room-id="${roomData.id}"]`);
    if (roomElement) {
        roomElement.querySelector('.room-players-count').innerHTML = 
            `<i class="fas fa-users"></i> ${roomData.player_count || 1}/${roomData.max_players || 4}`;
        
        // Обновляем статус если изменился
        if (roomData.status) {
            const statusElement = roomElement.querySelector('.room-status');
            statusElement.className = `room-status ${roomData.status}`;
            statusElement.textContent = roomData.status === 'waiting' ? 'Ожидание' : 'Начинается';
        }
    }
}

// ⭐ ДОБАВЛЕНО: Удаление комнаты из списка
function removeRoomFromList(roomId) {
    const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
    if (roomElement) {
        roomElement.remove();
        
        // Убираем из локального хранилища
        appState.localRooms.delete(roomId);
        
        // Если список пуст, показываем сообщение
        const roomsList = document.getElementById('rooms-list');
        if (roomsList.children.length === 0) {
            roomsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Нет доступных комнат</p>
                    <p class="hint">Создайте новую комнату или подождите</p>
                </div>
            `;
        }
        
        console.log('[DEBUG] Комната удалена из списка:', roomId);
    }
}

// ⭐ ИЗМЕНЕНО: Автообновление комнат (только для очистки старых комнат)
function startRoomsAutoRefresh() {
    stopRoomsAutoRefresh(); // Очищаем предыдущий
    
    // Только для удаления комнат старше 30 минут
    appState.roomsUpdateTimeout = setInterval(() => {
        if (document.getElementById('lobby-screen').classList.contains('active')) {
            cleanupOldRooms();
        }
    }, 30000); // Каждые 30 секунд
}

// ⭐ ДОБАВЛЕНО: Очистка старых комнат
function cleanupOldRooms() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    for (const [roomId, room] of appState.localRooms) {
        if (room.createdAt && (now - new Date(room.createdAt).getTime() > thirtyMinutes)) {
            console.log('[DEBUG] Удаляем старую комнату:', room.name);
            appState.localRooms.delete(roomId);
            removeRoomFromList(roomId);
        }
    }
}

// ⭐ ДОБАВЛЕНО: Остановка автообновления
function stopRoomsAutoRefresh() {
    if (appState.roomsUpdateTimeout) {
        clearInterval(appState.roomsUpdateTimeout);
        appState.roomsUpdateTimeout = null;
    }
}

// ===== ФУНКЦИИ КОМНАТ =====

function showCreateRoomModal() {
    document.getElementById('modal-room-name').value = '';
    document.getElementById('modal-max-players').value = '4';
    showModal('create-room-modal');
}

async function createRoomFromLobby() {
    const roomName = document.getElementById('room-name-input').value.trim();
    const maxPlayers = document.getElementById('room-max-players').value;
    
    if (!roomName) {
        auth.showNotification('Введите название комнаты', 'error');
        return;
    }
    
    await createRoom(roomName, parseInt(maxPlayers));
}

async function createRoomFromModal() {
    const roomName = document.getElementById('modal-room-name').value.trim();
    const maxPlayers = document.getElementById('modal-max-players').value;
    
    if (!roomName) {
        auth.showNotification('Введите название комнаты', 'error');
        return;
    }
    
    hideModal('create-room-modal');
    await createRoom(roomName, parseInt(maxPlayers));
}

async function createRoom(roomName, maxPlayers) {
    try {
        auth.showNotification('Создание комнаты...', 'info');
        console.log('[DEBUG] Создание комнаты:', { roomName, maxPlayers });
        
        const result = await socketManager.createRoom(roomName, maxPlayers);
        
        if (result.success) {
            console.log('[DEBUG] Комната успешно создана:', result);
            
            // Добавляем в локальное хранилище
            if (result.room) {
                const roomData = {
                    ...result.room,
                    createdAt: new Date().toISOString(),
                    creator_name: auth.currentUser?.username || 'Игрок'
                };
                appState.localRooms.set(result.roomId, roomData);
                console.log('[DEBUG] Комната добавлена в локальное хранилище');
            }
        }
    } catch (error) {
        console.error('[ERROR] Ошибка создания комнаты:', error);
        auth.showNotification(`Ошибка создания комнаты: ${error.message}`, 'error');
    }
}

async function joinRoom(roomId) {
    try {
        auth.showNotification('Присоединение к комнате...', 'info');
        const result = await socketManager.joinRoom(roomId);
        
        if (result.success) {
            appState.currentRoom = roomId;
            appState.isCreator = result.room.isCreator || false;
            updateRoomUI(result.room);
            showActiveRoomSection();
            auth.showNotification('Вы присоединились к комнате', 'success');
        }
    } catch (error) {
        auth.showNotification(`Ошибка присоединения: ${error.message}`, 'error');
    }
}

function showActiveRoomSection() {
    const activeRoomSection = document.getElementById('active-room-section');
    const createRoomSection = document.querySelector('.create-room-section');
    const roomsSection = document.querySelector('.rooms-section');
    
    activeRoomSection.classList.remove('hidden');
    createRoomSection.style.display = 'none';
    roomsSection.style.display = 'none';
    
    // Останавливаем автообновление при входе в комнату
    stopRoomsAutoRefresh();
}

function hideActiveRoomSection() {
    const activeRoomSection = document.getElementById('active-room-section');
    const createRoomSection = document.querySelector('.create-room-section');
    const roomsSection = document.querySelector('.rooms-section');
    
    activeRoomSection.classList.add('hidden');
    createRoomSection.style.display = 'block';
    roomsSection.style.display = 'block';
    
    // Очищаем состояние комнаты
    appState.currentRoom = null;
    appState.roomPlayers = [];
    appState.isReady = false;
    appState.isCreator = false;
    
    document.getElementById('players-grid').innerHTML = '';
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('chat-input-field').value = '';
    document.getElementById('ready-btn').innerHTML = '<i class="fas fa-check"></i> Готов';
    document.getElementById('start-game-btn').style.display = 'none';
    
    // Запускаем автообновление при выходе из комнаты
    if (document.getElementById('lobby-screen').classList.contains('active')) {
        startRoomsAutoRefresh();
        showLocalRooms(); // Обновляем список
    }
}

function updateRoomUI(roomData) {
    if (!roomData) return;
    
    // Обновляем заголовок комнаты
    document.getElementById('room-title').textContent = roomData.name || 'Комната';
    
    // Обновляем список игроков
    updateRoomPlayers(roomData.players);
    
    // Проверяем, готов ли текущий игрок
    const currentUserId = auth.currentUser?.userId;
    if (currentUserId) {
        const currentPlayer = roomData.players?.find(p => p.id === currentUserId);
        appState.isReady = currentPlayer?.isReady || false;
        
        // Обновляем кнопку готовности
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.innerHTML = appState.isReady 
            ? '<i class="fas fa-times"></i> Не готов' 
            : '<i class="fas fa-check"></i> Готов';
    }
    
    appState.isCreator = roomData.isCreator || false;
}

function updateRoomPlayers(players) {
    const playersGrid = document.getElementById('players-grid');
    
    if (!players || players.length === 0) {
        playersGrid.innerHTML = '<div class="empty">Нет игроков в комнате</div>';
        return;
    }
    
    let html = '';
    const currentUserId = auth.currentUser?.userId;
    
    players.forEach(player => {
        const isCurrentUser = player.id === currentUserId;
        const isReady = player.isReady || false;
        
        html += `
            <div class="player-card ${isCurrentUser ? 'current' : ''}">
                <div class="player-avatar">
                    <i class="fas fa-user-secret"></i>
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name} ${isCurrentUser ? '(Вы)' : ''}</div>
                    <div class="player-status">
                        ${player.isCreator ? '<i class="fas fa-crown creator-icon"></i> Создатель' : ''}
                        ${isReady ? '<span class="ready-badge"><i class="fas fa-check"></i> Готов</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    playersGrid.innerHTML = html;
}

function updateReadyButton(allReady = false) {
    const readyBtn = document.getElementById('ready-btn');
    
    if (allReady && appState.isCreator) {
        readyBtn.innerHTML = '<i class="fas fa-check"></i> Все готовы!';
        readyBtn.disabled = true;
    } else {
        readyBtn.disabled = false;
        readyBtn.innerHTML = appState.isReady 
            ? '<i class="fas fa-times"></i> Не готов' 
            : '<i class="fas fa-check"></i> Готов';
    }
}

function toggleReadyStatus() {
    if (!appState.currentRoom) return;
    
    const newStatus = !appState.isReady;
    socketManager.setReadyStatus(appState.currentRoom, newStatus);
    appState.isReady = newStatus;
}

async function startCurrentGame() {
    if (!appState.currentRoom) return;
    
    try {
        auth.showNotification('Начало игры...', 'info');
        await socketManager.startGame(appState.currentRoom);
    } catch (error) {
        auth.showNotification(`Ошибка начала игры: ${error.message}`, 'error');
    }
}

function leaveCurrentRoom() {
    if (!appState.currentRoom) return;
    
    socketManager.leaveRoom(appState.currentRoom);
    hideActiveRoomSection();
    auth.showNotification('Вы вышли из комнаты', 'info');
}

function addChatMessage(message, type = 'player', playerName = null) {
    const chatMessages = document.getElementById('chat-messages');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let messageHtml = '';
    
    if (type === 'system') {
        messageHtml = `
            <div class="chat-message system">
                <div class="message-time">${timestamp}</div>
                <div class="message-content">${message}</div>
            </div>
        `;
    } else {
        messageHtml = `
            <div class="chat-message player">
                <div class="message-header">
                    <span class="message-sender">${playerName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-content">${message}</div>
            </div>
        `;
    }
    
    chatMessages.innerHTML += messageHtml;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!appState.currentRoom) {
        auth.showNotification('Вы не в комнате', 'error');
        return;
    }
    
    socketManager.sendChatMessage(appState.currentRoom, message);
    input.value = '';
    input.focus();
}

// ===== ФУНКЦИИ ИГРЫ =====

function startGameCountdown(countdown) {
    const countdownElement = document.createElement('div');
    countdownElement.className = 'game-countdown';
    countdownElement.id = 'countdown-overlay';
    
    let currentCount = countdown;
    countdownElement.innerHTML = `
        <div class="countdown-number">${currentCount}</div>
        <div class="countdown-text">Игра начинается</div>
    `;
    
    document.body.appendChild(countdownElement);
    
    const interval = setInterval(() => {
        currentCount--;
        if (currentCount > 0) {
            countdownElement.querySelector('.countdown-number').textContent = currentCount;
        } else {
            clearInterval(interval);
            countdownElement.remove();
        }
    }, 1000);
}

function updateGameCountdown(countdown) {
    const countdownElement = document.getElementById('countdown-overlay');
    if (countdownElement) {
        countdownElement.querySelector('.countdown-number').textContent = countdown;
    }
}

function startGame(gameData) {
    appState.gameState = gameData;
    
    // Переключаемся на экран игры
    auth.showScreen('game-screen');
    
    // Обновляем информацию о деле
    if (gameData.case) {
        document.getElementById('game-case-title').textContent = gameData.case.title || 'Дело';
        document.getElementById('case-description').textContent = gameData.case.description || 'Загрузка деталей дела...';
    }
    
    // Запускаем таймер игры
    startGameTimer();
    
    auth.showNotification('Игра началась! Удачи в расследовании!', 'success');
}

function startGameTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('game-timer');
    
    const timerInterval = setInterval(() => {
        if (appState.gameState) {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function leaveCurrentGame() {
    if (confirm('Вы уверены, что хотите сдаться?')) {
        appState.gameState = null;
        auth.showScreen('profile-screen');
        auth.showNotification('Вы вышли из игры', 'info');
    }
}

function sendGameChatMessage() {
    const input = document.getElementById('game-chat-input');
    const message = input.value.trim();
    
    if (!message || !appState.currentRoom) return;
    
    socketManager.sendChatMessage(appState.currentRoom, message);
    input.value = '';
    input.focus();
}

function showVoteModal() {
    auth.showNotification('Голосование в разработке', 'info');
}

function examineClue() {
    auth.showNotification('Осмотр улики в разработке', 'info');
}

function quickStartGame() {
    const roomNames = [
        'Экспресс-расследование',
        'Срочное дело',
        'Быстрый детектив',
        'Экспресс-квартет'
    ];
    
    const randomName = roomNames[Math.floor(Math.random() * roomNames.length)];
    createRoom(randomName, 4);
}

// ===== УТИЛИТЫ =====

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // Меняем иконку
    iconElement.classList.toggle('fa-eye');
    iconElement.classList.toggle('fa-eye-slash');
}

async function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body');
    
    try {
        leaderboardBody.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';
        
        const result = await api.getLeaderboard(10);
        
        if (result.success && result.leaderboard) {
            let html = '';
            
            result.leaderboard.forEach((player, index) => {
                const isCurrentUser = auth.currentUser && player.id === auth.currentUser.userId;
                const rowClass = isCurrentUser ? 'player-row current-user' : 'player-row';
                
                html += `
                    <div class="${rowClass}">
                        <div class="rank-col">#${index + 1}</div>
                        <div class="player-col">
                            <div class="player-avatar">
                                <i class="fas fa-user-secret"></i>
                            </div>
                            ${player.display_name}
                            ${isCurrentUser ? ' (Вы)' : ''}
                        </div>
                        <div class="rating-col">${player.rating}</div>
                        <div class="games-col">${player.games || 0}</div>
                        <div class="winrate-col">${player.wins || 0}</div>
                    </div>
                `;
            });
            
            if (result.leaderboard.length === 0) {
                html = '<div class="loading">Пока никто не играл</div>';
            }
            
            leaderboardBody.innerHTML = html;
        }
    } catch (error) {
        leaderboardBody.innerHTML = `<div class="loading error">Ошибка загрузки: ${error.message}</div>`;
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function initServerStatus() {
    const statusElement = document.getElementById('server-status');
    
    async function checkServer() {
        try {
            const health = await api.checkHealth();
            if (health.status === 'ok') {
                statusElement.textContent = 'онлайн';
                statusElement.style.color = '#2ecc71';
            } else {
                statusElement.textContent = 'ошибка';
                statusElement.style.color = '#e74c3c';
            }
        } catch (error) {
            statusElement.textContent = 'оффлайн';
            statusElement.style.color = '#e74c3c';
        }
    }
    
    // Проверяем сразу и затем каждые 30 секунд
    checkServer();
    setInterval(checkServer, 30000);
}

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
    stopRoomsAutoRefresh();
});
