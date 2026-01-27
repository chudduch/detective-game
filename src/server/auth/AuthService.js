const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  constructor(database) {
    this.db = database;
    this.JWT_SECRET = process.env.JWT_SECRET || 'detective-quartet-secret-key-change-in-production';
    this.JWT_EXPIRES = '30d';
    this.SOCKET_TIMEOUT = 30000; // 30 секунд таймаут для сокета
  }
  
  // Генерация JWT токена
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar_url,
      rating: user.rating || 1000
    };
    
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES,
      issuer: 'detective-quartet',
      audience: 'detective-quartet-client',
      subject: user.id
    });
  }
  
  // Верификация токена
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'detective-quartet',
        audience: 'detective-quartet-client'
      });
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }
  
  // Верификация токена для WebSocket (более быстрая, без полной проверки БД)
  verifyTokenForSocket(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'detective-quartet',
        audience: 'detective-quartet-client'
      });
      
      // Возвращаем только необходимые данные для сокета
      return {
        userId: decoded.userId,
        username: decoded.username,
        displayName: decoded.displayName,
        avatar: decoded.avatar,
        rating: decoded.rating
      };
    } catch (error) {
      console.error('Socket token verification failed:', error.message);
      return null;
    }
  }
  
  // Полная аутентификация с проверкой в БД
  async authenticateUser(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    // Проверяем, существует ли пользователь в БД
    const user = this.db.getUserById(decoded.userId);
    if (!user) {
      return null;
    }
    
    // Проверяем, не был ли изменен пароль после выдачи токена
    // Для этого можно добавить поле password_changed_at в users
    // Пока просто возвращаем пользователя
    
    return this.sanitizeUser(user);
  }
  
  // Регистрация нового пользователя
  async register(email, username, password) {
    try {
      // Валидация входных данных
      const validation = this.validateRegistration(email, username, password);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      
      // Проверяем, не занят ли email
      const existingUserByEmail = this.db.getUserByEmail(email);
      if (existingUserByEmail) {
        throw new Error('Email уже используется');
      }
      
      // Проверяем, не занят ли username
      const existingUserByUsername = this.db.getUserByUsername(username);
      if (existingUserByUsername) {
        throw new Error('Имя пользователя уже занято');
      }
      
      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Создаём отображаемое имя
      const displayName = this.generateDisplayName(username);
      
      // Создаём пользователя в БД
      const userId = this.db.createUser(email, username, displayName, passwordHash);
      
      // Получаем созданного пользователя
      const user = this.db.getUserById(userId);
      
      // Генерируем токен
      const token = this.generateToken(user);
      
      // Обновляем last_login
      this.db.updateUserLastLogin(userId);
      
      // Разблокируем первое достижение
      try {
        this.db.unlockAchievement(userId, 'first_win');
      } catch (e) {
        // Игнорируем ошибки достижений
      }
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: 'Регистрация успешна! Добро пожаловать в Детектив-Квартет!'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Ошибка регистрации');
    }
  }
  
  // Вход пользователя
  async login(email, password) {
    try {
      // Базовая валидация
      if (!email || !password) {
        throw new Error('Email и пароль обязательны');
      }
      
      // Находим пользователя
      const user = this.db.getUserByEmail(email);
      if (!user) {
        // Для безопасности используем одинаковое сообщение
        throw new Error('Неверный email или пароль');
      }
      
      // Проверяем пароль
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new Error('Неверный email или пароль');
      }
      
      // Проверяем, не заблокирован ли аккаунт
      // (можно добавить поле is_banned в будущем)
      
      // Генерируем новый токен
      const token = this.generateToken(user);
      
      // Обновляем last_login
      this.db.updateUserLastLogin(user.id);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: 'Вход выполнен успешно!'
      };
      
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Ошибка входа');
    }
  }
  
  // Быстрый гостевой вход (для демо)
  async guestLogin() {
    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const guestUsername = `Гость_${Math.floor(Math.random() * 10000)}`;
      const guestEmail = `${guestId}@detective-quartet.local`;
      
      // Создаём временного гостя в памяти (не в БД)
      const guestUser = {
        id: guestId,
        email: guestEmail,
        username: guestUsername,
        display_name: guestUsername,
        avatar_url: 'guest.png',
        rating: 1000,
        is_guest: true
      };
      
      // Генерируем токен (с флагом гостя)
      const token = jwt.sign({
        ...guestUser,
        isGuest: true
      }, this.JWT_SECRET, {
        expiresIn: '24h',
        issuer: 'detective-quartet',
        audience: 'detective-quartet-client'
      });
      
      return {
        success: true,
        user: guestUser,
        token,
        message: 'Гостевой вход выполнен',
        isGuest: true
      };
      
    } catch (error) {
      console.error('Guest login error:', error);
      throw new Error('Ошибка гостевого входа');
    }
  }
  
  // Валидация регистрационных данных
  validateRegistration(email, username, password) {
    // Проверка email
    if (!this.validateEmail(email)) {
      return { valid: false, message: 'Некорректный email' };
    }
    
    // Проверка username
    if (!this.validateUsername(username)) {
      return { 
        valid: false, 
        message: 'Имя пользователя должно быть от 3 до 20 символов и содержать только буквы, цифры и подчеркивания' 
      };
    }
    
    // Проверка пароля
    if (!this.validatePassword(password)) {
      return { 
        valid: false, 
        message: 'Пароль должен быть от 8 символов и содержать хотя бы одну цифру и букву' 
      };
    }
    
    return { valid: true, message: 'Данные валидны' };
  }
  
  // Валидация email
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
  
  // Валидация имени пользователя
  validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) return false;
    
    // Разрешаем буквы, цифры, подчеркивания и дефисы
    const usernameRegex = /^[a-zA-Z0-9_\-]+$/;
    return usernameRegex.test(trimmed);
  }
  
  // Валидация пароля
  validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    
    const trimmed = password.trim();
    if (trimmed.length < 8) return false;
    
    // Хотя бы одна цифра и одна буква
    const hasNumber = /\d/.test(trimmed);
    const hasLetter = /[a-zA-Z]/.test(trimmed);
    
    return hasNumber && hasLetter;
  }
  
  // Генерация отображаемого имени
  generateDisplayName(username) {
    // Можно добавить логику генерации уникальных отображаемых имен
    // Пока используем username
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  
  // Очистка данных пользователя (убираем чувствительные данные)
  sanitizeUser(user) {
    if (!user) return null;
    
    const { password_hash, socket_id, ...safeUser } = user;
    
    // Добавляем вычисляемые поля
    const games_played = safeUser.games_played || 0;
    const games_won = safeUser.games_won || 0;
    const win_rate = games_played > 0 ? Math.round((games_won / games_played) * 100) : 0;
    
    return {
      ...safeUser,
      win_rate,
      // Определяем ранг по рейтингу
      rank: this.getRankByRating(safeUser.rating || 1000)
    };
  }
  
  // Получение ранга по рейтингу
  getRankByRating(rating) {
    if (rating >= 2500) return { id: 'legend', name: 'Легенда', color: '#FFD700' };
    if (rating >= 2200) return { id: 'master', name: 'Мастер', color: '#C0C0C0' };
    if (rating >= 1900) return { id: 'expert', name: 'Эксперт', color: '#CD7F32' };
    if (rating >= 1600) return { id: 'detective', name: 'Детектив', color: '#3498db' };
    if (rating >= 1300) return { id: 'investigator', name: 'Следователь', color: '#2ecc71' };
    if (rating >= 1000) return { id: 'rookie', name: 'Новичок', color: '#95a5a6' };
    return { id: 'beginner', name: 'Начинающий', color: '#7f8c8d' };
  }
  
  // Middleware для Express
  authMiddleware(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Требуется авторизация. Пожалуйста, войдите в систему.' 
        });
      }
      
      const token = authHeader.substring(7);
      const decoded = this.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({ 
          success: false, 
          error: 'Неверный или просроченный токен. Пожалуйста, войдите снова.' 
        });
      }
      
      // Проверяем, существует ли пользователь в БД (кроме гостей)
      if (!decoded.isGuest) {
        const user = this.db.getUserById(decoded.userId);
        if (!user) {
          return res.status(401).json({ 
            success: false, 
            error: 'Пользователь не найден' 
          });
        }
      }
      
      // Добавляем данные пользователя в запрос
      req.user = decoded;
      req.token = token;
      next();
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка аутентификации' 
      });
    }
  }
  
  // Middleware для WebSocket
  socketAuthMiddleware(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('Socket connection attempt without token');
        return next(new Error('Требуется аутентификация'));
      }
      
      const decoded = this.verifyTokenForSocket(token);
      if (!decoded) {
        console.log('Socket token verification failed');
        return next(new Error('Неверный или просроченный токен'));
      }
      
      // Сохраняем данные пользователя в сокете
      socket.userId = decoded.userId;
      socket.userData = decoded;
      
      console.log(`Socket authenticated: ${decoded.username} (${decoded.userId})`);
      next();
      
    } catch (error) {
      console.error('Socket auth middleware error:', error);
      next(new Error('Ошибка аутентификации сокета'));
    }
  }
  
  // Проверка прав доступа к комнате
  async checkRoomAccess(userId, roomId, action = 'view') {
    try {
      const room = this.db.getRoomWithPlayers(roomId);
      if (!room) {
        return { allowed: false, reason: 'Комната не найдена' };
      }
      
      const player = room.players.find(p => p.id === userId);
      
      switch (action) {
        case 'view':
          // Просматривать комнату могут все, кроме приватных комнат
          return { allowed: true };
          
        case 'join':
          // Присоединяться могут, если есть место и игра не началась
          if (room.status !== 'waiting') {
            return { allowed: false, reason: 'Игра уже началась' };
          }
          if (room.players.length >= room.max_players) {
            return { allowed: false, reason: 'Комната заполнена' };
          }
          if (player) {
            return { allowed: false, reason: 'Вы уже в этой комнате' };
          }
          return { allowed: true };
          
        case 'chat':
          // Писать в чат могут только участники комнаты
          if (!player) {
            return { allowed: false, reason: 'Вы не участник комнаты' };
          }
          return { allowed: true };
          
        case 'start':
          // Начинать игру может только создатель
          if (room.creator_id !== userId) {
            return { allowed: false, reason: 'Только создатель может начать игру' };
          }
          if (room.status !== 'waiting') {
            return { allowed: false, reason: 'Игра уже началась' };
          }
          if (room.players.length < 2) {
            return { allowed: false, reason: 'Нужно минимум 2 игрока' };
          }
          return { allowed: true };
          
        case 'kick':
          // Выгонять игроков может только создатель
          if (room.creator_id !== userId) {
            return { allowed: false, reason: 'Только создатель может исключать игроков' };
          }
          return { allowed: true };
          
        default:
          return { allowed: false, reason: 'Неизвестное действие' };
      }
      
    } catch (error) {
      console.error('Check room access error:', error);
      return { allowed: false, reason: 'Ошибка проверки доступа' };
    }
  }
  
  // Обновление профиля пользователя
  async updateProfile(userId, updates) {
    try {
      // Валидация обновлений
      if (updates.username) {
        if (!this.validateUsername(updates.username)) {
          throw new Error('Некорректное имя пользователя');
        }
        
        // Проверяем, не занят ли username
        const existingUser = this.db.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Имя пользователя уже занято');
        }
      }
      
      if (updates.email) {
        if (!this.validateEmail(updates.email)) {
          throw new Error('Некорректный email');
        }
        
        // Проверяем, не занят ли email
        const existingUser = this.db.getUserByEmail(updates.email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email уже используется');
        }
      }
      
      // В реальном приложении здесь был бы SQL UPDATE
      // Пока возвращаем успех
      return {
        success: true,
        message: 'Профиль обновлен'
      };
      
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Ошибка обновления профиля');
    }
  }
  
  // Восстановление пароля (упрощённое)
  async initiatePasswordReset(email) {
    try {
      const user = this.db.getUserByEmail(email);
      if (!user) {
        // Для безопасности не сообщаем, что пользователь не найден
        return { 
          success: true, 
          message: 'Если email зарегистрирован, вы получите инструкции по сбросу пароля' 
        };
      }
      
      // Генерируем токен сброса
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 час
      
      // В реальном приложении:
      // 1. Сохраняем resetToken и resetTokenExpiry в БД
      // 2. Отправляем email со ссылкой для сброса
      // 3. Возвращаем success без токена
      
      // Для демо возвращаем токен
      return {
        success: true,
        resetToken, // В реальном приложении НЕ возвращаем токен клиенту
        message: 'Токен сброса пароля сгенерирован (в реальном приложении отправлен по email)'
      };
      
    } catch (error) {
      console.error('Password reset initiation error:', error);
      throw new Error('Ошибка инициации сброса пароля');
    }
  }
  
  // Проверка пароля (для смены пароля в профиле)
  async verifyCurrentPassword(userId, password) {
    try {
      const user = this.db.getUserById(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      return await bcrypt.compare(password, user.password_hash);
      
    } catch (error) {
      console.error('Verify current password error:', error);
      return false;
    }
  }
}

module.exports = AuthService;