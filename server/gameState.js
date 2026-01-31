const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class GameState {
    constructor() {
        // Хранение в памяти (для быстрого доступа во время игры)
        this.rooms = new Map();           // roomId -> roomData
        this.players = new Map();         // socketId -> playerData
        this.games = new Map();           // gameId -> gameData
        this.readyPlayers = new Set();    // socketId готовых игроков
        
        // Загрузка конфигурации ролей
        this.rolesConfig = {};
        this.loadRolesConfig();
        
        // Загрузка дел
        this.cases = {};
        this.loadCases();
    }

    // Загрузка конфигурации ролей
    async loadRolesConfig() {
        try {
            const rolesDir = path.join(__dirname, 'roles');
            const roleFiles = ['investigator.json', 'forensic.json', 'journalist.json', 'privateEye.json'];
            
            for (const file of roleFiles) {
                const filePath = path.join(rolesDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const roleName = file.replace('.json', '');
                this.rolesConfig[roleName] = JSON.parse(data);
            }
            
            console.log('Roles configuration loaded:', Object.keys(this.rolesConfig));
        } catch (error) {
            console.error('Error loading roles config:', error);
            
            // Fallback конфигурация
            this.rolesConfig = {
                investigator: {
                    name: "Следователь",
                    description: "Официальный представитель правопорядка",
                    abilities: ["Видит все улики первым", "Может делать официальные запросы"],
                    color: "#3498db"
                },
                forensic: {
                    name: "Эксперт-криминалист",
                    description: "Специалист по научным доказательствам",
                    abilities: ["Видит детализированную информацию", "Анализирует улики на глубоком уровне"],
                    color: "#2ecc71"
                },
                journalist: {
                    name: "Журналист",
                    description: "Исследователь социальных связей",
                    abilities: ["Видит связи между NPC", "Имеет доступ к слухам"],
                    color: "#e74c3c"
                },
                privateEye: {
                    name: "Частный детектив",
                    description: "Теневой искатель правды",
                    abilities: ["Видит скрытые мотивы", "Может следить за персонажами"],
                    color: "#f39c12"
                }
            };
        }
    }

    // Загрузка дел
    async loadCases() {
        try {
            const casesDir = path.join(__dirname, 'cases');
            const caseFiles = await fs.readdir(casesDir);
            
            for (const file of caseFiles) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(casesDir, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const caseId = file.replace('.json', '');
                    this.cases[caseId] = JSON.parse(data);
                }
            }
            
            console.log('Cases loaded:', Object.keys(this.cases));
        } catch (error) {
            console.error('Error loading cases:', error);
            
            // Fallback тестовое дело
            this.cases = {
                tutorial: {
                    id: "tutorial",
                    title: "Пропавшая ваза",
                    description: "В музее современного искусства пропала древняя китайская ваза династии Мин. Инцидент произошел во время частного просмотра.",
                    crimeType: "кража",
                    difficulty: 1,
                    suspects: [
                        { id: "suspect1", name: "Доктор Артур Вэнс", role: "Куратор музея", motive: "Долговые проблемы" },
                        { id: "suspect2", name: "Миллисент Фэрчайлд", role: "Благотворитель", motive: "Страховая афера" },
                        { id: "suspect3", name: "Виктор Кроули", role: "Охранник", motive: "Связь с черным рынком" }
                    ],
                    clues: [
                        { id: "clue1", type: "physical", description: "Отпечатки на витрине", foundBy: "all" },
                        { id: "clue2", type: "document", description: "Страховой полис", foundBy: "investigator,privateEye" },
                        { id: "clue3", type: "witness", description: "Показания уборщицы", foundBy: "journalist" },
                        { id: "clue4", type: "digital", description: "Записи камер наблюдения", foundBy: "investigator,forensic" },
                        { id: "clue5", type: "physical", description: "Обрывок ткани", foundBy: "forensic" },
                        { id: "clue6", type: "document", description: "Тайное письмо", foundBy: "privateEye" }
                    ],
                    solution: {
                        culprit: "suspect1",
                        method: "Подмена во время инвентаризации",
                        motive: "Попытка продать на черном рынке для покрытия долгов"
                    }
                }
            };
        }
    }

    // Создание новой комнаты
    createRoom(creatorSocketId, creatorUsername, creatorUserId) {
        const roomId = uuidv4().substring(0, 8); // Короткий ID для удобства
        
        const room = {
            id: roomId,
            creator: {
                socketId: creatorSocketId,
                username: creatorUsername,
                userId: creatorUserId
            },
            players: [],
            maxPlayers: 4,
            status: 'waiting', // waiting, starting, in_progress, finished
            caseId: null,
            gameId: null,
            createdAt: Date.now(),
            settings: {
                isPublic: true,
                difficulty: 'normal',
                timeLimit: 30 // минуты
            }
        };

        this.rooms.set(roomId, room);
        
        // Добавляем создателя в комнату
        this.addPlayerToRoom(creatorSocketId, roomId, creatorUsername, creatorUserId);
        
        console.log(`Room created: ${roomId} by ${creatorUsername}`);
        
        return room;
    }

    // Добавление игрока в комнату
    addPlayerToRoom(socketId, roomId, username, userId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Room not found');
        }
        
        if (room.players.length >= room.maxPlayers) {
            throw new Error('Room is full');
        }
        
        if (room.status !== 'waiting') {
            throw new Error('Game already in progress');
        }
        
        // Проверяем, не находится ли игрок уже в другой комнате
        const existingPlayer = this.players.get(socketId);
        if (existingPlayer && existingPlayer.roomId !== roomId) {
            this.removePlayerFromRoom(socketId);
        }
        
        // Создаем объект игрока
        const player = {
            socketId,
            username,
            userId,
            roomId,
            role: null,
            isReady: false,
            joinedAt: Date.now(),
            lastActivity: Date.now()
        };
        
        // Обновляем хранилища
        this.players.set(socketId, player);
        room.players.push(player);
        
        console.log(`Player ${username} joined room ${roomId}`);
        
        return player;
    }

    // Удаление игрока из комнаты
    removePlayerFromRoom(socketId) {
        const player = this.players.get(socketId);
        
        if (!player) {
            return null;
        }
        
        const room = this.rooms.get(player.roomId);
        
        if (room) {
            // Удаляем игрока из списка игроков комнаты
            room.players = room.players.filter(p => p.socketId !== socketId);
            
            // Если игрок был готов, удаляем из readyPlayers
            if (player.isReady) {
                this.readyPlayers.delete(socketId);
            }
            
            // Если комната пуста, удаляем ее
            if (room.players.length === 0) {
                this.rooms.delete(room.id);
                console.log(`Room ${room.id} deleted (empty)`);
            } else {
                // Если ушел создатель, назначаем нового
                if (room.creator.socketId === socketId && room.players.length > 0) {
                    room.creator = {
                        socketId: room.players[0].socketId,
                        username: room.players[0].username,
                        userId: room.players[0].userId
                    };
                    console.log(`New creator for room ${room.id}: ${room.creator.username}`);
                }
                
                console.log(`Player ${player.username} left room ${room.id}. Remaining: ${room.players.length}`);
            }
        }
        
        // Удаляем игрока из основного хранилища
        this.players.delete(socketId);
        
        return player;
    }

    // Игрок отмечается готовым
    setPlayerReady(socketId) {
        const player = this.players.get(socketId);
        
        if (!player) {
            throw new Error('Player not found');
        }
        
        const room = this.rooms.get(player.roomId);
        
        if (!room) {
            throw new Error('Room not found');
        }
        
        if (room.status !== 'waiting') {
            throw new Error('Game already in progress');
        }
        
        player.isReady = true;
        this.readyPlayers.add(socketId);
        
        console.log(`Player ${player.username} is ready in room ${room.id}`);
        
        // Проверяем, можно ли начать игру
        if (this.canStartGame(room.id)) {
            room.status = 'starting';
            return { canStart: true, room };
        }
        
        return { canStart: false, readyCount: this.getReadyPlayersCount(room.id) };
    }

    // Проверка, можно ли начать игру
    canStartGame(roomId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return false;
        }
        
        // Все 4 игрока должны быть на месте и готовы
        if (room.players.length !== 4) {
            return false;
        }
        
        return room.players.every(player => player.isReady);
    }

    // Получение количества готовых игроков в комнате
    getReadyPlayersCount(roomId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return 0;
        }
        
        return room.players.filter(player => player.isReady).length;
    }

    // Начало игры
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Room not found');
        }
        
        if (!this.canStartGame(roomId)) {
            throw new Error('Not all players are ready');
        }
        
        // Выбираем случайное дело (пока только tutorial)
        const caseId = 'tutorial';
        const caseData = this.cases[caseId];
        
        if (!caseData) {
            throw new Error('Case not found');
        }
        
        room.caseId = caseId;
        room.status = 'in_progress';
        room.startedAt = Date.now();
        
        // Распределяем роли случайным образом
        const roles = ['investigator', 'forensic', 'journalist', 'privateEye'];
        const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
        
        // Назначаем роли игрокам
        room.players.forEach((player, index) => {
            player.role = shuffledRoles[index];
            player.roleData = this.rolesConfig[player.role];
        });
        
        // Создаем объект игры
        const gameId = uuidv4();
        const game = {
            id: gameId,
            roomId,
            caseId,
            players: room.players.map(p => ({
                socketId: p.socketId,
                username: p.username,
                userId: p.userId,
                role: p.role
            })),
            startTime: Date.now(),
            status: 'active',
            cluesRevealed: [],
            votes: {},
            chatMessages: []
        };
        
        this.games.set(gameId, game);
        room.gameId = gameId;
        
        console.log(`Game started in room ${roomId}. Game ID: ${gameId}`);
        
        // Подготавливаем данные для каждого игрока
        const playerData = this.preparePlayerData(room, caseData);
        
        return {
            gameId,
            case: caseData,
            players: room.players.map(p => ({
                username: p.username,
                role: p.role,
                roleName: p.roleData.name
            })),
            playerData
        };
    }

    // Подготовка данных для каждого игрока
    preparePlayerData(room, caseData) {
        const playerData = {};
        
        room.players.forEach(player => {
            const role = player.role;
            
            // Базовые данные для всех
            playerData[player.socketId] = {
                role,
                roleInfo: this.rolesConfig[role],
                caseInfo: {
                    title: caseData.title,
                    description: caseData.description,
                    crimeType: caseData.crimeType,
                    difficulty: caseData.difficulty
                },
                clues: [],
                suspects: caseData.suspects,
                specialInfo: {}
            };
            
            // Фильтруем улики, доступные этой роли
            const roleClues = caseData.clues.filter(clue => {
                if (!clue.foundBy || clue.foundBy === 'all') {
                    return true;
                }
                
                const allowedRoles = clue.foundBy.split(',').map(r => r.trim());
                return allowedRoles.includes(role);
            });
            
            playerData[player.socketId].clues = roleClues;
            
            // Добавляем специальную информацию в зависимости от роли
            switch (role) {
                case 'investigator':
                    playerData[player.socketId].specialInfo = {
                        officialDocuments: [
                            "Отчет об ограблениях в районе за последний месяц",
                            "Список персонала музея с допусками"
                        ],
                        databaseAccess: "Доступ к полицейской базе данных"
                    };
                    break;
                    
                case 'forensic':
                    playerData[player.socketId].specialInfo = {
                        labAnalysis: [
                            "Химический анализ волокон ткани",
                            "База данных отпечатков пальцев"
                        ],
                        detailedClues: roleClues.map(clue => ({
                            ...clue,
                            detailedInfo: `Подробный анализ: ${clue.description}. Вероятность совпадения: ${Math.floor(Math.random() * 100)}%`
                        }))
                    };
                    break;
                    
                case 'journalist':
                    playerData[player.socketId].specialInfo = {
                        socialConnections: [
                            "Доктор Вэнс и Миллисент Фэрчайлд были замечены на благотворительном вечере 2 недели назад",
                            "Охранник Кроули ранее работал в частной охранной компании, связанной с арт-дилерами"
                        ],
                        rumors: [
                            "Слух: ваза была застрахована на сумму, превышающую ее реальную стоимость",
                            "Слух: в музее планировались сокращения штата"
                        ]
                    };
                    break;
                    
                case 'privateEye':
                    playerData[player.socketId].specialInfo = {
                        hiddenMotives: caseData.suspects.map(suspect => ({
                            name: suspect.name,
                            hiddenMotive: suspect.motive,
                            additionalInfo: `Тайные встречи: ${Math.floor(Math.random() * 5)} раз за последнюю неделю`
                        })),
                        surveillanceReports: [
                            "Доктор Вэнс посещал банк 3 раза на прошлой неделе",
                            "Миллисент Фэрчайлд недавно приобрела билет в Швейцарию"
                        ]
                    };
                    break;
            }
        });
        
        return playerData;
    }

    // Получение комнаты по ID
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // Получение комнаты по socketId игрока
    getRoomByPlayerSocket(socketId) {
        const player = this.players.get(socketId);
        return player ? this.rooms.get(player.roomId) : null;
    }

    // Получение игрока по socketId
    getPlayer(socketId) {
        return this.players.get(socketId);
    }

    // Получение списка публичных комнат
    getPublicRooms() {
        const publicRooms = [];
        
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.status === 'waiting' && room.settings.isPublic && room.players.length < room.maxPlayers) {
                publicRooms.push({
                    id: roomId,
                    creator: room.creator.username,
                    players: room.players.length,
                    maxPlayers: room.maxPlayers,
                    settings: room.settings
                });
            }
        }
        
        return publicRooms;
    }

    // Отправка сообщения в чат
    addChatMessage(gameId, socketId, message) {
        const game = this.games.get(gameId);
        
        if (!game) {
            throw new Error('Game not found');
        }
        
        const player = game.players.find(p => p.socketId === socketId);
        
        if (!player) {
            throw new Error('Player not in game');
        }
        
        const chatMessage = {
            id: uuidv4().substring(0, 8),
            gameId,
            socketId,
            username: player.username,
            role: player.role,
            message: message.trim(),
            timestamp: Date.now(),
            formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        game.chatMessages.push(chatMessage);
        
        // Ограничиваем историю сообщений (последние 100)
        if (game.chatMessages.length > 100) {
            game.chatMessages = game.chatMessages.slice(-100);
        }
        
        return chatMessage;
    }

    // Получение истории чата
    getChatHistory(gameId) {
        const game = this.games.get(gameId);
        return game ? game.chatMessages : [];
    }

    // Завершение игры
    finishGame(gameId, results) {
        const game = this.games.get(gameId);
        
        if (!game) {
            throw new Error('Game not found');
        }
        
        game.status = 'finished';
        game.endTime = Date.now();
        game.duration = Math.floor((game.endTime - game.startTime) / 1000); // в секундах
        game.results = results;
        
        // Находим комнату
        const room = Array.from(this.rooms.values()).find(r => r.gameId === gameId);
        if (room) {
            room.status = 'finished';
        }
        
        console.log(`Game ${gameId} finished. Duration: ${game.duration} seconds`);
        
        return game;
    }

    // Очистка старых комнат (для обслуживания)
    cleanupOldRooms(maxAgeHours = 24) {
        const now = Date.now();
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
        let cleanedCount = 0;
        
        for (const [roomId, room] of this.rooms.entries()) {
            if (now - room.createdAt > maxAgeMs) {
                // Удаляем всех игроков из комнаты
                room.players.forEach(player => {
                    this.players.delete(player.socketId);
                    this.readyPlayers.delete(player.socketId);
                });
                
                this.rooms.delete(roomId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} old rooms`);
        }
    }
}

// Экспорт singleton экземпляра
const gameState = new GameState();
module.exports = gameState;