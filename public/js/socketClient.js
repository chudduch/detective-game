/**
 * SocketClient.js - общий модуль для работы с WebSocket соединением
 * Управляет подключением к Socket.IO серверу и обработкой событий
 */

const SocketClient = (function() {
    // Конфигурация
    const SOCKET_URL = window.location.origin;
    const RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;
    
    // Состояние
    let socket = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    
    // Коллбэки для событий
    const eventCallbacks = {
        connection: [],
        disconnect: [],
        error: [],
        auth: [],
        rooms: [],
        game: []
    };
    
    // Данные пользователя
    let userData = {
        token: localStorage.getItem('dm_token'),
        username: null,
        userId: null,
        level: 1
    };
    
    /**
     * Инициализация Socket.IO клиента
     */
    function init() {
        if (socket) {
            console.warn('Socket уже инициализирован');
            return;
        }
        
        console.log('🔄 Инициализация Socket.IO клиента...');
        
        // Получаем токен из localStorage
        userData.token = localStorage.getItem('dm_token');
        
        if (!userData.token) {
            console.error('Токен не найден. Пожалуйста, войдите в систему.');
            return;
        }
        
        // Извлекаем данные пользователя из токена (базовая декодировка)
        try {
            const payload = JSON.parse(atob(userData.token.split('.')[1]));
            userData.username = payload.username;
            userData.userId = payload.id;
            userData.level = payload.level || 1;
        } catch (error) {
            console.error('Ошибка декодирования токена:', error);
        }
        
        // Создаем подключение
        connect();
    }
    
    /**
     * Установка соединения с сервером
     */
    function connect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        console.log(`🔗 Подключение к серверу: ${SOCKET_URL}`);
        
        // Создаем Socket.IO клиент
        socket = io(SOCKET_URL, {
            auth: {
                token: userData.token
            },
            transports: ['websocket', 'polling'],
            reconnection: false // Управляем reconnection вручную
        });
        
        // Настройка обработчиков событий
        setupEventHandlers();
    }
    
    /**
     * Настройка обработчиков событий Socket.IO
     */
    function setupEventHandlers() {
        // Событие подключения
        socket.on('connect', () => {
            console.log('✅ Успешно подключен к серверу Socket.IO');
            isConnected = true;
            reconnectAttempts = 0;
            
            // Уведомляем о подключении
            triggerEvent('connection', {
                connected: true,
                socketId: socket.id
            });
            
            // Автоматическая аутентификация при подключении
            authenticate();
        });
        
        // Событие отключения
        socket.on('disconnect', (reason) => {
            console.log(`❌ Отключен от сервера. Причина: ${reason}`);
            isConnected = false;
            
            triggerEvent('disconnect', {
                connected: false,
                reason: reason
            });
            
            // Пытаемся переподключиться
            if (reconnectAttempts < RECONNECT_ATTEMPTS) {
                scheduleReconnect();
            }
        });
        
        // Ошибки подключения
        socket.on('connect_error', (error) => {
            console.error('🚨 Ошибка подключения:', error.message);
            
            triggerEvent('error', {
                type: 'connect_error',
                message: error.message
            });
        });
        
        // Ошибки аутентификации
        socket.on('auth_error', (data) => {
            console.error('🔐 Ошибка аутентификации:', data.message);
            
            triggerEvent('auth', {
                success: false,
                error: data.message
            });
            
            // Если аутентификация не удалась, очищаем localStorage
            localStorage.removeItem('dm_token');
            localStorage.removeItem('dm_user');
            
            // Перенаправляем на страницу входа
            setTimeout(() => {
                if (window.location.pathname !== '/index.html' && 
                    window.location.pathname !== '/') {
                    window.location.href = '/index.html';
                }
            }, 2000);
        });
        
        // Успешная аутентификация
        socket.on('auth:success', (data) => {
            console.log('🔐 Аутентификация успешна:', data.username);
            
            triggerEvent('auth', {
                success: true,
                user: data
            });
        });
        
        // Событие: установлено соединение
        socket.on('connection:established', (data) => {
            console.log('📡 Соединение установлено:', data);
            
            triggerEvent('connection', {
                type: 'established',
                data: data
            });
        });
        
        // Событие: обновление списка комнат
        socket.on('room:list_update', (rooms) => {
            console.log('🚪 Получен список комнат:', rooms.length);
            
            triggerEvent('rooms', {
                type: 'list_update',
                rooms: rooms
            });
        });
        
        // Событие: комната создана
        socket.on('room:created', (room) => {
            console.log('✅ Комната создана:', room.roomId);
            
            triggerEvent('rooms', {
                type: 'created',
                room: room
            });
        });
        
        // Событие: присоединение к комнате
        socket.on('room:joined', (room) => {
            console.log('🚪 Присоединились к комнате:', room.roomId);
            
            triggerEvent('rooms', {
                type: 'joined',
                room: room
            });
        });
        
        // Событие: обновление списка игроков в комнате
        socket.on('room:players_update', (data) => {
            triggerEvent('rooms', {
                type: 'players_update',
                players: data.players,
                readyCount: data.readyCount,
                totalPlayers: data.totalPlayers
            });
        });
        
        // Событие: игрок присоединился
        socket.on('room:player_joined', (data) => {
            console.log(`👤 Игрок присоединился: ${data.username}`);
            
            triggerEvent('rooms', {
                type: 'player_joined',
                username: data.username,
                playersCount: data.playersCount
            });
        });
        
        // Событие: игрок вышел
        socket.on('room:player_left', (data) => {
            console.log(`👤 Игрок вышел: ${data.username}`);
            
            triggerEvent('rooms', {
                type: 'player_left',
                username: data.username,
                playersCount: data.playersCount,
                newCreator: data.newCreator
            });
        });
        
        // Событие: игрок отключился
        socket.on('room:player_disconnected', (data) => {
            console.log(`⚠️ Игрок отключился: ${data.username}`);
            
            triggerEvent('rooms', {
                type: 'player_disconnected',
                username: data.username,
                playersCount: data.playersCount
            });
        });
        
        // Событие: игрок готов
        socket.on('game:player_ready', (data) => {
            console.log(`✅ Игрок готов: ${data.username}`);
            
            triggerEvent('game', {
                type: 'player_ready',
                username: data.username,
                readyCount: data.readyCount,
                totalPlayers: data.totalPlayers
            });
        });
        
        // Событие: обратный отсчет до начала игры
        socket.on('game:countdown', (data) => {
            console.log(`⏱️ Обратный отсчет: ${data.countdown}`);
            
            triggerEvent('game', {
                type: 'countdown',
                countdown: data.countdown
            });
        });
        
        // Событие: начало игры
        socket.on('game:start', (data) => {
            console.log('🎮 Игра началась!', data);
            
            triggerEvent('game', {
                type: 'start',
                gameId: data.gameId,
                playerData: data.playerData,
                allPlayers: data.allPlayers,
                case: data.case,
                startTime: data.startTime
            });
        });
        
        // Событие: ошибка начала игры
        socket.on('game:start_error', (data) => {
            console.error('❌ Ошибка начала игры:', data.message);
            
            triggerEvent('game', {
                type: 'start_error',
                message: data.message
            });
        });
        
        // Событие: сообщение в чате
        socket.on('game:chat_message', (message) => {
            triggerEvent('game', {
                type: 'chat_message',
                message: message
            });
        });
        
        // Событие: история чата
        socket.on('game:chat_history', (history) => {
            triggerEvent('game', {
                type: 'chat_history',
                history: history
            });
        });
        
        // Событие: обновление состояния игры
        socket.on('game:state_update', (state) => {
            triggerEvent('game', {
                type: 'state_update',
                state: state
            });
        });
        
        // Общие ошибки
        socket.on('error', (data) => {
            console.error('🚨 Ошибка от сервера:', data.message);
            
            triggerEvent('error', {
                type: 'server_error',
                message: data.message
            });
        });
    }
    
    /**
     * Аутентификация на сервере
     */
    function authenticate() {
        if (!socket || !socket.connected) {
            console.error('Сокет не подключен, аутентификация невозможна');
            return;
        }
        
        // Данные пользователя уже переданы при подключении через auth
        // Можно отправить дополнительное событие, если нужно
        console.log('🔐 Выполняется аутентификация...');
    }
    
    /**
     * Планирование переподключения
     */
    function scheduleReconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
        
        console.log(`🔄 Попытка переподключения ${reconnectAttempts}/${RECONNECT_ATTEMPTS} через ${delay}ms`);
        
        reconnectTimer = setTimeout(() => {
            connect();
        }, delay);
    }
    
    /**
     * Отправка события на сервер
     */
    function emit(event, data) {
        if (!socket || !socket.connected) {
            console.error(`Не могу отправить событие ${event}: сокет не подключен`);
            return false;
        }
        
        console.log(`📤 Отправка события: ${event}`, data);
        socket.emit(event, data);
        return true;
    }
    
    /**
     * Регистрация обработчика события
     */
    function on(eventType, callback) {
        if (!eventCallbacks[eventType]) {
            eventCallbacks[eventType] = [];
        }
        
        eventCallbacks[eventType].push(callback);
        console.log(`📝 Зарегистрирован обработчик для события: ${eventType}`);
    }
    
    /**
     * Удаление обработчика события
     */
    function off(eventType, callback) {
        if (!eventCallbacks[eventType]) return;
        
        const index = eventCallbacks[eventType].indexOf(callback);
        if (index > -1) {
            eventCallbacks[eventType].splice(index, 1);
        }
    }
    
    /**
     * Вызов всех зарегистрированных обработчиков для события
     */
    function triggerEvent(eventType, data) {
        if (!eventCallbacks[eventType]) return;
        
        eventCallbacks[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Ошибка в обработчике события ${eventType}:`, error);
            }
        });
    }
    
    /**
     * Отключение от сервера
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        isConnected = false;
        reconnectAttempts = 0;
        
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        
        console.log('🔌 Сокет отключен');
    }
    
    /**
     * Получение статуса подключения
     */
    function getStatus() {
        return {
            connected: isConnected,
            socketId: socket ? socket.id : null,
            reconnectAttempts: reconnectAttempts,
            user: userData
        };
    }
    
    /**
     * Получение данных пользователя
     */
    function getUserData() {
        return { ...userData };
    }
    
    /**
     * Обновление данных пользователя
     */
    function updateUserData(newData) {
        userData = { ...userData, ...newData };
        
        // Сохраняем в localStorage, если изменился токен
        if (newData.token) {
            localStorage.setItem('dm_token', newData.token);
        }
    }
    
    /**
     * Проверка подключения к серверу
     */
    function isSocketConnected() {
        return socket && socket.connected && isConnected;
    }
    
    /**
     * Получение ID комнаты из URL
     */
    function getRoomIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }
    
    /**
     * Создание URL для комнаты
     */
    function createRoomUrl(roomId) {
        return `/game.html?room=${roomId}`;
    }
    
    /**
     * Отправка события с обработкой ошибок
     */
    function safeEmit(event, data, errorCallback) {
        try {
            if (!emit(event, data) && errorCallback) {
                errorCallback('Нет подключения к серверу');
            }
        } catch (error) {
            console.error(`Ошибка при отправке события ${event}:`, error);
            if (errorCallback) {
                errorCallback(error.message);
            }
        }
    }
    
    // Публичное API
    return {
        // Основные методы
        init,
        connect,
        disconnect,
        emit,
        safeEmit,
        on,
        off,
        
        // Вспомогательные методы
        getStatus,
        getUserData,
        updateUserData,
        isConnected: isSocketConnected,
        getRoomIdFromUrl,
        createRoomUrl,
        
        // Специфичные события (для удобства)
        requestRoomList: () => emit('room:list_request'),
        createRoom: (settings) => emit('room:create', settings),
        joinRoom: (roomId) => emit('room:join', roomId),
        leaveRoom: () => emit('room:leave'),
        setPlayerReady: () => emit('game:ready'),
        sendChatMessage: (message) => emit('game:message', { message }),
        requestChatHistory: () => emit('game:chat_history_request'),
        requestGameState: () => emit('game:state_request')
    };
})();

// Автоматическая инициализация при загрузке на игровых страницах
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    // Инициализируем только на страницах, где нужен Socket.IO
    if (currentPage.includes('lobby.html') || currentPage.includes('game.html')) {
        // Проверяем наличие токена
        const token = localStorage.getItem('dm_token');
        if (!token) {
            // Перенаправляем на страницу входа
            window.location.href = '/index.html';
            return;
        }
        
        // Инициализируем SocketClient
        SocketClient.init();
        
        // Добавляем глобальный обработчик для отладки
        SocketClient.on('connection', (data) => {
            console.log('🌐 Socket соединение:', data);
        });
        
        SocketClient.on('error', (error) => {
            console.error('🚨 Socket ошибка:', error);
            
            // Показываем уведомление пользователю
            if (error.message && !error.message.includes('connect_error')) {
                showSocketError(error.message);
            }
        });
    }
});

/**
 * Показ ошибки Socket соединения
 */
function showSocketError(message) {
    // Создаем элемент для отображения ошибки
    let errorEl = document.getElementById('socket-error-notification');
    
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'socket-error-notification';
        errorEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(errorEl);
    }
    
    errorEl.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 1.2em;"></i>
        <div>
            <strong>Ошибка подключения</strong><br>
            <small>${message}</small>
        </div>
    `;
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        errorEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => errorEl.remove(), 300);
    }, 5000);
}

// Добавляем стили для анимаций
const socketStyles = document.createElement('style');
socketStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Индикатор состояния подключения */
    .connection-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
        transition: all 0.3s ease;
    }
    
    .status-connected {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
    }
    
    .status-connecting {
        background: rgba(241, 196, 15, 0.2);
        color: #f1c40f;
    }
    
    .status-disconnected {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
    }
    
    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }
    
    .status-connected .status-indicator {
        background: #2ecc71;
        box-shadow: 0 0 8px #2ecc71;
        animation: pulse 2s infinite;
    }
    
    .status-connecting .status-indicator {
        background: #f1c40f;
        animation: blink 1.5s infinite;
    }
    
    .status-disconnected .status-indicator {
        background: #e74c3c;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
    }
`;
document.head.appendChild(socketStyles);

/**
 * Создание индикатора состояния подключения
 */
function createConnectionStatusElement() {
    const element = document.createElement('div');
    element.className = 'connection-status status-connecting';
    element.innerHTML = `
        <span class="status-indicator"></span>
        <span class="status-text">Подключение...</span>
    `;
    
    // Обновление состояния
    function updateStatus(connected) {
        element.className = `connection-status status-${connected ? 'connected' : 'disconnected'}`;
        element.querySelector('.status-text').textContent = 
            connected ? 'Подключено' : 'Отключено';
    }
    
    return {
        element,
        updateStatus
    };
}

// Экспортируем SocketClient для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketClient;
}

window.SocketClient = SocketClient;