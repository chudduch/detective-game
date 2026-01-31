const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Импорт модулей
const database = require('./database');
const auth = require('./auth');
const gameState = require('./gameState');
const setupSocketHandlers = require('./socketHandlers');

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Инициализация базы данных
database.initialize();

// Маршруты для аутентификации (REST API)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const result = await auth.register(username, password);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ 
      success: true, 
      token: result.token,
      user: { username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const result = await auth.login(username, password);
    
    if (result.error) {
      return res.status(401).json({ error: result.error });
    }
    
    res.json({ 
      success: true, 
      token: result.token,
      user: { username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверка токена (для клиента)
app.post('/api/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = await auth.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({ 
      valid: true, 
      user: { username: decoded.username }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/lobby.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/game.html'));
});

// Настройка обработчиков Socket.IO
setupSocketHandlers(io, auth, gameState);

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

// Экспорт для тестов (если нужно)
module.exports = { app, server, io };