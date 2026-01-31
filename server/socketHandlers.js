const database = require('./database');

const setupSocketHandlers = (io, auth, gameState) => {
    // Middleware для аутентификации сокетов
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                console.log('Socket connection attempt without token');
                return next(new Error('Authentication required'));
            }
            
            const user = await auth.verifyToken(token);
            
            if (!user) {
                console.log('Invalid token for socket connection');
                return next(new Error('Invalid token'));
            }
            
            // Сохраняем данные пользователя в объекте socket
            socket.userId = user.id;
            socket.username = user.username;
            socket.level = user.level;
            
            console.log(`Socket authenticated: ${socket.username} (ID: ${user.id})`);
            next();
        } catch (error) {
            console.error('Socket auth middleware error:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    // Обработчик подключения
    io.on('connection', (socket) => {
        console.log(`New socket connection: ${socket.id} (${socket.username})`);
        
        // Сохраняем сокет в состоянии игры
        gameState.players.set(socket.id, {
            socketId: socket.id,
            username: socket.username,
            userId: socket.userId,
            roomId: null,
            role: null,
            isReady: false
        });

        // Отправляем подтверждение подключения
        socket.emit('connection:established', {
            socketId: socket.id,
            username: socket.username,
            level: socket.level
        });

        // Событие: запрос списка комнат
        socket.on('room:list_request', () => {
            try {
                const publicRooms = gameState.getPublicRooms();
                socket.emit('room:list_update', publicRooms);
                console.log(`Sent room list to ${socket.username} (${publicRooms.length} rooms)`);
            } catch (error) {
                console.error('Error getting room list:', error);
                socket.emit('error', { message: 'Failed to get room list' });
            }
        });

        // Событие: создание комнаты
        socket.on('room:create', (settings = {}) => {
            try {
                const room = gameState.createRoom(
                    socket.id,
                    socket.username,
                    socket.userId
                );
                
                // Обновляем настройки комнаты
                if (settings) {
                    room.settings = { ...room.settings, ...settings };
                }
                
                // Присоединяем сокет к комнате Socket.IO
                socket.join(room.id);
                
                // Отправляем данные комнаты создателю
                socket.emit('room:created', {
                    roomId: room.id,
                    players: room.players.map(p => ({
                        username: p.username,
                        isReady: p.isReady
                    })),
                    isCreator: true,
                    settings: room.settings
                });
                
                console.log(`Room ${room.id} created by ${socket.username}`);
                
                // Обновляем список комнат для всех в лобби
                updateRoomListForAll();
                
            } catch (error) {
                console.error('Error creating room:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Событие: присоединение к комнате
        socket.on('room:join', (roomId) => {
            try {
                const room = gameState.getRoom(roomId);
                
                if (!room) {
                    throw new Error('Room not found');
                }
                
                // Добавляем игрока в комнату
                const player = gameState.addPlayerToRoom(
                    socket.id,
                    roomId,
                    socket.username,
                    socket.userId
                );
                
                // Присоединяем сокет к комнате Socket.IO
                socket.join(roomId);
                
                // Обновляем данные игрока
                socket.playerData = player;
                
                // Отправляем данные комнаты присоединившемуся игроку
                socket.emit('room:joined', {
                    roomId: room.id,
                    players: room.players.map(p => ({
                        username: p.username,
                        isReady: p.isReady,
                        isCreator: room.creator.socketId === p.socketId
                    })),
                    isCreator: room.creator.socketId === socket.id,
                    settings: room.settings
                });
                
                // Уведомляем остальных игроков в комнате о новом участнике
                socket.to(roomId).emit('room:player_joined', {
                    username: socket.username,
                    playersCount: room.players.length
                });
                
                // Обновляем список игроков для всех в комнате
                updateRoomPlayers(roomId);
                
                console.log(`${socket.username} joined room ${roomId}`);
                
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Событие: выход из комнаты
        socket.on('room:leave', () => {
            try {
                const player = gameState.getPlayer(socket.id);
                
                if (!player || !player.roomId) {
                    return;
                }
                
                const roomId = player.roomId;
                const room = gameState.getRoom(roomId);
                
                // Выходим из комнаты Socket.IO
                socket.leave(roomId);
                
                // Удаляем игрока из состояния игры
                const leftPlayer = gameState.removePlayerFromRoom(socket.id);
                
                if (leftPlayer && room) {
                    // Уведомляем остальных игроков в комнате
                    socket.to(roomId).emit('room:player_left', {
                        username: leftPlayer.username,
                        playersCount: room.players.length,
                        newCreator: room.creator.username
                    });
                    
                    // Обновляем список игроков
                    updateRoomPlayers(roomId);
                    
                    // Если комната не удалена, обновляем список комнат
                    if (gameState.getRoom(roomId)) {
                        updateRoomListForAll();
                    }
                    
                    console.log(`${leftPlayer.username} left room ${roomId}`);
                }
                
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        });

        // Событие: игрок готов
        socket.on('game:ready', () => {
            try {
                const result = gameState.setPlayerReady(socket.id);
                
                if (!result) {
                    throw new Error('Failed to set player ready');
                }
                
                const player = gameState.getPlayer(socket.id);
                const roomId = player.roomId;
                const room = gameState.getRoom(roomId);
                
                // Уведомляем всех в комнате о готовности игрока
                io.to(roomId).emit('game:player_ready', {
                    username: socket.username,
                    readyCount: result.readyCount || gameState.getReadyPlayersCount(roomId),
                    totalPlayers: room.players.length
                });
                
                console.log(`${socket.username} is ready in room ${roomId}`);
                
                // Если можно начать игру, запускаем обратный отсчет
                if (result.canStart && room) {
                    console.log(`All players ready in room ${roomId}. Starting countdown...`);
                    
                    room.status = 'starting';
                    
                    // Отправляем обратный отсчет всем игрокам
                    let countdown = 5;
                    
                    const countdownInterval = setInterval(() => {
                        io.to(roomId).emit('game:countdown', { countdown });
                        
                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            startGameForRoom(roomId);
                        }
                        
                        countdown--;
                    }, 1000);
                }
                
            } catch (error) {
                console.error('Error setting player ready:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Событие: отправка сообщения в чат
        socket.on('game:message', (data) => {
            try {
                const { message } = data;
                
                if (!message || typeof message !== 'string' || message.trim().length === 0) {
                    throw new Error('Invalid message');
                }
                
                if (message.length > 500) {
                    throw new Error('Message too long (max 500 characters)');
                }
                
                const player = gameState.getPlayer(socket.id);
                
                if (!player || !player.roomId) {
                    throw new Error('Not in a room');
                }
                
                const room = gameState.getRoom(player.roomId);
                
                if (!room || room.status !== 'in_progress') {
                    throw new Error('Game not in progress');
                }
                
                // Добавляем сообщение в историю чата
                const chatMessage = gameState.addChatMessage(
                    room.gameId,
                    socket.id,
                    message
                );
                
                // Отправляем сообщение всем в комнате
                io.to(room.id).emit('game:chat_message', {
                    id: chatMessage.id,
                    username: socket.username,
                    role: player.role,
                    roleName: player.roleData?.name || 'Unknown',
                    message: chatMessage.message,
                    timestamp: chatMessage.timestamp,
                    formattedTime: chatMessage.formattedTime
                });
                
                // Сохраняем в БД (асинхронно, не блокируем ответ)
                if (room.gameId && socket.userId) {
                    database.saveChatMessage(
                        room.gameId,
                        socket.userId,
                        socket.username,
                        player.role,
                        chatMessage.message
                    ).catch(err => {
                        console.error('Failed to save chat message to DB:', err);
                    });
                }
                
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Событие: запрос истории чата
        socket.on('game:chat_history_request', () => {
            try {
                const player = gameState.getPlayer(socket.id);
                
                if (!player || !player.roomId) {
                    return;
                }
                
                const room = gameState.getRoom(player.roomId);
                
                if (!room || !room.gameId) {
                    return;
                }
                
                const chatHistory = gameState.getChatHistory(room.gameId);
                socket.emit('game:chat_history', chatHistory);
                
            } catch (error) {
                console.error('Error getting chat history:', error);
            }
        });

        // Событие: запрос обновления игрового состояния
        socket.on('game:state_request', () => {
            try {
                const player = gameState.getPlayer(socket.id);
                
                if (!player || !player.roomId) {
                    return;
                }
                
                const room = gameState.getRoom(player.roomId);
                
                if (!room || room.status !== 'in_progress') {
                    return;
                }
                
                // Отправляем текущее состояние игры игроку
                const game = gameState.games.get(room.gameId);
                
                if (game) {
                    socket.emit('game:state_update', {
                        gameId: game.id,
                        players: game.players.map(p => ({
                            username: p.username,
                            role: p.role
                        })),
                        timeElapsed: Math.floor((Date.now() - game.startTime) / 1000)
                    });
                }
                
            } catch (error) {
                console.error('Error sending game state:', error);
            }
        });

        // Событие: отключение игрока
        socket.on('disconnect', (reason) => {
            try {
                console.log(`Socket disconnected: ${socket.id} (${socket.username}) - Reason: ${reason}`);
                
                // Обрабатываем выход из комнаты
                const player = gameState.getPlayer(socket.id);
                
                if (player && player.roomId) {
                    const roomId = player.roomId;
                    const room = gameState.getRoom(roomId);
                    
                    // Выходим из комнаты Socket.IO
                    socket.leave(roomId);
                    
                    // Удаляем игрока из состояния игры
                    const leftPlayer = gameState.removePlayerFromRoom(socket.id);
                    
                    if (leftPlayer && room) {
                        // Уведомляем остальных игроков об отключении
                        io.to(roomId).emit('room:player_disconnected', {
                            username: leftPlayer.username,
                            playersCount: room.players.length
                        });
                        
                        // Обновляем список игроков
                        updateRoomPlayers(roomId);
                        
                        console.log(`${leftPlayer.username} disconnected from room ${roomId}`);
                    }
                }
                
                // Удаляем игрока из основного хранилища
                gameState.players.delete(socket.id);
                gameState.readyPlayers.delete(socket.id);
                
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // Вспомогательные функции
        function updateRoomListForAll() {
            const publicRooms = gameState.getPublicRooms();
            io.emit('room:list_update', publicRooms);
        }

        function updateRoomPlayers(roomId) {
            const room = gameState.getRoom(roomId);
            
            if (room) {
                io.to(roomId).emit('room:players_update', {
                    players: room.players.map(p => ({
                        username: p.username,
                        isReady: p.isReady,
                        isCreator: room.creator.socketId === p.socketId
                    })),
                    readyCount: gameState.getReadyPlayersCount(roomId),
                    totalPlayers: room.players.length
                });
            }
        }

        function startGameForRoom(roomId) {
            try {
                console.log(`Starting game for room ${roomId}`);
                
                const gameData = gameState.startGame(roomId);
                
                if (!gameData) {
                    throw new Error('Failed to start game');
                }
                
                const room = gameState.getRoom(roomId);
                
                // Создаем запись об игре в БД
                database.createGame(roomId, gameData.case.id)
                    .then(gameDbId => {
                        // Добавляем участников в БД
                        const participantPromises = room.players.map(player => {
                            return database.addGameParticipant(
                                gameDbId,
                                player.userId,
                                player.role
                            );
                        });
                        
                        return Promise.all(participantPromises);
                    })
                    .then(() => {
                        console.log(`Game ${gameData.gameId} saved to database`);
                    })
                    .catch(err => {
                        console.error('Failed to save game to database:', err);
                    });
                
                // Отправляем данные игры каждому игроку
                room.players.forEach(player => {
                    const playerSocket = io.sockets.sockets.get(player.socketId);
                    
                    if (playerSocket) {
                        playerSocket.emit('game:start', {
                            gameId: gameData.gameId,
                            playerData: gameData.playerData[player.socketId],
                            allPlayers: gameData.players,
                            case: gameData.case,
                            startTime: Date.now()
                        });
                        
                        console.log(`Game data sent to ${player.username} (role: ${player.role})`);
                    }
                });
                
                console.log(`Game started in room ${roomId}. Case: ${gameData.case.title}`);
                
            } catch (error) {
                console.error('Error starting game:', error);
                
                // Уведомляем игроков об ошибке
                io.to(roomId).emit('game:start_error', {
                    message: error.message
                });
                
                // Возвращаем комнату в состояние ожидания
                const room = gameState.getRoom(roomId);
                if (room) {
                    room.status = 'waiting';
                    room.players.forEach(p => {
                        p.isReady = false;
                        gameState.readyPlayers.delete(p.socketId);
                    });
                    
                    updateRoomPlayers(roomId);
                }
            }
        }

        // Периодическая очистка старых комнат (раз в час)
        setInterval(() => {
            gameState.cleanupOldRooms(1); // Очищаем комнаты старше 1 часа
        }, 60 * 60 * 1000);
    });

    console.log('Socket.IO handlers setup complete');
};

module.exports = setupSocketHandlers;