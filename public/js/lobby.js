/**
 * Lobby.js - логика для страницы лобби
 * Управляет списком комнат, созданием комнат и взаимодействием с игроками
 */

// Состояние лобби
const LobbyState = {
    rooms: [],
    user: null,
    currentRoom: null,
    connectionStatus: 'connecting',
    onlinePlayers: 0,
    activeGames: 0,
    
    // Статистика пользователя
    stats: {
        totalGames: 0,
        successRate: 0,
        avgTime: 0,
        level: 1,
        experience: 0,
        solvedCases: 0
    }
};

// DOM элементы
let roomsListElement;
let createRoomForm;
let createRoomButton;
let refreshRoomsButton;
let quickStartButton;
let logoutButton;
let loadingModal;
let errorModal;
let usernameDisplay;
let userLevelDisplay;
let userXpDisplay;
let userCasesDisplay;
let onlinePlayersDisplay;
let activeGamesDisplay;
let connectionStatusElement;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadUserData();
    setupSocketHandlers();
    
    // Показываем экран загрузки
    showLoading('Загрузка лобби...');
});

/**
 * Инициализация DOM элементов
 */
function initializeElements() {
    // Основные элементы
    roomsListElement = document.getElementById('rooms-list');
    createRoomForm = document.getElementById('room-settings-form');
    createRoomButton = document.getElementById('create-room');
    refreshRoomsButton = document.getElementById('refresh-rooms');
    quickStartButton = document.getElementById('quick-start');
    logoutButton = document.getElementById('logout');
    
    // Информация о пользователе
    usernameDisplay = document.getElementById('username-display');
    userLevelDisplay = document.getElementById('user-level');
    userXpDisplay = document.getElementById('user-xp');
    userCasesDisplay = document.getElementById('user-cases');
    
    // Статистика
    document.getElementById('total-games').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    document.getElementById('avg-time').textContent = '0м';
    
    // Информация о сервере
    onlinePlayersDisplay = document.getElementById('online-players');
    activeGamesDisplay = document.getElementById('active-games');
    connectionStatusElement = document.getElementById('connection-status');
    
    // Модальные окна
    loadingModal = document.getElementById('loading-modal');
    errorModal = document.getElementById('error-modal');
    
    // Кнопки создания комнаты
    document.getElementById('create-first-room')?.addEventListener('click', showCreateRoomForm);
    document.getElementById('cancel-create')?.addEventListener('click', hideCreateRoomForm);
    
    // Фильтр комнат
    const roomFilter = document.getElementById('room-filter');
    if (roomFilter) {
        roomFilter.addEventListener('change', filterRooms);
    }
    
    // Настройка приватности комнаты
    const privacySelect = document.getElementById('room-privacy');
    const passwordContainer = document.getElementById('room-password-container');
    
    if (privacySelect && passwordContainer) {
        privacySelect.addEventListener('change', function() {
            passwordContainer.style.display = this.value === 'private' ? 'block' : 'none';
        });
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопка создания комнаты
    if (createRoomButton) {
        createRoomButton.addEventListener('click', showCreateRoomForm);
    }
    
    // Кнопка обновления списка комнат
    if (refreshRoomsButton) {
        refreshRoomsButton.addEventListener('click', refreshRoomList);
    }
    
    // Кнопка быстрого старта
    if (quickStartButton) {
        quickStartButton.addEventListener('click', handleQuickStart);
    }
    
    // Кнопка выхода
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Форма создания комнаты
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', handleCreateRoom);
    }
    
    // Закрытие модальных окон
    document.getElementById('error-ok')?.addEventListener('click', function() {
        errorModal.classList.remove('active');
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Клик вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });
    
    // Обработка нажатия клавиш
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideCreateRoomForm();
        }
    });
}

/**
 * Загрузка данных пользователя
 */
function loadUserData() {
    try {
        const userData = JSON.parse(localStorage.getItem('dm_user') || '{}');
        const token = localStorage.getItem('dm_token');
        
        if (!token || !userData.username) {
            // Нет данных пользователя, перенаправляем на вход
            window.location.href = '/index.html';
            return;
        }
        
        // Обновляем состояние
        LobbyState.user = userData;
        LobbyState.stats.level = userData.level || 1;
        LobbyState.stats.experience = userData.experience || 0;
        LobbyState.stats.solvedCases = userData.solvedCases || 0;
        
        // Обновляем отображение
        updateUserDisplay();
        
        // Загружаем статистику (в реальном приложении - запрос к API)
        loadUserStatistics();
        
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showError('Ошибка загрузки данных. Попробуйте войти снова.');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
    }
}

/**
 * Настройка обработчиков Socket.IO событий
 */
function setupSocketHandlers() {
    // Проверяем, инициализирован ли SocketClient
    if (typeof SocketClient === 'undefined') {
        console.error('SocketClient не загружен');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        return;
    }
    
    // Устанавливаем обработчики событий
    
    // Успешное подключение
    SocketClient.on('connection', function(data) {
        if (data.connected) {
            updateConnectionStatus('connected');
            console.log('✅ Подключено к серверу');
            
            // Запрашиваем список комнат
            SocketClient.requestRoomList();
            
            // Скрываем экран загрузки
            hideLoading();
        }
    });
    
    // Отключение от сервера
    SocketClient.on('disconnect', function() {
        updateConnectionStatus('disconnected');
        showError('Потеряно соединение с сервером. Попытка переподключения...');
    });
    
    // Ошибки
    SocketClient.on('error', function(error) {
        console.error('Socket error:', error);
        
        if (error.type === 'connect_error') {
            updateConnectionStatus('error');
            showError(`Ошибка подключения: ${error.message}`);
        }
    });
    
    // Успешная аутентификация
    SocketClient.on('auth', function(data) {
        if (data.success) {
            console.log('✅ Аутентификация успешна');
        } else {
            showError(`Ошибка аутентификации: ${data.error}`);
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        }
    });
    
    // Обновление списка комнат
    SocketClient.on('rooms', function(data) {
        switch (data.type) {
            case 'list_update':
                handleRoomListUpdate(data.rooms);
                break;
                
            case 'created':
                handleRoomCreated(data.room);
                break;
                
            case 'joined':
                handleRoomJoined(data.room);
                break;
                
            case 'players_update':
                handlePlayersUpdate(data);
                break;
                
            case 'player_joined':
                showNotification(`Игрок ${data.username} присоединился к комнате`);
                break;
                
            case 'player_left':
                showNotification(`Игрок ${data.username} покинул комнату`);
                break;
                
            case 'player_disconnected':
                showNotification(`Игрок ${data.username} отключился`);
                break;
        }
    });
    
    // События игры
    SocketClient.on('game', function(data) {
        switch (data.type) {
            case 'player_ready':
                updateReadyCount(data.readyCount, data.totalPlayers);
                showNotification(`Игрок ${data.username} готов`);
                break;
                
            case 'countdown':
                showCountdown(data.countdown);
                break;
                
            case 'start':
                handleGameStart(data);
                break;
                
            case 'start_error':
                showError(`Ошибка начала игры: ${data.message}`);
                break;
        }
    });
}

/**
 * Обновление отображения данных пользователя
 */
function updateUserDisplay() {
    if (!LobbyState.user) return;
    
    if (usernameDisplay) {
        usernameDisplay.textContent = LobbyState.user.username;
    }
    
    if (userLevelDisplay) {
        userLevelDisplay.textContent = LobbyState.stats.level;
    }
    
    if (userXpDisplay) {
        userXpDisplay.textContent = LobbyState.stats.experience;
    }
    
    if (userCasesDisplay) {
        userCasesDisplay.textContent = LobbyState.stats.solvedCases;
    }
}

/**
 * Загрузка статистики пользователя
 */
function loadUserStatistics() {
    // В реальном приложении здесь был бы запрос к API
    // Для демо используем случайные данные
    
    setTimeout(() => {
        LobbyState.stats.totalGames = Math.floor(Math.random() * 50) + 10;
        LobbyState.stats.successRate = Math.floor(Math.random() * 30) + 50;
        LobbyState.stats.avgTime = Math.floor(Math.random() * 20) + 15;
        
        // Обновляем отображение статистики
        document.getElementById('total-games').textContent = LobbyState.stats.totalGames;
        document.getElementById('success-rate').textContent = `${LobbyState.stats.successRate}%`;
        document.getElementById('avg-time').textContent = `${LobbyState.stats.avgTime}м`;
        
    }, 1000);
}

/**
 * Обновление статуса подключения
 */
function updateConnectionStatus(status) {
    LobbyState.connectionStatus = status;
    
    if (!connectionStatusElement) return;
    
    const statusText = {
        connected: 'Подключено',
        disconnected: 'Отключено',
        connecting: 'Подключение...',
        error: 'Ошибка'
    };
    
    const statusIcons = {
        connected: 'fa-wifi',
        disconnected: 'fa-wifi-slash',
        connecting: 'fa-sync fa-spin',
        error: 'fa-exclamation-triangle'
    };
    
    connectionStatusElement.innerHTML = `
        <i class="fas ${statusIcons[status] || 'fa-question'}"></i>
        ${statusText[status] || status}
    `;
    
    connectionStatusElement.className = `status-${status}`;
}

/**
 * Обработка обновления списка комнат
 */
function handleRoomListUpdate(rooms) {
    LobbyState.rooms = rooms;
    
    // Обновляем счетчики
    updateRoomsCount(rooms.length);
    
    // Если есть комната, в которой мы находимся, обновляем ее отдельно
    if (LobbyState.currentRoom) {
        const currentRoomInList = rooms.find(r => r.id === LobbyState.currentRoom.id);
        if (currentRoomInList) {
            LobbyState.currentRoom = currentRoomInList;
        }
    }
    
    // Отрисовываем список комнат
    renderRoomsList(rooms);
    
    // Обновляем статистику сервера (для демо)
    updateServerStats(rooms);
}

/**
 * Отрисовка списка комнат
 */
function renderRoomsList(rooms) {
    if (!roomsListElement) return;
    
    // Очищаем список
    roomsListElement.innerHTML = '';
    
    if (rooms.length === 0) {
        // Показываем сообщение об отсутствии комнат
        roomsListElement.innerHTML = `
            <div class="no-rooms">
                <i class="fas fa-search"></i>
                <h3>Нет доступных комнат</h3>
                <p>Создайте свою комнату или подождите, пока кто-то создаст</p>
                <button id="create-first-room" class="btn btn-primary">
                    <i class="fas fa-plus-circle"></i> Создать первую комнату
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки
        document.getElementById('create-first-room')?.addEventListener('click', showCreateRoomForm);
        return;
    }
    
    // Получаем шаблон комнаты
    const roomTemplate = document.getElementById('room-template');
    if (!roomTemplate) return;
    
    // Фильтруем комнаты, если активен фильтр
    const filterValue = document.getElementById('room-filter')?.value || 'all';
    let filteredRooms = rooms;
    
    if (filterValue === 'waiting') {
        filteredRooms = rooms.filter(room => room.players < room.maxPlayers);
    } else if (filterValue === 'starting') {
        filteredRooms = rooms.filter(room => {
            const readyCount = room.readyCount || 0;
            return readyCount >= 2 && readyCount < 4;
        });
    }
    
    // Сортируем комнаты: сначала с большим количеством игроков
    filteredRooms.sort((a, b) => b.players - a.players);
    
    // Создаем карточки для каждой комнаты
    filteredRooms.forEach(room => {
        const roomCard = roomTemplate.content.cloneNode(true);
        const cardElement = roomCard.querySelector('.room-card');
        
        // Заполняем данные комнаты
        cardElement.dataset.roomId = room.id;
        
        // Название комнаты
        const roomName = room.settings?.name || `Комната ${room.creator}`;
        cardElement.querySelector('.room-name').textContent = roomName;
        
        // Создатель
        cardElement.querySelector('.room-creator').innerHTML = 
            `<i class="fas fa-crown"></i> ${room.creator}`;
        
        // Сложность
        const difficultyText = {
            easy: 'Легкая',
            normal: 'Нормальная',
            hard: 'Сложная',
            expert: 'Эксперт'
        }[room.settings?.difficulty || 'normal'];
        
        cardElement.querySelector('.room-difficulty').innerHTML = 
            `<i class="fas fa-sliders-h"></i> ${difficultyText}`;
        
        // Статус
        const statusElement = cardElement.querySelector('.status-badge');
        if (room.players === room.maxPlayers) {
            statusElement.className = 'status-badge starting';
            statusElement.innerHTML = '<i class="fas fa-user-check"></i> Собираются';
        } else {
            statusElement.className = 'status-badge waiting';
            statusElement.innerHTML = '<i class="fas fa-user-clock"></i> Ожидание';
        }
        
        // Игроки
        cardElement.querySelector('.current-players').textContent = room.players;
        
        // Слоты игроков
        const playersSlots = cardElement.querySelector('.players-slots');
        playersSlots.innerHTML = '';
        
        for (let i = 0; i < room.maxPlayers; i++) {
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            
            if (i < room.players) {
                slot.classList.add('filled');
                slot.innerHTML = `<i class="fas fa-user"></i>`;
            } else {
                slot.innerHTML = `<i class="fas fa-user-plus"></i>`;
            }
            
            playersSlots.appendChild(slot);
        }
        
        // Настройки комнаты
        cardElement.querySelector('.time-limit').textContent = `${room.settings?.timeLimit || 25} мин`;
        cardElement.querySelector('.privacy').textContent = 
            room.settings?.isPublic ? 'Публичная' : 'Приватная';
        cardElement.querySelector('.voice-chat').textContent = 
            room.settings?.voiceEnabled ? 'С голосом' : 'Без голоса';
        
        // Обработчик для кнопки присоединения
        const joinButton = cardElement.querySelector('.join-room');
        joinButton.addEventListener('click', function() {
            joinRoom(room.id);
        });
        
        // Добавляем карточку в список
        roomsListElement.appendChild(roomCard);
    });
}

/**
 * Обновление счетчика комнат
 */
function updateRoomsCount(count) {
    const countElement = document.getElementById('rooms-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

/**
 * Обновление статистики сервера
 */
function updateServerStats(rooms) {
    // Считаем общее количество игроков
    const totalPlayers = rooms.reduce((sum, room) => sum + room.players, 0);
    
    // Считаем активные игры (комнаты с полным составом)
    const activeGames = rooms.filter(room => room.players === room.maxPlayers).length;
    
    // Обновляем отображение
    if (onlinePlayersDisplay) {
        onlinePlayersDisplay.textContent = totalPlayers;
        LobbyState.onlinePlayers = totalPlayers;
    }
    
    if (activeGamesDisplay) {
        activeGamesDisplay.textContent = activeGames;
        LobbyState.activeGames = activeGames;
    }
}

/**
 * Показать форму создания комнаты
 */
function showCreateRoomForm() {
    if (createRoomForm) {
        createRoomForm.style.display = 'block';
        createRoomButton.style.display = 'none';
        
        // Фокус на поле названия комнаты
        setTimeout(() => {
            const roomNameInput = document.getElementById('room-name');
            if (roomNameInput) {
                roomNameInput.focus();
            }
        }, 100);
    }
}

/**
 * Скрыть форму создания комнаты
 */
function hideCreateRoomForm() {
    if (createRoomForm) {
        createRoomForm.style.display = 'none';
        createRoomButton.style.display = 'inline-flex';
        createRoomForm.reset();
        
        // Скрываем поле пароля
        const passwordContainer = document.getElementById('room-password-container');
        if (passwordContainer) {
            passwordContainer.style.display = 'none';
        }
    }
}

/**
 * Обработка создания комнаты
 */
function handleCreateRoom(e) {
    e.preventDefault();
    
    // Собираем данные из формы
    const roomName = document.getElementById('room-name').value.trim();
    const difficulty = document.getElementById('room-difficulty').value;
    const timeLimit = parseInt(document.getElementById('room-time').value);
    const privacy = document.getElementById('room-privacy').value;
    const password = document.getElementById('room-password').value;
    const voiceEnabled = document.getElementById('room-voice-enabled').checked;
    
    // Валидация
    if (privacy === 'private' && !password) {
        showError('Для приватной комнаты необходим пароль');
        return;
    }
    
    // Создаем объект настроек
    const settings = {
        name: roomName || `Комната ${LobbyState.user.username}`,
        difficulty: difficulty,
        timeLimit: timeLimit,
        isPublic: privacy === 'public',
        voiceEnabled: voiceEnabled,
        password: privacy === 'private' ? password : undefined
    };
    
    // Отправляем запрос на создание комнаты
    SocketClient.safeEmit('room:create', settings, function(error) {
        showError(`Ошибка создания комнаты: ${error}`);
    });
    
    // Скрываем форму
    hideCreateRoomForm();
}

/**
 * Присоединение к комнате
 */
function joinRoom(roomId) {
    if (!roomId) {
        showError('Не указан ID комнаты');
        return;
    }
    
    // Проверяем, не находимся ли мы уже в комнате
    if (LobbyState.currentRoom) {
        if (confirm('Вы уже находитесь в комнате. Покинуть текущую комнату?')) {
            SocketClient.emit('room:leave');
        } else {
            return;
        }
    }
    
    console.log(`Присоединение к комнате: ${roomId}`);
    
    // Показываем загрузку
    showLoading('Присоединение к комнате...');
    
    // Отправляем запрос
    SocketClient.safeEmit('room:join', roomId, function(error) {
        hideLoading();
        showError(`Ошибка присоединения к комнате: ${error}`);
    });
}

/**
 * Обработка успешного создания комнаты
 */
function handleRoomCreated(room) {
    console.log('Комната создана:', room);
    LobbyState.currentRoom = room;
    
    // Перенаправляем в игровую комнату
    const roomUrl = SocketClient.createRoomUrl(room.roomId);
    window.location.href = roomUrl;
}

/**
 * Обработка успешного присоединения к комнате
 */
function handleRoomJoined(room) {
    console.log('Присоединились к комнате:', room);
    LobbyState.currentRoom = room;
    
    // Скрываем загрузку
    hideLoading();
    
    // Перенаправляем в игровую комнату
    const roomUrl = SocketClient.createRoomUrl(room.roomId);
    window.location.href = roomUrl;
}

/**
 * Обновление списка игроков в комнате
 */
function handlePlayersUpdate(data) {
    // Эта функция будет использоваться, когда мы находимся в комнате
    // Для лобби просто обновляем счетчик готовых игроков в карточке комнаты
    if (LobbyState.currentRoom && data.players) {
        LobbyState.currentRoom.players = data.players;
        
        // Обновляем отображение комнаты, если она есть в списке
        const roomCard = document.querySelector(`.room-card[data-room-id="${LobbyState.currentRoom.id}"]`);
        if (roomCard) {
            const playersCount = roomCard.querySelector('.current-players');
            if (playersCount) {
                playersCount.textContent = data.players.length;
            }
        }
    }
}

/**
 * Обработка начала игры
 */
function handleGameStart(data) {
    console.log('Игра начинается:', data);
    
    // Перенаправляем в игровую комнату
    const roomUrl = SocketClient.createRoomUrl(LobbyState.currentRoom?.id);
    window.location.href = roomUrl;
}

/**
 * Быстрый старт игры
 */
function handleQuickStart() {
    showLoading('Поиск подходящей комнаты...');
    
    // Ищем комнату с 1-3 игроками
    const availableRoom = LobbyState.rooms.find(room => 
        room.players > 0 && room.players < room.maxPlayers
    );
    
    if (availableRoom) {
        // Присоединяемся к найденной комнате
        joinRoom(availableRoom.id);
    } else {
        // Создаем новую комнату с настройками по умолчанию
        hideLoading();
        showCreateRoomForm();
    }
}

/**
 * Обновление счетчика готовых игроков
 */
function updateReadyCount(readyCount, totalPlayers) {
    // Обновляем отображение в карточке комнаты, если мы находимся в ней
    if (LobbyState.currentRoom) {
        const statusElement = document.querySelector('.status-badge');
        if (statusElement) {
            if (readyCount === totalPlayers) {
                statusElement.className = 'status-badge starting';
                statusElement.innerHTML = `<i class="fas fa-user-check"></i> Все готовы`;
            } else {
                statusElement.innerHTML = `<i class="fas fa-user-clock"></i> Готовы: ${readyCount}/${totalPlayers}`;
            }
        }
    }
}

/**
 * Показать обратный отсчет
 */
function showCountdown(countdown) {
    // В лобби это не нужно, так как мы уже перешли в комнату
    console.log(`Обратный отсчет: ${countdown}`);
}

/**
 * Фильтрация комнат
 */
function filterRooms() {
    renderRoomsList(LobbyState.rooms);
}

/**
 * Обновить список комнат
 */
function refreshRoomList() {
    SocketClient.requestRoomList();
    
    // Показываем анимацию обновления
    if (refreshRoomsButton) {
        refreshRoomsButton.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
        setTimeout(() => {
            refreshRoomsButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }, 1000);
    }
}

/**
 * Выход из аккаунта
 */
function handleLogout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        // Очищаем данные пользователя
        localStorage.removeItem('dm_token');
        localStorage.removeItem('dm_user');
        
        // Отключаемся от сервера
        SocketClient.disconnect();
        
        // Перенаправляем на страницу входа
        window.location.href = '/index.html';
    }
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'info' ? 'info-circle' : type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'info' ? '#3498db' : type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Показать ошибку
 */
function showError(message) {
    if (errorModal) {
        document.getElementById('error-message').textContent = message;
        errorModal.classList.add('active');
    } else {
        alert(`Ошибка: ${message}`);
    }
}

/**
 * Показать экран загрузки
 */
function showLoading(message = 'Загрузка...') {
    if (loadingModal) {
        document.getElementById('loading-message').textContent = message;
        loadingModal.classList.add('active');
    }
}

/**
 * Скрыть экран загрузки
 */
function hideLoading() {
    if (loadingModal) {
        loadingModal.classList.remove('active');
    }
}

/**
 * Показать подтверждение
 */
function showConfirmation(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Добавляем стили для уведомлений
const lobbyStyles = document.createElement('style');
lobbyStyles.textContent = `
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
    
    .loading-modal {
        text-align: center;
        padding: 40px;
    }
    
    .loading-spinner {
        font-size: 3rem;
        color: var(--primary-color);
        margin-bottom: 20px;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-progress {
        margin-top: 20px;
    }
    
    .progress-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: var(--primary-color);
        width: 0%;
        animation: loading 2s ease-in-out infinite;
    }
    
    @keyframes loading {
        0%, 100% { width: 0%; }
        50% { width: 100%; }
    }
    
    .error-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        margin-bottom: 10px;
    }
    
    .checkbox-label input {
        display: none;
    }
    
    .checkmark {
        width: 20px;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid var(--gray-color);
        border-radius: 4px;
        margin-right: 10px;
        position: relative;
        transition: all 0.3s ease;
    }
    
    .checkbox-label input:checked + .checkmark {
        background: var(--primary-color);
        border-color: var(--primary-color);
    }
    
    .checkbox-label input:checked + .checkmark::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: bold;
    }
    
    .step {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        color: var(--gray-color);
    }
    
    .step.active {
        color: var(--primary-color);
    }
    
    .step i {
        font-size: 0.9rem;
    }
    
    .status-connected {
        color: var(--secondary-color);
    }
    
    .status-disconnected {
        color: var(--danger-color);
    }
    
    .status-error {
        color: var(--warning-color);
    }
`;
document.head.appendChild(lobbyStyles);

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LobbyState,
        showNotification,
        showError
    };
}