class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.userData = null;
        this.currentRoom = null;
        this.authAttempted = false;
    }

    // Подключение к WebSocket с аутентификацией
    connect() {
        if (this.socket && this.socket.connected) {
            console.log('WebSocket уже подключен');
            return Promise.resolve();
        }

        console.log('Подключение к WebSocket...');
        
        // Отключаем предыдущее соединение если есть
        if (this.socket) {
            this.socket.disconnect();
        }

        // Получаем токен из localStorage
        const token = localStorage.getItem('detective_token');
        
        if (!token) {
            console.log('Нет токена для подключения');
            return Promise.reject(new Error('Требуется авторизация'));
        }

        // Подключаемся к серверу с токеном
        this.socket = io('http://localhost:3000', {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            timeout: 10000,
            transports: ['websocket', 'polling']
        });

        // Настройка обработчиков событий
        this.setupEventHandlers();
        
        return new Promise((resolve, reject) => {
            // Таймаут подключения
            const connectionTimeout = setTimeout(() => {
                reject(new Error('Таймаут подключения к серверу'));
            }, 10000);

            // Обработчик успешного подключения
            this.socket.once('connect', () => {
                clearTimeout(connectionTimeout);
                resolve();
            });

            // Обработчик ошибки подключения
            this.socket.once('connect_error', (error) => {
                clearTimeout(connectionTimeout);
                reject(new Error(`Ошибка подключения: ${error.message}`));
            });
        });
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        // Подключение установлено
        this.socket.on('connect', () => {
            console.log('✅ WebSocket подключен:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('socket:connected', { socketId: this.socket.id });
        });

        // Приветствие от сервера
        this.socket.on('server:hello', (data) => {
            console.log('Сервер:', data.message);
            this.emit('server:hello', data);
        });

        // Успешная аутентификация
        this.socket.on('auth:success', (data) => {
            console.log('✅ Аутентификация успешна:', data.user.username);
            this.userData = data.user;
            this.emit('auth:success', data);
        });

        // Ошибка аутентификации
        this.socket.on('auth:error', (data) => {
            console.error('❌ Ошибка аутентификации:', data.error);
            this.emit('auth:error', data);
            
            // Удаляем невалидный токен
            if (data.error.includes('токен')) {
                localStorage.removeItem('detective_token');
            }
        });

        // ===== КОМНАТЫ =====
        
        // Комната создана
        this.socket.on('room:created', (data) => {
            console.log('✅ Комната создана:', data.roomId);
            this.currentRoom = data.roomId;
            this.emit('room:created', data);
        });

        // Обновление комнаты
        this.socket.on('room:updated', (data) => {
            console.log('🔄 Обновление комнаты:', data.players?.length || 0, 'игроков');
            this.emit('room:updated', data);
        });

        // Игрок присоединился
        this.socket.on('room:player_joined', (data) => {
            console.log('➕ Игрок присоединился:', data.player.name);
            this.emit('room:player_joined', data);
        });

        // Игрок вышел
        this.socket.on('room:player_left', (data) => {
            console.log('➖ Игрок вышел:', data.playerName);
            this.emit('room:player_left', data);
            
            // Если вышел текущий пользователь, очищаем текущую комнату
            if (data.userId === this.userData?.id) {
                this.currentRoom = null;
            }
        });

        // Игрок готов
        this.socket.on('room:player_ready', (data) => {
            console.log('✓ Игрок готов:', data.playerName);
            this.emit('room:player_ready', data);
        });

        // Все игроки готовы
        this.socket.on('room:all_ready', (data) => {
            console.log('✅ Все игроки готовы!');
            this.emit('room:all_ready', data);
        });

        // Сообщение в чат
        this.socket.on('room:chat_message', (data) => {
            console.log('💬 Чат:', data.playerName, ':', data.message);
            this.emit('room:chat_message', data);
        });

        // Обновление списка комнат
        this.socket.on('rooms:updated', (data) => {
            console.log('🔄 Обновление списка комнат:', data.action);
            this.emit('rooms:updated', data);
        });

        // ===== ИГРА =====
        
        // Игра начинается
        this.socket.on('game:starting', (data) => {
            console.log('🎮 Игра начинается:', data.message);
            this.emit('game:starting', data);
        });

        // Обратный отсчет
        this.socket.on('game:countdown', (data) => {
            console.log('⏱️ Обратный отсчет:', data.countdown);
            this.emit('game:countdown', data);
        });

        // Игра началась
        this.socket.on('game:started', (data) => {
            console.log('🎲 Игра началась!');
            this.emit('game:started', data);
        });

        // Отключение
        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket отключен:', reason);
            this.isConnected = false;
            this.currentRoom = null;
            this.emit('socket:disconnected', { reason });
        });

        // Ошибка подключения
        this.socket.on('connect_error', (error) => {
            console.error('❌ Ошибка подключения WebSocket:', error.message);
            this.emit('socket:error', { error: error.message });
            
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.emit('socket:connection_failed', { 
                    error: 'Не удалось подключиться к серверу' 
                });
            }
        });

        // Любые другие ошибки
        this.socket.on('error', (data) => {
            console.error('❌ WebSocket ошибка:', data);
            this.emit('socket:error', data);
        });
    }

    // ===== АВТЕНТИФИКАЦИЯ =====

    // Проверка аутентификации
    isAuthenticated() {
        return !!this.userData;
    }

    // Получение данных пользователя
    getUser() {
        return this.userData;
    }

    // ===== КОМНАТЫ =====

    // Создание комнаты
    createRoom(roomName, maxPlayers = 4) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут создания комнаты'));
            }, 10000);

            this.socket.emit('room:create', { 
                roomName, 
                maxPlayers 
            }, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Ошибка создания комнаты'));
                }
            });
        });
    }

    // Присоединение к комнате
    joinRoom(roomId, password = '') {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут присоединения к комнате'));
            }, 10000);

            this.socket.emit('room:join', { 
                roomId, 
                password 
            }, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    this.currentRoom = roomId;
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Ошибка присоединения к комнате'));
                }
            });
        });
    }

    // Получение информации о комнате
    getRoomInfo(roomId) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут получения информации о комнате'));
            }, 5000);

            this.socket.emit('room:get_info', { roomId }, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Ошибка получения информации'));
                }
            });
        });
    }

    // Получение списка комнат
    getRoomsList() {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут получения списка комнат'));
            }, 5000);

            this.socket.emit('rooms:list', {}, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Ошибка получения списка комнат'));
                }
            });
        });
    }

    // Отправка сообщения в чат комнаты
    sendChatMessage(roomId, message) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        if (!message || message.trim() === '') {
            throw new Error('Сообщение не может быть пустым');
        }

        if (!roomId) {
            roomId = this.currentRoom;
        }

        if (!roomId) {
            throw new Error('Не указана комната');
        }

        this.socket.emit('room:chat_message', {
            roomId,
            message: message.trim()
        });
    }

    // Изменение статуса "готов"
    setReadyStatus(roomId, isReady = true) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        if (!roomId) {
            roomId = this.currentRoom;
        }

        if (!roomId) {
            throw new Error('Не указана комната');
        }

        this.socket.emit('room:set_ready', {
            roomId,
            isReady
        });
    }

    // Начать игру
    startGame(roomId) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        if (!roomId) {
            roomId = this.currentRoom;
        }

        if (!roomId) {
            throw new Error('Не указана комната');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут начала игры'));
            }, 10000);

            this.socket.emit('game:start', { roomId }, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Ошибка начала игры'));
                }
            });
        });
    }

    // Выйти из комнаты
    leaveRoom(roomId) {
        if (!this.isConnected) {
            throw new Error('WebSocket не подключен');
        }

        if (!roomId) {
            roomId = this.currentRoom;
        }

        if (!roomId) {
            console.log('Нет активной комнаты для выхода');
            return;
        }

        this.socket.emit('room:leave', { roomId });
        this.currentRoom = null;
        console.log('Выход из комнаты:', roomId);
    }

    // ===== УПРАВЛЕНИЕ СОБЫТИЯМИ =====

    // Подписка на события
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    // Отписка от событий
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // Вызов обработчиков события
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }

    // Очистка всех обработчиков
    clearAllHandlers() {
        this.eventHandlers.clear();
    }

    // ===== УТИЛИТЫ =====

    // Отключение
    disconnect() {
        if (this.socket) {
            // Выходим из комнаты если находимся в ней
            if (this.currentRoom) {
                this.leaveRoom(this.currentRoom);
            }
            
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentRoom = null;
            this.userData = null;
            console.log('WebSocket отключен вручную');
        }
    }

    // Получение статуса
    getStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket ? this.socket.id : null,
            userId: this.userData?.id,
            username: this.userData?.username,
            currentRoom: this.currentRoom,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // Проверка подключения
    checkConnection() {
        if (!this.isConnected) {
            return this.connect().catch(error => {
                console.error('Ошибка переподключения:', error);
                throw error;
            });
        }
        return Promise.resolve();
    }

    // Получение текущей комнаты
    getCurrentRoom() {
        return this.currentRoom;
    }

    // Установка пользовательских данных
    setUserData(userData) {
        this.userData = userData;
    }
}

// Создаём глобальный экземпляр
const socketManager = new SocketManager();

// Автоматическое подключение при наличии токена
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('detective_token');
    if (token) {
        // Ждем загрузки других модулей
        setTimeout(() => {
            socketManager.connect().catch(error => {
                console.log('Автоподключение не удалось:', error.message);
            });
        }, 1000);
    }
});

// Автоматическое отключение при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (socketManager.isConnected) {
        socketManager.disconnect();
    }
});

// Экспортируем для использования в других модулях
window.socketManager = socketManager;