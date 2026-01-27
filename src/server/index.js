const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

// Наши модули
const GameDatabase = require('./database/Database');
const AuthService = require('./auth/AuthService');

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*", // В разработке разрешаем все
        methods: ["GET", "POST"]
      }
    });
    
    // Инициализация БД
    this.db = new GameDatabase();
    
    // Инициализация Auth
    this.auth = new AuthService(this.db);
    
    // Настройка Express
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    
    this.rooms = new Map(); // Активные комнаты в памяти
    this.userSockets = new Map(); // userId -> socket.id
  }
  
  setupMiddleware() {
    // CORS
    this.app.use(cors());
    
    // Парсинг JSON
    this.app.use(express.json());
    
    // Раздача статических файлов из src/client
    const clientPath = path.join(__dirname, '../../src/client');
    console.log('Serving static files from:', clientPath);
    this.app.use(express.static(clientPath));
    
    // Логирование запросов
    this.app.use((req, res, next) => {
      console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url}`);
      next();
    });
  }
  
  setupRoutes() {
    // API маршруты
    
    // Проверка здоровья
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        players: this.io.engine.clientsCount,
        version: '1.0.0'
      });
    });
    
    // Регистрация
    this.app.post('/api/auth/register', async (req, res) => {
      try {
        const { email, username, password } = req.body;
        
        console.log('Registration attempt:', { email, username });
        
        if (!email || !username || !password) {
          console.log('Registration failed: missing fields');
          return res.status(400).json({
            success: false,
            error: 'Все поля обязательны'
          });
        }
        
        const result = await this.auth.register(email, username, password);
        console.log('Registration successful:', result.user?.username);
        res.json(result);
        
      } catch (error) {
        console.error('Registration error:', error.message);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // Вход
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        console.log('Login attempt:', { email });
        
        if (!email || !password) {
          console.log('Login failed: missing fields');
          return res.status(400).json({
            success: false,
            error: 'Email и пароль обязательны'
          });
        }
        
        const result = await this.auth.login(email, password);
        console.log('Login successful:', result.user?.username);
        res.json(result);
        
      } catch (error) {
        console.error('Login error:', error.message);
        res.status(401).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // Проверка токена
    this.app.get('/api/auth/verify', this.auth.authMiddleware.bind(this.auth), (req, res) => {
      res.json({
        success: true,
        user: req.user
      });
    });
    
    // Получение списка комнат
    this.app.get('/api/rooms', this.auth.authMiddleware.bind(this.auth), (req, res) => {
      try {
        // Получаем все активные комнаты
        const rooms = Array.from(this.rooms.values()).map(room => ({
          id: room.id,
          name: room.name,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isReady: p.isReady
          })),
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          status: room.status,
          creatorId: room.creatorId,
          createdAt: room.createdAt
        }));
        
        res.json({
          success: true,
          rooms: rooms.filter(room => room.status === 'waiting')
        });
      } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения списка комнат'
        });
      }
    });
    
    // Лидерборд
    this.app.get('/api/leaderboard', (req, res) => {
      const limit = parseInt(req.query.limit) || 100;
      const leaderboard = this.db.getLeaderboard(limit);
      res.json({ success: true, leaderboard });
    });
    
    // Профиль пользователя
    this.app.get('/api/users/:id', async (req, res) => {
      try {
        const userId = req.params.id;
        const user = this.db.getUserById(userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'Пользователь не найден'
          });
        }
        
        // Очищаем данные
        const safeUser = this.auth.sanitizeUser(user);
        res.json({ success: true, user: safeUser });
        
      } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
          success: false,
          error: 'Ошибка сервера'
        });
      }
    });
    
    // Все остальные маршруты ведут на index.html (для SPA)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../src/client/index.html'));
    });
  }
  
  setupSocketIO() {
    // Middleware для аутентификации WebSocket
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('WebSocket: попытка подключения без токена');
        return next(new Error('Требуется аутентификация'));
      }
      
      try {
        const decoded = this.auth.verifyToken(token);
        if (!decoded) {
          return next(new Error('Неверный или просроченный токен'));
        }
        
        // Сохраняем данные пользователя в сокете
        socket.userId = decoded.userId;
        socket.userData = decoded;
        
        next();
      } catch (error) {
        console.error('WebSocket auth error:', error);
        next(new Error('Ошибка аутентификации'));
      }
    });
    
    this.io.on('connection', (socket) => {
      console.log('🔌 Новое подключение:', socket.id, socket.userData?.username || 'Аноним');
      
      // Сохраняем связь userId -> socket.id
      if (socket.userId) {
        this.userSockets.set(socket.userId, socket.id);
      }
      
      // Приветствие
      socket.emit('server:hello', {
        message: 'Добро пожаловать в Детектив-Квартет!',
        timestamp: Date.now(),
        version: '1.0.0'
      });
      
      // Уведомляем о успешном подключении
      if (socket.userId) {
        socket.emit('auth:success', {
          user: socket.userData,
          message: 'Аутентификация успешна'
        });
        
        // Присоединяем к комнате пользователя
        socket.join(`user_${socket.userId}`);
      }
      
      // Создание комнаты
      socket.on('room:create', (data, callback) => {
        this.handleCreateRoom(socket, data, callback);
      });
      
      // Присоединение к комнате
      socket.on('room:join', (data, callback) => {
        this.handleJoinRoom(socket, data, callback);
      });
      
      // Выход из комнаты
      socket.on('room:leave', (data) => {
        this.handleLeaveRoom(socket, data);
      });
      
      // Сообщение в чат
      socket.on('room:chat_message', (data) => {
        this.handleChatMessage(socket, data);
      });
      
      // Изменение статуса "готов"
      socket.on('room:set_ready', (data) => {
        this.handleSetReady(socket, data);
      });
      
      // Начало игры
      socket.on('game:start', (data, callback) => {
        this.handleStartGame(socket, data, callback);
      });
      
      // Запрос информации о комнате
      socket.on('room:get_info', (data, callback) => {
        this.handleGetRoomInfo(socket, data, callback);
      });
      
      // Получение списка комнат
      socket.on('rooms:list', (callback) => {
        this.handleListRooms(socket, callback);
      });
      
      // Отключение
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
      
      // Ошибки сокета
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }
  
  // ==================== ОБРАБОТЧИКИ КОМНАТ ====================
  
  handleCreateRoom(socket, data, callback) {
    try {
      // Проверяем аутентификацию
      if (!socket.userId) {
        if (callback) callback({ success: false, error: 'Требуется аутентификация' });
        return;
      }
      
      const { roomName, maxPlayers = 4 } = data;
      
      if (!roomName || roomName.trim() === '') {
        if (callback) callback({ success: false, error: 'Название комнаты обязательно' });
        return;
      }
      
      if (maxPlayers < 2 || maxPlayers > 8) {
        if (callback) callback({ success: false, error: 'Количество игроков должно быть от 2 до 8' });
        return;
      }
      
      // Создаём уникальный ID комнаты
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Создаём комнату в БД
      const dbRoomId = this.db.createRoom(roomName.trim(), socket.userId, maxPlayers);
      
      // Добавляем создателя в комнату в БД
      this.db.addPlayerToRoom(dbRoomId, socket.userId);
      
      // Создаём комнату в памяти
      const room = {
        id: dbRoomId,
        name: roomName.trim(),
        creatorId: socket.userId,
        players: new Map(),
        maxPlayers,
        status: 'waiting',
        chat: [],
        createdAt: Date.now()
      };
      
      // Добавляем создателя как первого игрока
      room.players.set(socket.userId, {
        id: socket.userId,
        name: socket.userData?.username || 'Игрок',
        socketId: socket.id,
        isReady: false,
        joinedAt: Date.now()
      });
      
      this.rooms.set(dbRoomId, room);
      
      // Присоединяем сокет к комнате
      socket.join(dbRoomId);
      socket.currentRoom = dbRoomId;
      
      console.log(`🆕 Комната создана: ${roomName} (${dbRoomId}) создателем ${socket.userData?.username}`);
      
      // Подготавливаем информацию об игроках
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isCreator: p.id === room.creatorId
      }));
      
      // Отправляем ответ создателю
      if (callback) {
        callback({
          success: true,
          room: {
            id: dbRoomId,
            name: roomName.trim(),
            players,
            maxPlayers,
            status: 'waiting',
            isCreator: true
          }
        });
      }
      
      // Уведомляем создателя о успешном создании
      socket.emit('room:created', {
        roomId: dbRoomId,
        roomName: roomName.trim(),
        players,
        maxPlayers
      });
      
      // Отправляем обновление всем в лобби
      this.io.emit('rooms:updated', {
        action: 'created',
        room: {
          id: dbRoomId,
          name: roomName.trim(),
          playerCount: 1,
          maxPlayers,
          status: 'waiting'
        }
      });
      
    } catch (error) {
      console.error('Error creating room:', error);
      if (callback) {
        callback({ success: false, error: error.message || 'Ошибка создания комнаты' });
      }
    }
  }
  
  handleJoinRoom(socket, data, callback) {
    try {
      // Проверяем аутентификацию
      if (!socket.userId) {
        if (callback) callback({ success: false, error: 'Требуется аутентификация' });
        return;
      }
      
      const { roomId } = data;
      
      // Проверяем существование комнаты
      const room = this.rooms.get(roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Комната не найдена' });
        return;
      }
      
      // Проверяем статус комнаты
      if (room.status !== 'waiting') {
        if (callback) callback({ success: false, error: 'Игра уже началась' });
        return;
      }
      
      // Проверяем количество игроков
      if (room.players.size >= room.maxPlayers) {
        if (callback) callback({ success: false, error: 'Комната заполнена' });
        return;
      }
      
      // Проверяем, не находится ли игрок уже в комнате
      if (room.players.has(socket.userId)) {
        if (callback) callback({ success: false, error: 'Вы уже в этой комнате' });
        return;
      }
      
      // Добавляем игрока в комнату в БД
      this.db.addPlayerToRoom(roomId, socket.userId);
      
      // Добавляем игрока в комнату в памяти
      room.players.set(socket.userId, {
        id: socket.userId,
        name: socket.userData?.username || 'Игрок',
        socketId: socket.id,
        isReady: false,
        joinedAt: Date.now()
      });
      
      // Присоединяем сокет к комнате
      socket.join(roomId);
      socket.currentRoom = roomId;
      
      console.log(`➕ ${socket.userData?.username} присоединился к комнате ${room.name}`);
      
      // Подготавливаем информацию об игроках
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isCreator: p.id === room.creatorId
      }));
      
      // Отправляем ответ присоединившемуся
      if (callback) {
        callback({
          success: true,
          room: {
            id: roomId,
            name: room.name,
            players,
            maxPlayers: room.maxPlayers,
            status: room.status,
            isCreator: room.creatorId === socket.userId
          }
        });
      }
      
      // Уведомляем всех в комнате о новом игроке
      this.io.to(roomId).emit('room:player_joined', {
        player: {
          id: socket.userId,
          name: socket.userData?.username || 'Игрок',
          isCreator: false
        },
        players,
        roomId,
        playerCount: room.players.size
      });
      
      // Отправляем обновление комнаты
      this.io.to(roomId).emit('room:update', {
        players,
        roomId,
        maxPlayers: room.maxPlayers,
        status: room.status
      });
      
      // Отправляем обновление всем в лобби
      this.io.emit('rooms:updated', {
        action: 'updated',
        room: {
          id: roomId,
          name: room.name,
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          status: room.status
        }
      });
      
    } catch (error) {
      console.error('Error joining room:', error);
      if (callback) {
        callback({ success: false, error: error.message || 'Ошибка присоединения к комнате' });
      }
    }
  }
  
  handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      
      if (!roomId || !socket.currentRoom || socket.currentRoom !== roomId) {
        return;
      }
      
      const room = this.rooms.get(roomId);
      if (!room) {
        return;
      }
      
      // Удаляем игрока из комнаты
      const playerName = room.players.get(socket.userId)?.name || 'Игрок';
      room.players.delete(socket.userId);
      
      // Помечаем игрока как вышедшего в БД
      this.db.db.prepare(`
        UPDATE room_players SET left_at = CURRENT_TIMESTAMP 
        WHERE room_id = ? AND user_id = ? AND left_at IS NULL
      `).run(roomId, socket.userId);
      
      console.log(`➖ ${playerName} вышел из комнаты ${room.name}`);
      
      // Если комната пустая, удаляем её
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🗑️ Комната удалена: ${room.name} (${roomId})`);
        
        // Уведомляем всех в лобби
        this.io.emit('rooms:updated', {
          action: 'deleted',
          roomId
        });
        
        return;
      }
      
      // Если вышел создатель, назначаем нового
      if (room.creatorId === socket.userId && room.players.size > 0) {
        const newCreator = room.players.values().next().value;
        room.creatorId = newCreator.id;
        console.log(`👑 Новый создатель комнаты: ${newCreator.name}`);
      }
      
      // Подготавливаем информацию об игроках
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isCreator: p.id === room.creatorId
      }));
      
      // Уведомляем остальных игроков
      this.io.to(roomId).emit('room:player_left', {
        userId: socket.userId,
        playerName,
        players,
        newCreatorId: room.creatorId
      });
      
      // Отправляем обновление комнаты
      this.io.to(roomId).emit('room:update', {
        players,
        roomId,
        maxPlayers: room.maxPlayers,
        status: room.status
      });
      
      // Отправляем обновление всем в лобби
      this.io.emit('rooms:updated', {
        action: 'updated',
        room: {
          id: roomId,
          name: room.name,
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          status: room.status
        }
      });
      
      // Выходим из комнаты в сокете
      socket.leave(roomId);
      socket.currentRoom = null;
      
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }
  
  handleChatMessage(socket, data) {
    try {
      const { roomId, message } = data;
      
      if (!roomId || !message || message.trim() === '') {
        return;
      }
      
      const room = this.rooms.get(roomId);
      if (!room || !room.players.has(socket.userId)) {
        return;
      }
      
      // Ограничиваем длину сообщения
      const trimmedMessage = message.trim().substring(0, 500);
      const playerName = socket.userData?.username || 'Игрок';
      
      // Добавляем в историю чата
      room.chat.push({
        userId: socket.userId,
        playerName,
        message: trimmedMessage,
        timestamp: Date.now()
      });
      
      // Ограничиваем историю чата
      if (room.chat.length > 100) {
        room.chat = room.chat.slice(-100);
      }
      
      console.log(`💬 ${playerName} в ${room.name}: ${trimmedMessage}`);
      
      // Отправляем сообщение всем в комнате
      this.io.to(roomId).emit('room:chat_message', {
        userId: socket.userId,
        playerName,
        message: trimmedMessage,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }
  
  handleSetReady(socket, data) {
    try {
      const { roomId, isReady } = data;
      
      const room = this.rooms.get(roomId);
      if (!room || !room.players.has(socket.userId)) {
        return;
      }
      
      // Обновляем статус готовности
      const player = room.players.get(socket.userId);
      player.isReady = isReady;
      
      const playerName = player.name;
      console.log(`✓ ${playerName} ${isReady ? 'готов' : 'не готов'}`);
      
      // Подготавливаем информацию об игроках
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isCreator: p.id === room.creatorId
      }));
      
      // Уведомляем всех в комнате
      this.io.to(roomId).emit('room:player_ready', {
        userId: socket.userId,
        playerName,
        isReady,
        players
      });
      
      // Отправляем обновление комнаты
      this.io.to(roomId).emit('room:update', {
        players,
        roomId
      });
      
      // Проверяем, все ли готовы для начала игры
      this.checkAllPlayersReady(roomId);
      
    } catch (error) {
      console.error('Error setting ready status:', error);
    }
  }
  
  handleStartGame(socket, data, callback) {
    try {
      const { roomId } = data;
      
      const room = this.rooms.get(roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Комната не найдена' });
        return;
      }
      
      // Проверяем права (только создатель)
      if (room.creatorId !== socket.userId) {
        if (callback) callback({ success: false, error: 'Только создатель может начать игру' });
        return;
      }
      
      // Проверяем количество игроков
      if (room.players.size < 2) {
        if (callback) callback({ success: false, error: 'Нужно минимум 2 игрока' });
        return;
      }
      
      // Проверяем, все ли готовы
      const allReady = Array.from(room.players.values()).every(p => p.isReady);
      if (!allReady) {
        if (callback) callback({ success: false, error: 'Не все игроки готовы' });
        return;
      }
      
      // Меняем статус комнаты
      room.status = 'starting';
      
      console.log(`🎮 Начинаем игру в комнате ${room.name}`);
      
      // Уведомляем всех игроков
      this.io.to(roomId).emit('game:starting', {
        message: 'Игра начинается!',
        roomId,
        countdown: 5,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name
        }))
      });
      
      if (callback) {
        callback({ success: true, message: 'Игра начинается' });
      }
      
      // Запускаем обратный отсчет
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          this.io.to(roomId).emit('game:countdown', { countdown });
          countdown--;
        } else {
          clearInterval(countdownInterval);
          
          if (this.rooms.has(roomId)) {
            room.status = 'playing';
            
            // TODO: Инициализация игровой механики
            // 1. Распределение ролей (4 детектива, возможно 1 предатель)
            // 2. Создание случая для расследования
            // 3. Раздача начальных улик
            
            this.io.to(roomId).emit('game:started', {
              message: 'Игра началась!',
              roomId,
              case: {
                title: 'Дело о пропавшей картине',
                description: 'Из музея исчезла бесценная картина...',
                clues: []
              }
            });
            
            console.log(`🎲 Игра началась в комнате ${room.name}`);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error starting game:', error);
      if (callback) {
        callback({ success: false, error: error.message || 'Ошибка начала игры' });
      }
    }
  }
  
  handleGetRoomInfo(socket, data, callback) {
    try {
      const { roomId } = data;
      
      const room = this.rooms.get(roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Комната не найдена' });
        return;
      }
      
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        isCreator: p.id === room.creatorId
      }));
      
      if (callback) {
        callback({
          success: true,
          room: {
            id: roomId,
            name: room.name,
            players,
            maxPlayers: room.maxPlayers,
            status: room.status,
            isCreator: room.creatorId === socket.userId
          }
        });
      }
      
    } catch (error) {
      console.error('Error getting room info:', error);
      if (callback) {
        callback({ success: false, error: 'Ошибка получения информации о комнате' });
      }
    }
  }
  
  handleListRooms(socket, callback) {
    try {
        const rooms = Array.from(this.rooms.values())
            .filter(room => room.status === 'waiting')
            .map(room => ({
                id: room.id,
                name: room.name,
                playerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                status: room.status,
                creator: room.creatorId
            }));
        
        // Проверяем, передан ли callback
        if (callback && typeof callback === 'function') {
            callback({
                success: true,
                rooms
            });
        }
        // Если callback не передан, все равно ничего не ломаем
        
    } catch (error) {
        console.error('Error listing rooms:', error);
        if (callback && typeof callback === 'function') {
            callback({ 
                success: false, 
                error: 'Ошибка получения списка комнат' 
            });
        }
    }
}
  
  handleDisconnect(socket) {
    const userName = socket.userData?.username || 'Аноним';
    console.log('❌ Отключение:', socket.id, userName);
    
    // Удаляем из userSockets
    if (socket.userId) {
      this.userSockets.delete(socket.userId);
    }
    
    // Если игрок был в комнате, обрабатываем выход
    if (socket.currentRoom) {
      this.handleLeaveRoom(socket, { roomId: socket.currentRoom });
    }
  }
  
  checkAllPlayersReady(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const allReady = Array.from(room.players.values()).every(p => p.isReady);
    const enoughPlayers = room.players.size >= 2;
    
    if (allReady && enoughPlayers) {
      this.io.to(roomId).emit('room:all_ready', {
        message: 'Все игроки готовы! Создатель может начать игру.',
        roomId,
        canStart: room.creatorId ? true : false
      });
    }
  }
  
  start(port = 3000) {
    this.server.listen(port, () => {
      console.log('='.repeat(60));
      console.log('🚀 ДЕТЕКТИВ-КВАРТЕТ :: ПРОФЕССИОНАЛЬНАЯ ВЕРСИЯ');
      console.log('='.repeat(60));
      console.log(`📡 HTTP сервер:  http://localhost:${port}`);
      console.log(`🔌 WebSocket:    ws://localhost:${port}`);
      console.log(`🗄️  База данных: ${this.db.dbPath}`);
      console.log('='.repeat(60));
      console.log(`🕒 Запущено: ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(60));
      console.log('🔐 API доступны:');
      console.log('  GET  /api/health');
      console.log('  POST /api/auth/register');
      console.log('  POST /api/auth/login');
      console.log('  GET  /api/auth/verify');
      console.log('  GET  /api/rooms');
      console.log('  GET  /api/leaderboard');
      console.log('  GET  /api/users/:id');
      console.log('='.repeat(60));
      console.log('🎮 WebSocket события:');
      console.log('  room:create, room:join, room:leave');
      console.log('  room:chat_message, room:set_ready');
      console.log('  game:start, rooms:list, room:get_info');
      console.log('='.repeat(60));
    });
    
    // Обработка завершения
    process.on('SIGINT', () => {
      console.log('\n🛑 Остановка сервера...');
      this.db.close();
      this.rooms.clear();
      this.userSockets.clear();
      process.exit(0);
    });
  }
}

// Запуск сервера
const server = new GameServer();
server.start(3000);