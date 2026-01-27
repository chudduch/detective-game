class GameManager {
    constructor() {
        this.currentRoom = null;
        this.players = [];
        this.isReady = false;
        this.isCreator = false;
        this.chatMessages = [];
        
        this.init();
    }
    
    init() {
        // Подписываемся на события сокета
        if (window.socketManager) {
            window.socketManager.on('room:created', this.handleRoomCreated.bind(this));
            window.socketManager.on('room:update', this.handleRoomUpdate.bind(this));
            window.socketManager.on('room:player_joined', this.handlePlayerJoined.bind(this));
            window.socketManager.on('room:player_left', this.handlePlayerLeft.bind(this));
            window.socketManager.on('room:player_ready', this.handlePlayerReady.bind(this));
            window.socketManager.on('room:chat_message', this.handleChatMessage.bind(this));
            window.socketManager.on('room:all_ready', this.handleAllReady.bind(this));
            window.socketManager.on('game:starting', this.handleGameStarting.bind(this));
            window.socketManager.on('game:started', this.handleGameStarted.bind(this));
        }
    }
    
    // Создание комнаты
    async createRoom(roomName, maxPlayers = 4) {
        try {
            const result = await window.socketManager.createRoom(roomName, maxPlayers);
            this.currentRoom = result.room;
            this.isCreator = true;
            this.updateRoomUI();
            return result;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }
    
    // Присоединение к комнате
    async joinRoom(roomId, password = '') {
        try {
            const result = await window.socketManager.joinRoom(roomId, password);
            this.currentRoom = result.room;
            this.isCreator = result.room.isCreator;
            this.updateRoomUI();
            return result;
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }
    
    // Выход из комнаты
    leaveRoom() {
        if (this.currentRoom) {
            window.socketManager.leaveRoom(this.currentRoom.id);
            this.currentRoom = null;
            this.players = [];
            this.isReady = false;
            this.isCreator = false;
            this.hideRoomUI();
        }
    }
    
    // Отправка сообщения в чат
    sendChatMessage(message) {
        if (this.currentRoom) {
            window.socketManager.sendChatMessage(this.currentRoom.id, message);
        }
    }
    
    // Изменение статуса готовности
    toggleReady() {
        if (this.currentRoom) {
            this.isReady = !this.isReady;
            window.socketManager.setReadyStatus(this.currentRoom.id, this.isReady);
            this.updateReadyButton();
        }
    }
    
    // Начало игры
    async startGame() {
        if (this.currentRoom && this.isCreator) {
            try {
                await window.socketManager.startGame(this.currentRoom.id);
            } catch (error) {
                console.error('Error starting game:', error);
                throw error;
            }
        }
    }
    
    // Обработчики событий
    handleRoomCreated(data) {
        console.log('Room created:', data);
        this.showNotification('Комната создана! Пригласите друзей.');
    }
    
    handleRoomUpdate(data) {
        console.log('Room update:', data);
        this.players = data.players;
        this.updatePlayersList();
        this.updateReadyStatus();
    }
    
    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.showNotification(`${data.player.name} присоединился к игре`);
    }
    
    handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.showNotification(`Игрок вышел из игры`);
    }
    
    handlePlayerReady(data) {
        console.log('Player ready:', data);
        if (data.userId === window.auth?.currentUser?.userId) {
            this.isReady = data.isReady;
            this.updateReadyButton();
        }
    }
    
    handleChatMessage(data) {
        console.log('Chat message:', data);
        this.chatMessages.push(data);
        this.updateChat();
    }
    
    handleAllReady(data) {
        console.log('All players ready:', data);
        if (this.isCreator) {
            this.showNotification('Все игроки готовы! Вы можете начать игру.', 'success');
        } else {
            this.showNotification('Все игроки готовы! Ожидайте начала игры.', 'info');
        }
    }
    
    handleGameStarting(data) {
        console.log('Game starting:', data);
        this.showNotification('Игра начинается...', 'info');
    }
    
    handleGameStarted(data) {
        console.log('Game started:', data);
        // TODO: Переход к игровому экрану
        this.showNotification('Игра началась!', 'success');
    }
    
    // Обновление интерфейса
    updateRoomUI() {
        // TODO: Показать интерфейс комнаты
        console.log('Update room UI for:', this.currentRoom);
        
        if (window.auth) {
            window.auth.showScreen('room-screen');
        }
    }
    
    hideRoomUI() {
        // TODO: Скрыть интерфейс комнаты
        if (window.auth) {
            window.auth.showScreen('profile-screen');
        }
    }
    
    updatePlayersList() {
        // TODO: Обновить список игроков в интерфейсе
        console.log('Players:', this.players);
    }
    
    updateReadyStatus() {
        // TODO: Обновить статусы готовности
        const allReady = this.players.every(p => p.isReady);
        const enoughPlayers = this.players.length >= 2;
        
        if (allReady && enoughPlayers && this.isCreator) {
            // Показать кнопку "Начать игру"
        }
    }
    
    updateReadyButton() {
        // TODO: Обновить кнопку готовности
        console.log('Ready status:', this.isReady);
    }
    
    updateChat() {
        // TODO: Обновить чат
        if (this.chatMessages.length > 100) {
            this.chatMessages = this.chatMessages.slice(-100);
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.auth) {
            window.auth.showNotification(message, type);
        }
    }
}

// Создаём глобальный экземпляр
const gameManager = new GameManager();
window.gameManager = gameManager;