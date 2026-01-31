/**
 * Game.js - основная логика игровой комнаты
 * Управляет игровым процессом, интерфейсами ролей и взаимодействием с сервером
 */

// Состояние игры
const GameState = {
    // Данные комнаты
    roomId: null,
    gameId: null,
    isCreator: false,
    
    // Данные игрока
    player: {
        username: null,
        role: null,
        roleData: null,
        isReady: false
    },
    
    // Данные игры
    game: {
        status: 'lobby', // lobby, starting, in_progress, finished
        case: null,
        players: [],
        startTime: null,
        timeLimit: 25, // минуты
        timeRemaining: 25 * 60, // секунды
        timerInterval: null
    },
    
    // Чат
    chat: {
        messages: [],
        isTyping: false,
        typingTimeout: null
    },
    
    // Улики
    clues: [],
    
    // Интерфейс
    interface: {
        roleInterface: null,
        isSidebarOpen: true,
        isChatOpen: true
    },
    
    // Соединение
    connection: {
        isConnected: false,
        reconnectAttempts: 0
    }
};

// DOM элементы
let loadingScreen, gameContainer;
let roomIdDisplay, caseTitleDisplay, gameTimerDisplay;
let roleBadge, roleNameDisplay, playerNameDisplay;
let roleTitleDisplay, roleDescriptionDisplay, roleIconDisplay;
let abilitiesList, itemsList, playersList;
let roomLobby, readyButton, leaveRoomButton, countdownDisplay;
let gameInterface, caseNameDisplay, caseDescriptionDisplay;
let crimeTypeDisplay, caseDifficultyDisplay;
let chatMessages, chatInput, sendMessageButton, clearChatButton;
let toggleChatButton, charCountDisplay, typingIndicator;
let evidenceList, evidenceCountDisplay;
let toggleSidebarButton, gameHelpButton, reportIssueButton;
let theoriesCountDisplay, totalCluesDisplay, activePlayersDisplay;
let gameConnectionStatus;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadGameData();
    setupEventListeners();
    setupSocketHandlers();
    
    // Инициализируем SocketClient
    if (typeof SocketClient !== 'undefined') {
        SocketClient.init();
    } else {
        showError('Ошибка загрузки игрового клиента. Перезагрузите страницу.');
    }
});

/**
 * Инициализация DOM элементов
 */
function initializeElements() {
    // Основные контейнеры
    loadingScreen = document.getElementById('loading-screen');
    gameContainer = document.getElementById('game-container');
    
    // Заголовок игры
    roomIdDisplay = document.getElementById('room-id-display');
    caseTitleDisplay = document.getElementById('case-title');
    gameTimerDisplay = document.getElementById('timer-display');
    
    // Информация об игроке
    roleBadge = document.getElementById('role-badge');
    roleNameDisplay = document.getElementById('role-name');
    playerNameDisplay = document.getElementById('player-name');
    
    // Панель роли
    roleTitleDisplay = document.getElementById('role-title');
    roleDescriptionDisplay = document.getElementById('role-description');
    roleIconDisplay = document.getElementById('role-icon');
    abilitiesList = document.getElementById('abilities-list');
    itemsList = document.getElementById('items-list');
    playersList = document.getElementById('players-list');
    
    // Лобби комнаты
    roomLobby = document.getElementById('room-lobby');
    readyButton = document.getElementById('ready-btn');
    leaveRoomButton = document.getElementById('leave-room');
    countdownDisplay = document.getElementById('countdown');
    
    // Игровой интерфейс
    gameInterface = document.getElementById('game-interface');
    caseNameDisplay = document.getElementById('case-name');
    caseDescriptionDisplay = document.getElementById('case-description');
    crimeTypeDisplay = document.getElementById('crime-type');
    caseDifficultyDisplay = document.getElementById('case-difficulty');
    
    // Чат
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendMessageButton = document.getElementById('send-message');
    clearChatButton = document.getElementById('clear-chat');
    toggleChatButton = document.getElementById('toggle-chat');
    charCountDisplay = document.getElementById('char-count');
    typingIndicator = document.getElementById('typing-indicator');
    
    // Улики
    evidenceList = document.getElementById('evidence-list');
    evidenceCountDisplay = document.getElementById('evidence-count');
    
    // Управление игрой
    toggleSidebarButton = document.getElementById('toggle-sidebar');
    gameHelpButton = document.getElementById('game-help');
    reportIssueButton = document.getElementById('report-issue');
    
    // Статистика
    theoriesCountDisplay = document.getElementById('theories-count');
    totalCluesDisplay = document.getElementById('total-clues');
    activePlayersDisplay = document.getElementById('active-players');
    
    // Соединение
    gameConnectionStatus = document.getElementById('game-connection-status');
    
    // Модальные окна
    setupModalHandlers();
}

/**
 * Настройка обработчиков модальных окон
 */
function setupModalHandlers() {
    // Помощь
    const helpModal = document.getElementById('help-modal');
    if (gameHelpButton && helpModal) {
        gameHelpButton.addEventListener('click', () => {
            helpModal.classList.add('active');
        });
    }
    
    // Улики
    const evidenceModal = document.getElementById('evidence-modal');
    
    // Закрытие модальных окон
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
}

/**
 * Загрузка данных игры
 */
function loadGameData() {
    try {
        // Получаем данные пользователя
        const userData = JSON.parse(localStorage.getItem('dm_user') || '{}');
        const token = localStorage.getItem('dm_token');
        
        if (!token || !userData.username) {
            window.location.href = '/index.html';
            return;
        }
        
        // Устанавливаем имя игрока
        GameState.player.username = userData.username;
        if (playerNameDisplay) {
            playerNameDisplay.textContent = userData.username;
        }
        
        // Получаем ID комнаты из URL
        GameState.roomId = SocketClient.getRoomIdFromUrl();
        if (!GameState.roomId) {
            showError('Не указана комната. Вернитесь в лобби.');
            setTimeout(() => {
                window.location.href = '/lobby.html';
            }, 3000);
            return;
        }
        
        // Обновляем отображение ID комнаты
        if (roomIdDisplay) {
            roomIdDisplay.textContent = GameState.roomId;
        }
        
        // Показываем загрузку
        updateLoadingStep(1);
        
    } catch (error) {
        console.error('Ошибка загрузки данных игры:', error);
        showError('Ошибка загрузки игры. Попробуйте войти снова.');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопка готовности
    if (readyButton) {
        readyButton.addEventListener('click', togglePlayerReady);
    }
    
    // Кнопка выхода из комнаты
    if (leaveRoomButton) {
        leaveRoomButton.addEventListener('click', leaveRoom);
    }
    
    // Чат
    if (chatInput) {
        chatInput.addEventListener('input', handleChatInput);
        chatInput.addEventListener('keypress', handleChatKeypress);
    }
    
    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', sendChatMessage);
    }
    
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }
    
    if (toggleChatButton) {
        toggleChatButton.addEventListener('click', toggleChat);
    }
    
    // Управление интерфейсом
    if (toggleSidebarButton) {
        toggleSidebarButton.addEventListener('click', toggleSidebar);
    }
    
    if (reportIssueButton) {
        reportIssueButton.addEventListener('click', reportIssue);
    }
    
    // Обработка выхода из игры
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Горячие клавиши
    document.addEventListener('keydown', handleHotkeys);
}

/**
 * Настройка обработчиков Socket.IO событий
 */
function setupSocketHandlers() {
    if (typeof SocketClient === 'undefined') {
        console.error('SocketClient не загружен');
        return;
    }
    
    // Подключение к серверу
    SocketClient.on('connection', function(data) {
        if (data.connected) {
            updateConnectionStatus(true);
            console.log('✅ Подключено к игровому серверу');
            
            // Запрашиваем историю чата и состояние игры
            SocketClient.requestChatHistory();
            SocketClient.requestGameState();
            
            // Присоединяемся к комнате
            joinRoom();
            
        } else {
            updateConnectionStatus(false);
            showError('Потеряно соединение с сервером');
        }
    });
    
    // Отключение от сервера
    SocketClient.on('disconnect', function() {
        updateConnectionStatus(false);
        showError('Соединение с сервером потеряно. Попытка переподключения...');
    });
    
    // Ошибки
    SocketClient.on('error', function(error) {
        console.error('Game socket error:', error);
        showError(`Ошибка: ${error.message || 'Неизвестная ошибка'}`);
    });
    
    // События комнаты
    SocketClient.on('rooms', function(data) {
        switch (data.type) {
            case 'joined':
                handleRoomJoined(data.room);
                break;
                
            case 'players_update':
                handlePlayersUpdate(data.players, data.readyCount, data.totalPlayers);
                break;
                
            case 'player_joined':
                handlePlayerJoined(data.username, data.playersCount);
                break;
                
            case 'player_left':
                handlePlayerLeft(data.username, data.playersCount, data.newCreator);
                break;
                
            case 'player_disconnected':
                handlePlayerDisconnected(data.username, data.playersCount);
                break;
        }
    });
    
    // События игры
    SocketClient.on('game', function(data) {
        console.log('Game event:', data.type);
        
        switch (data.type) {
            case 'player_ready':
                handleGamePlayerReady(data.username, data.readyCount, data.totalPlayers);
                break;
                
            case 'countdown':
                handleGameCountdown(data.countdown);
                break;
                
            case 'start':
                handleGameStart(data);
                break;
                
            case 'start_error':
                handleGameStartError(data.message);
                break;
                
            case 'chat_message':
                handleChatMessage(data.message);
                break;
                
            case 'chat_history':
                handleChatHistory(data.history);
                break;
                
            case 'state_update':
                handleGameStateUpdate(data.state);
                break;
        }
    });
}

/**
 * Присоединение к комнате
 */
function joinRoom() {
    if (!GameState.roomId) {
        showError('Не указана комната');
        return;
    }
    
    console.log(`Присоединение к комнате: ${GameState.roomId}`);
    updateLoadingStep(2);
    
    SocketClient.safeEmit('room:join', GameState.roomId, function(error) {
        showError(`Ошибка присоединения к комнате: ${error}`);
    });
}

/**
 * Обработка успешного присоединения к комнате
 */
function handleRoomJoined(room) {
    console.log('Присоединились к комнате:', room);
    
    // Сохраняем данные комнаты
    GameState.isCreator = room.isCreator;
    
    // Обновляем список игроков
    updatePlayersList(room.players);
    
    // Обновляем счетчик готовых игроков
    updateReadyGrid(room.players);
    
    // Скрываем экран загрузки и показываем игровой интерфейс
    setTimeout(() => {
        hideLoadingScreen();
        showGameInterface();
        updateLoadingStep(3);
    }, 500);
}

/**
 * Обновление списка игроков
 */
function handlePlayersUpdate(players, readyCount, totalPlayers) {
    updatePlayersList(players);
    updateReadyGrid(players);
    updateActivePlayers(players.length);
}

/**
 * Обработка присоединения нового игрока
 */
function handlePlayerJoined(username, playersCount) {
    showNotification(`Игрок ${username} присоединился к комнате`);
    updateActivePlayers(playersCount);
    
    // Добавляем игрока в список
    const player = {
        username: username,
        isReady: false
    };
    
    GameState.game.players.push(player);
    updatePlayersList(GameState.game.players);
    updateReadyGrid(GameState.game.players);
}

/**
 * Обработка выхода игрока
 */
function handlePlayerLeft(username, playersCount, newCreator) {
    showNotification(`Игрок ${username} покинул комнату`);
    updateActivePlayers(playersCount);
    
    // Удаляем игрока из списка
    GameState.game.players = GameState.game.players.filter(p => p.username !== username);
    updatePlayersList(GameState.game.players);
    updateReadyGrid(GameState.game.players);
    
    // Если новый создатель - это текущий игрок
    if (newCreator === GameState.player.username) {
        GameState.isCreator = true;
        showNotification('Вы теперь создатель комнаты');
    }
}

/**
 * Обработка отключения игрока
 */
function handlePlayerDisconnected(username, playersCount) {
    showNotification(`Игрок ${username} отключился`);
    updateActivePlayers(playersCount);
}

/**
 * Обработка готовности игрока
 */
function handleGamePlayerReady(username, readyCount, totalPlayers) {
    // Обновляем статус игрока
    const player = GameState.game.players.find(p => p.username === username);
    if (player) {
        player.isReady = true;
    }
    
    // Обновляем отображение
    updateReadyGrid(GameState.game.players);
    showNotification(`Игрок ${username} готов к игре`);
}

/**
 * Обработка обратного отсчета
 */
function handleGameCountdown(countdown) {
    if (countdownDisplay) {
        countdownDisplay.style.display = 'block';
        const countdownTimer = countdownDisplay.querySelector('.countdown-timer');
        if (countdownTimer) {
            countdownTimer.textContent = countdown;
            
            // Анимация для последних 3 секунд
            if (countdown <= 3) {
                countdownTimer.style.animation = 'pulse 0.5s infinite';
                countdownTimer.style.color = '#e74c3c';
            }
        }
    }
}

/**
 * Обработка начала игры
 */
function handleGameStart(data) {
    console.log('Игра началась!', data);
    
    // Сохраняем данные игры
    GameState.gameId = data.gameId;
    GameState.game.status = 'in_progress';
    GameState.game.case = data.case;
    GameState.game.players = data.allPlayers;
    GameState.game.startTime = data.startTime;
    GameState.player.role = data.playerData.role;
    GameState.player.roleData = data.playerData.roleInfo;
    GameState.clues = data.playerData.clues || [];
    
    // Обновляем интерфейс
    updateGameInterface(data);
    
    // Загружаем интерфейс роли
    loadRoleInterface(data.playerData);
    
    // Скрываем лобби и показываем игровой интерфейс
    hideRoomLobby();
    showGamePlayInterface();
    
    // Запускаем таймер
    startGameTimer();
    
    // Включаем чат
    enableChat();
    
    // Показываем приветственное сообщение
    showWelcomeMessage();
}

/**
 * Обработка ошибки начала игры
 */
function handleGameStartError(message) {
    showError(`Ошибка начала игры: ${message}`);
    
    // Сбрасываем статус готовности
    GameState.player.isReady = false;
    if (readyButton) {
        readyButton.innerHTML = '<i class="fas fa-check-circle"></i> Готов к расследованию';
        readyButton.classList.remove('btn-success', 'btn-secondary');
        readyButton.classList.add('btn-success');
    }
}

/**
 * Обработка сообщения чата
 */
function handleChatMessage(message) {
    addChatMessage(message);
}

/**
 * Обработка истории чата
 */
function handleChatHistory(history) {
    if (Array.isArray(history)) {
        history.forEach(message => {
            addChatMessage(message, false); // false = не прокручивать вниз
        });
        
        // Прокручиваем к последнему сообщению
        scrollChatToBottom();
    }
}

/**
 * Обработка обновления состояния игры
 */
function handleGameStateUpdate(state) {
    console.log('Обновление состояния игры:', state);
    // Можно обновить таймер или другие элементы интерфейса
}

/**
 * Обновление интерфейса игры
 */
function updateGameInterface(data) {
    // Обновляем информацию о деле
    if (caseTitleDisplay && data.case) {
        caseTitleDisplay.textContent = data.case.title;
    }
    
    if (caseNameDisplay && data.case) {
        caseNameDisplay.textContent = data.case.title;
    }
    
    if (caseDescriptionDisplay && data.case) {
        caseDescriptionDisplay.textContent = data.case.description;
    }
    
    if (crimeTypeDisplay && data.case) {
        crimeTypeDisplay.textContent = data.case.crimeType || 'Неизвестно';
    }
    
    if (caseDifficultyDisplay && data.case) {
        caseDifficultyDisplay.textContent = data.case.difficulty || 'Средняя';
    }
    
    // Обновляем информацию о роли
    if (roleNameDisplay && data.playerData.roleInfo) {
        roleNameDisplay.textContent = data.playerData.roleInfo.name;
    }
    
    if (roleTitleDisplay && data.playerData.roleInfo) {
        roleTitleDisplay.textContent = data.playerData.roleInfo.name;
    }
    
    if (roleDescriptionDisplay && data.playerData.roleInfo) {
        roleDescriptionDisplay.textContent = data.playerData.roleInfo.description;
    }
    
    // Обновляем иконку роли
    if (roleIconDisplay && data.playerData.roleInfo) {
        roleIconDisplay.innerHTML = `<i class="fas fa-${getRoleIcon(data.playerData.role)}"></i>`;
    }
    
    // Обновляем бейдж роли
    if (roleBadge) {
        roleBadge.className = `role-badge ${data.playerData.role}`;
        roleBadge.innerHTML = `
            <i class="fas fa-${getRoleIcon(data.playerData.role)}"></i>
            <span>${data.playerData.roleInfo.name}</span>
        `;
    }
    
    // Обновляем способности и инструменты
    if (abilitiesList && data.playerData.roleInfo.abilities) {
        abilitiesList.innerHTML = '';
        data.playerData.roleInfo.abilities.forEach(ability => {
            const li = document.createElement('li');
            li.textContent = ability.name;
            abilitiesList.appendChild(li);
        });
    }
    
    if (itemsList && data.playerData.roleInfo.starting_items) {
        itemsList.innerHTML = '';
        data.playerData.roleInfo.starting_items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            itemsList.appendChild(li);
        });
    }
    
    // Обновляем список игроков с ролями
    updatePlayersListWithRoles(data.allPlayers);
    
    // Обновляем список улик
    updateEvidenceList(data.playerData.clues || []);
}

/**
 * Загрузка интерфейса роли
 */
function loadRoleInterface(playerData) {
    const roleInterfaceContainer = document.getElementById('role-specific-interface');
    if (!roleInterfaceContainer) return;
    
    // Очищаем контейнер
    roleInterfaceContainer.innerHTML = '';
    
    // Загружаем соответствующий модуль роли
    const role = playerData.role;
    const script = document.createElement('script');
    
    script.src = `js/roleInterfaces/${role}.js`;
    script.onload = function() {
        // Инициализируем интерфейс роли
        if (typeof window[`init${capitalizeFirst(role)}Interface`] === 'function') {
            window[`init${capitalizeFirst(role)}Interface`](playerData);
        } else if (typeof window[`init${role}Interface`] === 'function') {
            window[`init${role}Interface`](playerData);
        } else {
            // Заглушка, если модуль не загрузился
            roleInterfaceContainer.innerHTML = `
                <div class="role-interface-placeholder">
                    <h3><i class="fas fa-tools"></i> Интерфейс ${playerData.roleInfo.name}</h3>
                    <p>Специальные инструменты и информация доступны только вам.</p>
                    <div class="placeholder-content">
                        <p><strong>Ваши уникальные возможности:</strong></p>
                        <ul>
                            ${playerData.roleInfo.abilities?.map(a => `<li>${a.name}</li>`).join('') || ''}
                        </ul>
                        <p><strong>Доступные улики:</strong> ${playerData.clues?.length || 0}</p>
                    </div>
                </div>
            `;
        }
    };
    
    script.onerror = function() {
        // Ошибка загрузки модуля
        roleInterfaceContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить интерфейс роли. Основные функции доступны.</p>
            </div>
        `;
    };
    
    document.head.appendChild(script);
}

/**
 * Обновление списка игроков
 */
function updatePlayersList(players) {
    if (!playersList) return;
    
    playersList.innerHTML = '';
    GameState.game.players = players;
    
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        const roleIcon = getRoleIcon(player.role);
        const roleName = getRoleName(player.role);
        
        playerItem.innerHTML = `
            <div class="player-avatar">
                <i class="fas fa-${roleIcon}"></i>
            </div>
            <div class="player-name">${player.username}</div>
            <div class="player-role">${roleName}</div>
            ${player.isReady ? '<div class="player-ready"><i class="fas fa-check"></i></div>' : ''}
        `;
        
        playersList.appendChild(playerItem);
    });
}

/**
 * Обновление списка игроков с ролями
 */
function updatePlayersListWithRoles(players) {
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        const roleIcon = getRoleIcon(player.role);
        const roleName = getRoleName(player.role);
        
        playerItem.innerHTML = `
            <div class="player-avatar" style="background: ${getRoleColor(player.role)}">
                <i class="fas fa-${roleIcon}"></i>
            </div>
            <div class="player-name">${player.username}</div>
            <div class="player-role">${roleName}</div>
        `;
        
        playersList.appendChild(playerItem);
    });
}

/**
 * Обновление сетки готовности игроков
 */
function updateReadyGrid(players) {
    const readyGrid = document.getElementById('ready-grid');
    if (!readyGrid) return;
    
    readyGrid.innerHTML = '';
    
    // Создаем 4 слота
    for (let i = 0; i < 4; i++) {
        const player = players[i];
        const slot = document.createElement('div');
        slot.className = 'ready-slot';
        
        if (player) {
            slot.classList.add(player.isReady ? 'ready' : 'waiting');
            slot.innerHTML = `
                <i class="fas fa-${player.isReady ? 'check-circle' : 'user'}"></i>
                <div class="player-name">${player.username}</div>
                <div class="ready-status">${player.isReady ? 'Готов' : 'Ожидание'}</div>
            `;
        } else {
            slot.innerHTML = `
                <i class="fas fa-user-plus"></i>
                <div class="player-name">Ожидание игрока</div>
                <div class="ready-status">Свободно</div>
            `;
        }
        
        readyGrid.appendChild(slot);
    }
    
    // Обновляем счетчик готовых
    const readyCount = players.filter(p => p.isReady).length;
    const totalPlayers = players.length;
    
    if (readyCount === totalPlayers && totalPlayers === 4) {
        // Все готовы, показываем обратный отсчет
        if (countdownDisplay) {
            countdownDisplay.style.display = 'block';
        }
    }
}

/**
 * Обновление списка улик
 */
function updateEvidenceList(clues) {
    if (!evidenceList || !evidenceCountDisplay) return;
    
    GameState.clues = clues;
    evidenceList.innerHTML = '';
    
    if (clues.length === 0) {
        evidenceList.innerHTML = `
            <div class="no-evidence">
                <i class="fas fa-search"></i>
                <p>Улики еще не найдены</p>
            </div>
        `;
        evidenceCountDisplay.textContent = '0';
        return;
    }
    
    clues.forEach((clue, index) => {
        const evidenceItem = document.createElement('div');
        evidenceItem.className = `evidence-item clue-${clue.type || 'physical'}`;
        evidenceItem.dataset.clueId = clue.id;
        
        evidenceItem.innerHTML = `
            <div class="evidence-name">${clue.name || `Улика #${index + 1}`}</div>
            <div class="evidence-type">${getClueTypeName(clue.type)}</div>
            ${clue.description ? `<div class="evidence-description">${clue.description}</div>` : ''}
        `;
        
        // Обработчик клика для просмотра деталей
        evidenceItem.addEventListener('click', () => {
            showEvidenceDetails(clue);
        });
        
        evidenceList.appendChild(evidenceItem);
    });
    
    evidenceCountDisplay.textContent = clues.length;
    if (totalCluesDisplay) {
        totalCluesDisplay.textContent = clues.length;
    }
}

/**
 * Показать детали улики
 */
function showEvidenceDetails(clue) {
    const modal = document.getElementById('evidence-modal');
    const modalBody = document.getElementById('evidence-modal-body');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <h3>${clue.name || 'Улика'}</h3>
        <div class="evidence-meta">
            <span class="evidence-type-badge">${getClueTypeName(clue.type)}</span>
            ${clue.location ? `<span class="evidence-location"><i class="fas fa-map-marker-alt"></i> ${clue.location}</span>` : ''}
        </div>
        
        ${clue.description ? `<p class="evidence-description">${clue.description}</p>` : ''}
        
        ${clue.analysis ? `
            <div class="evidence-analysis">
                <h4><i class="fas fa-search"></i> Анализ</h4>
                <p>${clue.analysis}</p>
            </div>
        ` : ''}
        
        ${clue.accessibleTo ? `
            <div class="evidence-access">
                <h4><i class="fas fa-eye"></i> Доступно для:</h4>
                <p>${clue.accessibleTo === 'all' ? 'Всех ролей' : clue.accessibleTo}</p>
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

/**
 * Обновление таймера игры
 */
function startGameTimer() {
    if (GameState.game.timerInterval) {
        clearInterval(GameState.game.timerInterval);
    }
    
    GameState.game.timeRemaining = GameState.game.timeLimit * 60;
    updateTimerDisplay();
    
    GameState.game.timerInterval = setInterval(() => {
        GameState.game.timeRemaining--;
        updateTimerDisplay();
        
        if (GameState.game.timeRemaining <= 0) {
            clearInterval(GameState.game.timerInterval);
            showNotification('Время вышло!');
            // Здесь можно добавить логику завершения игры
        }
        
        // Предупреждение за 5 минут
        if (GameState.game.timeRemaining === 5 * 60) {
            showNotification('Осталось 5 минут!');
        }
        
        // Предупреждение за 1 минуту
        if (GameState.game.timeRemaining === 60) {
            showNotification('Осталась 1 минута!');
            if (gameTimerDisplay) {
                gameTimerDisplay.style.color = '#e74c3c';
                gameTimerDisplay.style.animation = 'pulse 1s infinite';
            }
        }
    }, 1000);
}

/**
 * Обновление отображения таймера
 */
function updateTimerDisplay() {
    if (!gameTimerDisplay) return;
    
    const minutes = Math.floor(GameState.game.timeRemaining / 60);
    const seconds = GameState.game.timeRemaining % 60;
    
    gameTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Включение чата
 */
function enableChat() {
    if (chatInput && sendMessageButton) {
        chatInput.disabled = false;
        sendMessageButton.disabled = false;
        chatInput.placeholder = 'Введите сообщение...';
    }
}

/**
 * Добавление сообщения в чат
 */
function addChatMessage(message, scrollToBottom = true) {
    if (!chatMessages) return;
    
    // Определяем, наше это сообщение или чужое
    const isOwnMessage = message.username === GameState.player.username;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    
    // Форматируем время
    const time = message.formattedTime || 
        new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <div class="message-sender">
                <span class="message-username">${message.username}</span>
                <span class="message-role">${getRoleName(message.role)}</span>
            </div>
            <div class="message-time">${time}</div>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    
    // Сохраняем в историю
    GameState.chat.messages.push(message);
    
    // Прокручиваем к последнему сообщению
    if (scrollToBottom) {
        scrollChatToBottom();
    }
}

/**
 * Отправка сообщения в чат
 */
function sendChatMessage() {
    if (!chatInput || chatInput.disabled) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Отправляем на сервер
    SocketClient.safeEmit('game:message', { message }, function(error) {
        showError(`Ошибка отправки сообщения: ${error}`);
    });
    
    // Очищаем поле ввода
    chatInput.value = '';
    updateCharCount();
    
    // Сбрасываем индикатор набора
    stopTypingIndicator();
}

/**
 * Очистка чата
 */
function clearChat() {
    if (chatMessages && confirm('Очистить всю историю чата?')) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <p>Добро пожаловать в чат расследования!</p>
                <p>Обсуждайте улики, делитесь теориями, работайте вместе.</p>
                <p class="hint"><i class="fas fa-lightbulb"></i> Совет: Подписывайте свои сообщения ролью, чтобы другим было понятнее</p>
            </div>
        `;
        GameState.chat.messages = [];
    }
}

/**
 * Переключение видимости чата
 */
function toggleChat() {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        const isHidden = chatContainer.style.display === 'none';
        chatContainer.style.display = isHidden ? 'flex' : 'none';
        
        if (toggleChatButton) {
            toggleChatButton.innerHTML = isHidden ? 
                '<i class="fas fa-chevron-down"></i>' : 
                '<i class="fas fa-chevron-up"></i>';
        }
    }
}

/**
 * Переключение боковой панели
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.game-sidebar');
    if (sidebar) {
        const isHidden = sidebar.style.display === 'none';
        sidebar.style.display = isHidden ? 'block' : 'none';
        
        if (toggleSidebarButton) {
            toggleSidebarButton.innerHTML = isHidden ? 
                '<i class="fas fa-bars"></i> Меню' : 
                '<i class="fas fa-times"></i> Закрыть';
        }
        
        GameState.interface.isSidebarOpen = isHidden;
    }
}

/**
 * Обработка ввода в чат
 */
function handleChatInput() {
    updateCharCount();
    
    // Индикатор набора текста
    if (GameState.chat.typingTimeout) {
        clearTimeout(GameState.chat.typingTimeout);
    }
    
    if (chatInput.value.trim()) {
        // Здесь можно отправить событие typing на сервер
        GameState.chat.isTyping = true;
        // updateTypingIndicator();
    }
    
    GameState.chat.typingTimeout = setTimeout(() => {
        GameState.chat.isTyping = false;
        // updateTypingIndicator();
    }, 1000);
}

/**
 * Обработка нажатия клавиш в чате
 */
function handleChatKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

/**
 * Обновление счетчика символов
 */
function updateCharCount() {
    if (!charCountDisplay || !chatInput) return;
    
    const length = chatInput.value.length;
    charCountDisplay.textContent = length;
    
    // Меняем цвет при приближении к лимиту
    if (length > 450) {
        charCountDisplay.style.color = '#e74c3c';
    } else if (length > 400) {
        charCountDisplay.style.color = '#f39c12';
    } else {
        charCountDisplay.style.color = '';
    }
}

/**
 * Обновление индикатора набора текста
 */
function updateTypingIndicator() {
    if (!typingIndicator) return;
    
    // Здесь можно показать, кто печатает
    // В реальном приложении нужно получать эту информацию с сервера
}

/**
 * Сброс индикатора набора текста
 */
function stopTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.textContent = '';
    }
}

/**
 * Переключение готовности игрока
 */
function togglePlayerReady() {
    if (GameState.player.isReady) {
        // Отмена готовности
        GameState.player.isReady = false;
        readyButton.innerHTML = '<i class="fas fa-check-circle"></i> Готов к расследованию';
        readyButton.classList.remove('btn-secondary');
        readyButton.classList.add('btn-success');
    } else {
        // Отметка готовности
        GameState.player.isReady = true;
        readyButton.innerHTML = '<i class="fas fa-times-circle"></i> Отменить готовность';
        readyButton.classList.remove('btn-success');
        readyButton.classList.add('btn-secondary');
        
        // Отправляем событие на сервер
        SocketClient.setPlayerReady();
    }
}

/**
 * Выход из комнаты
 */
function leaveRoom() {
    if (confirm('Вы уверены, что хотите покинуть комнату?')) {
        SocketClient.emit('room:leave');
        window.location.href = '/lobby.html';
    }
}

/**
 * Отчет о проблеме
 */
function reportIssue() {
    const issue = prompt('Опишите проблему, с которой вы столкнулись:');
    if (issue) {
        showNotification('Спасибо за сообщение о проблеме!');
        // Здесь можно отправить отчет на сервер
    }
}

/**
 * Обработка закрытия страницы
 */
function handleBeforeUnload(e) {
    if (GameState.game.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = 'Вы находитесь в активной игре. Вы уверены, что хотите уйти?';
        return e.returnValue;
    }
}

/**
 * Обработка горячих клавиш
 */
function handleHotkeys(e) {
    // Ctrl+Enter / Cmd+Enter - отправка сообщения
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (chatInput && document.activeElement === chatInput) {
            e.preventDefault();
            sendChatMessage();
        }
    }
    
    // Escape - выход из комнаты
    if (e.key === 'Escape' && GameState.game.status === 'lobby') {
        if (confirm('Покинуть комнату?')) {
            leaveRoom();
        }
    }
    
    // Ctrl+/ - помощь
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.classList.add('active');
        }
    }
}

/**
 * Показать приветственное сообщение
 */
function showWelcomeMessage() {
    const welcomeMessage = `
        <div class="welcome-message">
            <h3>Добро пожаловать в расследование!</h3>
            <p><strong>Дело:</strong> ${GameState.game.case?.title || 'Неизвестно'}</p>
            <p><strong>Ваша роль:</strong> ${GameState.player.roleData?.name || 'Неизвестно'}</p>
            <p>Используйте свои уникальные способности, чтобы помочь команде раскрыть дело.</p>
            <p class="hint"><i class="fas fa-lightbulb"></i> Общайтесь в чате и делитесь информацией!</p>
        </div>
    `;
    
    if (chatMessages) {
        const existingWelcome = chatMessages.querySelector('.welcome-message');
        if (existingWelcome) {
            existingWelcome.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message received';
        messageElement.innerHTML = welcomeMessage;
        chatMessages.appendChild(messageElement);
    }
}

/**
 * Обновление статуса соединения
 */
function updateConnectionStatus(connected) {
    GameState.connection.isConnected = connected;
    
    if (gameConnectionStatus) {
        gameConnectionStatus.innerHTML = connected ?
            '<i class="fas fa-wifi"></i> Онлайн' :
            '<i class="fas fa-wifi-slash"></i> Оффлайн';
        
        gameConnectionStatus.className = connected ? 'status-connected' : 'status-disconnected';
    }
}

/**
 * Обновление счетчика активных игроков
 */
function updateActivePlayers(count) {
    if (activePlayersDisplay) {
        activePlayersDisplay.textContent = count;
    }
}

/**
 * Обновление шага загрузки
 */
function updateLoadingStep(step) {
    const steps = document.querySelectorAll('.loading-steps .step');
    steps.forEach((s, index) => {
        if (index < step) {
            s.classList.add('active');
            s.innerHTML = '<i class="fas fa-check-circle"></i>' + s.innerHTML.substring(s.innerHTML.indexOf('<span>'));
        } else {
            s.classList.remove('active');
            s.innerHTML = '<i class="fas fa-circle"></i>' + s.innerHTML.substring(s.innerHTML.indexOf('<span>'));
        }
    });
}

/**
 * Скрыть экран загрузки
 */
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

/**
 * Показать игровой интерфейс
 */
function showGameInterface() {
    if (gameContainer) {
        gameContainer.style.display = 'block';
    }
}

/**
 * Скрыть лобби комнаты
 */
function hideRoomLobby() {
    if (roomLobby) {
        roomLobby.style.display = 'none';
    }
}

/**
 * Показать игровой интерфейс
 */
function showGamePlayInterface() {
    if (gameInterface) {
        gameInterface.style.display = 'block';
    }
}

/**
 * Вспомогательные функции
 */
function getRoleIcon(role) {
    const icons = {
        investigator: 'search',
        forensic: 'microscope',
        journalist: 'newspaper',
        privateEye: 'user-secret'
    };
    return icons[role] || 'user';
}

function getRoleName(role) {
    const names = {
        investigator: 'Следователь',
        forensic: 'Криминалист',
        journalist: 'Журналист',
        privateEye: 'Частный детектив'
    };
    return names[role] || 'Неизвестно';
}

function getRoleColor(role) {
    const colors = {
        investigator: '#3498db',
        forensic: '#2ecc71',
        journalist: '#e74c3c',
        privateEye: '#f39c12'
    };
    return colors[role] || '#95a5a6';
}

function getClueTypeName(type) {
    const names = {
        physical: 'Физическая улика',
        document: 'Документ',
        witness: 'Свидетельство',
        digital: 'Цифровая улика',
        location: 'Локационная улика'
    };
    return names[type] || 'Улика';
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'info' ? 'info-circle' : type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message, 'error');
}

function scrollChatToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Добавляем стили для игры
const gameStyles = document.createElement('style');
gameStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .loading-steps {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
    }
    
    .step {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.5);
        transition: color 0.3s ease;
    }
    
    .step.active {
        color: #3498db;
    }
    
    .role-interface-placeholder {
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .placeholder-content {
        margin-top: 15px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
    }
    
    .placeholder-content ul {
        margin: 10px 0;
        padding-left: 20px;
    }
    
    .evidence-meta {
        display: flex;
        gap: 10px;
        margin: 10px 0;
        flex-wrap: wrap;
    }
    
    .evidence-type-badge {
        background: #3498db;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
    }
    
    .evidence-location {
        color: #95a5a6;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .evidence-description {
        margin: 15px 0;
        line-height: 1.6;
    }
    
    .evidence-analysis,
    .evidence-access {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .evidence-analysis h4,
    .evidence-access h4 {
        margin-bottom: 10px;
        color: #3498db;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .status-connected {
        color: #2ecc71;
    }
    
    .status-disconnected {
        color: #e74c3c;
    }
    
    .player-ready {
        color: #2ecc71;
        font-size: 0.9rem;
    }
    
    .ready-slot.ready {
        background: rgba(46, 204, 113, 0.1);
        border: 1px solid rgba(46, 204, 113, 0.3);
    }
    
    .ready-slot.ready i {
        color: #2ecc71;
    }
    
    .ready-slot.waiting {
        background: rgba(243, 156, 18, 0.1);
        border: 1px solid rgba(243, 156, 18, 0.3);
    }
    
    .countdown-timer {
        font-size: 3rem;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
        color: #3498db;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
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
    }
    
    .notification-error {
        background: #e74c3c;
    }
    
    .notification-success {
        background: #2ecc71;
    }
`;
document.head.appendChild(gameStyles);