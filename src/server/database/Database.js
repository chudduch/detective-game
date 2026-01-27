const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class GameDatabase {
  constructor() {
    // Создаём папку data если её нет
    const dataDir = path.join(__dirname, '../../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Подключаемся к БД
    this.dbPath = path.join(dataDir, 'game.db');
    this.db = new Database(this.dbPath);
    
    // Включаем WAL mode для лучшей производительности
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Создаём таблицы
    this.initDatabase();
    
    // Инициализируем достижения
    this.initAchievements();
    
    console.log(`✅ База данных подключена: ${this.dbPath}`);
  }
  
  initDatabase() {
    // === ПОЛЬЗОВАТЕЛИ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT DEFAULT 'default.png',
        rating INTEGER DEFAULT 1000,
        is_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        socket_id TEXT -- ID текущего WebSocket соединения
      )
    `);
    
    // === СТАТИСТИКА ИГРОКА ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        total_play_time INTEGER DEFAULT 0, -- в секундах
        best_time INTEGER, -- лучшее время в секундах
        total_clues_found INTEGER DEFAULT 0,
        perfect_games INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // === ИГРОВЫЕ КОМНАТЫ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator_id TEXT NOT NULL,
        max_players INTEGER DEFAULT 4,
        status TEXT DEFAULT 'waiting', -- waiting, starting, playing, finished, cancelled
        game_type TEXT DEFAULT 'detective',
        settings TEXT DEFAULT '{}', -- JSON настроек
        case_data TEXT DEFAULT '{}', -- JSON данных дела
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);
    
    // === ИГРОКИ В КОМНАТАХ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_players (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        player_role TEXT, -- detective, forensic, analyst, chief
        character_name TEXT, -- имя персонажа
        is_ready BOOLEAN DEFAULT 0,
        is_online BOOLEAN DEFAULT 1,
        score INTEGER DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME,
        PRIMARY KEY (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // === ЧАТ КОМНАТЫ (история) ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'chat', -- chat, system, clue, vote
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // === ЗАВЕРШЁННЫЕ ИГРЫ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS finished_games (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        winner_team TEXT,
        duration INTEGER, -- в секундах
        scores TEXT DEFAULT '{}', -- JSON с очками
        details TEXT DEFAULT '{}', -- JSON деталей игры
        finished_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `);
    
    // === ДОСТИЖЕНИЯ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT DEFAULT '🏆',
        points INTEGER DEFAULT 10,
        category TEXT DEFAULT 'general'
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 100, -- процент выполнения
        PRIMARY KEY (user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id)
      )
    `);
    
    // === ИГРОВЫЕ ДАННЫЕ ===
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_clues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        clue_text TEXT NOT NULL,
        clue_type TEXT DEFAULT 'evidence', -- evidence, witness, location, motive
        discovered_by TEXT, -- user_id
        discovered_at DATETIME,
        is_red_herring BOOLEAN DEFAULT 0,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (discovered_by) REFERENCES users(id)
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        vote_target TEXT, -- user_id или clue_id
        vote_type TEXT DEFAULT 'suspect', -- suspect, clue, decision
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // === ИНДЕКСЫ для скорости ===
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);
      CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
      CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
      CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players(user_id);
      CREATE INDEX IF NOT EXISTS idx_room_chat_room ON room_chat(room_id);
      CREATE INDEX IF NOT EXISTS idx_finished_games_date ON finished_games(finished_at);
    `);
    
    console.log('✅ Таблицы базы данных созданы');
  }
  
  initAchievements() {
    const achievements = [
      {
        id: 'first_win',
        name: 'Первый успех',
        description: 'Выиграть первую игру',
        icon: '🥇',
        category: 'winning'
      },
      {
        id: 'perfect_game',
        name: 'Безупречное расследование',
        description: 'Выиграть игру, найдя все улики',
        icon: '🔍',
        category: 'skill'
      },
      {
        id: 'veteran',
        name: 'Ветеран',
        description: 'Сыграть 100 игр',
        icon: '🎖️',
        category: 'progress'
      },
      {
        id: 'quick_thinker',
        name: 'Быстрый ум',
        description: 'Выиграть игру менее чем за 5 минут',
        icon: '⚡',
        category: 'speed'
      },
      {
        id: 'team_player',
        name: 'Командный игрок',
        description: 'Выиграть 10 игр в одной команде',
        icon: '👥',
        category: 'teamwork'
      },
      {
        id: 'master_detective',
        name: 'Мастер-детектив',
        description: 'Достичь рейтинга 2000',
        icon: '🕵️',
        category: 'rating'
      },
      {
        id: 'streak_5',
        name: 'Неудержимый',
        description: 'Выиграть 5 игр подряд',
        icon: '🔥',
        category: 'winning'
      },
      {
        id: 'clue_master',
        name: 'Мастер улик',
        description: 'Найти 100 улик',
        icon: '🔎',
        category: 'skill'
      }
    ];
    
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO achievements (id, name, description, icon, category, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const ach of achievements) {
      try {
        stmt.run(ach.id, ach.name, ach.description, ach.icon, ach.category, ach.points || 10);
      } catch (e) {
        // Игнорируем ошибки при дубликатах
      }
    }
  }
  
  // === МЕТОДЫ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ===
  
  createUser(email, username, displayName, passwordHash) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, username, display_name, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    try {
      stmt.run(userId, email, username, displayName, passwordHash);
      
      // Создаём запись статистики
      this.db.prepare(`
        INSERT INTO user_stats (user_id) VALUES (?)
      `).run(userId);
      
      return userId;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('email')) {
          throw new Error('Email уже используется');
        } else if (error.message.includes('username')) {
          throw new Error('Имя пользователя уже занято');
        }
      }
      throw error;
    }
  }
  
  getUserByEmail(email) {
    const stmt = this.db.prepare(`
      SELECT u.*, us.* 
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.email = ?
    `);
    
    return stmt.get(email);
  }
  
  getUserById(userId) {
    const stmt = this.db.prepare(`
      SELECT u.*, us.* 
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.id = ?
    `);
    
    return stmt.get(userId);
  }
  
  getUserByUsername(username) {
    const stmt = this.db.prepare(`
      SELECT u.*, us.* 
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.username = ?
    `);
    
    return stmt.get(username);
  }
  
  updateUserLastLogin(userId) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(userId);
  }
  
  updateUserSocketId(userId, socketId) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET socket_id = ? 
      WHERE id = ?
    `);
    
    stmt.run(socketId, userId);
  }
  
  updateUserRating(userId, ratingChange) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET rating = rating + ? 
      WHERE id = ?
    `);
    
    stmt.run(ratingChange, userId);
  }
  
  updateUserStats(userId, gameResult) {
    const { won, duration, cluesFound, isPerfect, score } = gameResult;
    
    const stmt = this.db.prepare(`
      UPDATE user_stats 
      SET 
        games_played = games_played + 1,
        games_won = games_won + ?,
        games_lost = games_lost + ?,
        total_play_time = total_play_time + ?,
        total_clues_found = total_clues_found + ?,
        perfect_games = perfect_games + ?,
        total_score = total_score + ?,
        current_streak = CASE 
          WHEN ? = 1 THEN current_streak + 1 
          ELSE 0 
        END,
        best_streak = MAX(best_streak, 
          CASE 
            WHEN ? = 1 THEN current_streak + 1 
            ELSE 0 
          END
        ),
        best_time = CASE 
          WHEN ? IS NOT NULL AND (? < best_time OR best_time IS NULL) 
          THEN ? 
          ELSE best_time 
        END
      WHERE user_id = ?
    `);
    
    const wonInt = won ? 1 : 0;
    const lostInt = won ? 0 : 1;
    const perfectInt = isPerfect ? 1 : 0;
    const finalScore = score || 0;
    
    stmt.run(
      wonInt, lostInt, duration, cluesFound, perfectInt, finalScore,
      wonInt, wonInt,
      duration, duration, duration,
      userId
    );
  }
  
  // === МЕТОДЫ ДЛЯ КОМНАТ ===
  
  createRoom(name, creatorId, maxPlayers = 4) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO rooms (id, name, creator_id, max_players)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(roomId, name, creatorId, maxPlayers);
    
    // Добавляем создателя как игрока
    this.addPlayerToRoom(roomId, creatorId);
    
    return roomId;
  }
  
  getRoom(roomId) {
    const stmt = this.db.prepare(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM room_players WHERE room_id = r.id AND left_at IS NULL) as player_count
      FROM rooms r
      WHERE r.id = ?
    `);
    
    return stmt.get(roomId);
  }
  
  getRoomWithPlayers(roomId) {
    const roomStmt = this.db.prepare(`
      SELECT r.* 
      FROM rooms r
      WHERE r.id = ?
    `);
    
    const playersStmt = this.db.prepare(`
      SELECT u.id, u.display_name, u.username, u.avatar_url, u.rating, 
             rp.player_role, rp.is_ready, rp.score, rp.joined_at
      FROM room_players rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.room_id = ? AND rp.left_at IS NULL
      ORDER BY rp.joined_at
    `);
    
    const room = roomStmt.get(roomId);
    if (!room) return null;
    
    const players = playersStmt.all(roomId);
    
    return {
      ...room,
      players: players || []
    };
  }
  
  addPlayerToRoom(roomId, userId, role = null) {
    // Проверяем, не находится ли игрок уже в комнате
    const checkStmt = this.db.prepare(`
      SELECT 1 FROM room_players 
      WHERE room_id = ? AND user_id = ? AND left_at IS NULL
    `);
    
    const exists = checkStmt.get(roomId, userId);
    if (exists) {
      return false; // Игрок уже в комнате
    }
    
    // Помечаем старые записи как вышедшие
    const leaveStmt = this.db.prepare(`
      UPDATE room_players 
      SET left_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND left_at IS NULL
    `);
    leaveStmt.run(userId);
    
    // Добавляем в комнату
    const stmt = this.db.prepare(`
      INSERT INTO room_players (room_id, user_id, player_role)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(roomId, userId, role);
    return true;
  }
  
  removePlayerFromRoom(roomId, userId) {
    const stmt = this.db.prepare(`
      UPDATE room_players 
      SET left_at = CURRENT_TIMESTAMP 
      WHERE room_id = ? AND user_id = ? AND left_at IS NULL
    `);
    
    const result = stmt.run(roomId, userId);
    return result.changes > 0;
  }
  
  setPlayerReady(roomId, userId, isReady = true) {
    const stmt = this.db.prepare(`
      UPDATE room_players 
      SET is_ready = ? 
      WHERE room_id = ? AND user_id = ? AND left_at IS NULL
    `);
    
    stmt.run(isReady ? 1 : 0, roomId, userId);
  }
  
  updateRoomStatus(roomId, status) {
    const stmt = this.db.prepare(`
      UPDATE rooms 
      SET status = ?,
          ${status === 'playing' ? 'started_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'finished' ? 'finished_at = CURRENT_TIMESTAMP,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(status, roomId);
  }
  
  updateRoomCaseData(roomId, caseData) {
    const stmt = this.db.prepare(`
      UPDATE rooms 
      SET case_data = ? 
      WHERE id = ?
    `);
    
    stmt.run(JSON.stringify(caseData), roomId);
  }
  
  getActiveRooms(limit = 50) {
    const stmt = this.db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.creator_id,
        r.max_players,
        r.status,
        r.created_at,
        COUNT(rp.user_id) as player_count,
        u.display_name as creator_name
      FROM rooms r
      LEFT JOIN room_players rp ON r.id = rp.room_id AND rp.left_at IS NULL
      JOIN users u ON r.creator_id = u.id
      WHERE r.status IN ('waiting', 'starting')
      GROUP BY r.id
      HAVING player_count < r.max_players
      ORDER BY r.created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }
  
  getRoomPlayers(roomId) {
    const stmt = this.db.prepare(`
      SELECT u.id, u.display_name, u.username, u.avatar_url, u.rating, 
             rp.player_role, rp.is_ready, rp.score, rp.joined_at
      FROM room_players rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.room_id = ? AND rp.left_at IS NULL
      ORDER BY rp.joined_at
    `);
    
    return stmt.all(roomId);
  }
  
  // === МЕТОДЫ ДЛЯ ЧАТА ===
  
  addChatMessage(roomId, userId, message, messageType = 'chat') {
    const stmt = this.db.prepare(`
      INSERT INTO room_chat (room_id, user_id, message, message_type)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(roomId, userId, message, messageType);
    return result.lastInsertRowid;
  }
  
  getChatHistory(roomId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT 
        rc.id,
        rc.room_id,
        rc.user_id,
        rc.message,
        rc.message_type,
        rc.created_at,
        u.display_name,
        u.avatar_url
      FROM room_chat rc
      JOIN users u ON rc.user_id = u.id
      WHERE rc.room_id = ?
      ORDER BY rc.created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(roomId, limit).reverse(); // Переворачиваем чтобы старые сообщения были первыми
  }
  
  // === МЕТОДЫ ДЛЯ ЛИДЕРБОРДА ===
  
  getLeaderboard(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.rating,
        us.games_played,
        us.games_won,
        us.games_lost,
        us.total_play_time,
        us.total_score,
        ROUND(CAST(us.games_won AS FLOAT) / NULLIF(us.games_played, 0) * 100, 1) as win_rate,
        us.best_time,
        us.current_streak,
        us.best_streak,
        (
          SELECT COUNT(*) 
          FROM user_achievements ua 
          WHERE ua.user_id = u.id
        ) as achievements_count
      FROM users u
      JOIN user_stats us ON u.id = us.user_id
      WHERE us.games_played >= 1
      ORDER BY u.rating DESC, us.games_won DESC
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }
  
  // === МЕТОДЫ ДЛЯ ДОСТИЖЕНИЙ ===
  
  unlockAchievement(userId, achievementId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(userId, achievementId);
    return result.changes > 0; // true если достижение было разблокировано
  }
  
  getUserAchievements(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.points,
        a.category,
        ua.unlocked_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `);
    
    return stmt.all(userId);
  }
  
  // === МЕТОДЫ ДЛЯ ЗАВЕРШЕННЫХ ИГР ===
  
  saveFinishedGame(gameData) {
    const { roomId, winnerTeam, duration, scores, details } = gameData;
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO finished_games (id, room_id, winner_team, duration, scores, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      gameId,
      roomId,
      winnerTeam,
      duration,
      JSON.stringify(scores || {}),
      JSON.stringify(details || {})
    );
    
    return gameId;
  }
  
  getRecentGames(limit = 20) {
    const stmt = this.db.prepare(`
      SELECT 
        fg.id,
        fg.room_id,
        fg.winner_team,
        fg.duration,
        fg.finished_at,
        COUNT(DISTINCT rp.user_id) as player_count
      FROM finished_games fg
      LEFT JOIN room_players rp ON fg.room_id = rp.room_id
      GROUP BY fg.id
      ORDER BY fg.finished_at DESC
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }
  
  // === УТИЛИТЫ ===
  
  close() {
    this.db.close();
    console.log('📴 База данных закрыта');
  }
  
  // Резервное копирование
  backup() {
    const backupPath = this.dbPath.replace('.db', `_backup_${Date.now()}.db`);
    this.db.backup(backupPath)
      .then(() => console.log(`💾 Бэкап создан: ${backupPath}`))
      .catch(err => console.error('Ошибка бэкапа:', err));
    
    return backupPath;
  }
  
  // Полная очистка (только для разработки!)
  clearDatabase() {
    console.warn('⚠️  Очистка базы данных...');
    this.db.exec(`
      DELETE FROM room_chat;
      DELETE FROM room_players;
      DELETE FROM rooms;
      DELETE FROM user_achievements;
      DELETE FROM user_stats;
      DELETE FROM users;
      DELETE FROM finished_games;
      DELETE FROM game_clues;
      DELETE FROM game_votes;
      VACUUM;
    `);
    console.log('🗑️  База данных очищена');
  }
}

module.exports = GameDatabase;