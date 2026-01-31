const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'detective_mastermind.db');
    }

    // Инициализация базы данных
    initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }

                console.log('Connected to SQLite database');

                // Включение поддержки foreign keys
                this.db.run('PRAGMA foreign_keys = ON');

                // Создание таблиц
                this.createTables()
                    .then(() => {
                        console.log('Database tables created/verified');
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    // Создание всех необходимых таблиц
    async createTables() {
        return new Promise((resolve, reject) => {
            // Таблица пользователей
            const usersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT,
                    level INTEGER DEFAULT 1,
                    experience INTEGER DEFAULT 0,
                    total_games INTEGER DEFAULT 0,
                    solved_cases INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            `;

            // Таблица игр (сессий)
            const gamesTable = `
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    case_id TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    winner TEXT,
                    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    finished_at DATETIME,
                    duration_seconds INTEGER
                )
            `;

            // Таблица участников игр
            const gameParticipantsTable = `
                CREATE TABLE IF NOT EXISTS game_participants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    score INTEGER DEFAULT 0,
                    correct_vote BOOLEAN,
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(game_id, user_id)
                )
            `;

            // Таблица истории чатов (опционально, для модерации)
            const chatHistoryTable = `
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    role TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `;

            // Таблица достижений (для будущего расширения)
            const achievementsTable = `
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    achievement_type TEXT NOT NULL,
                    achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `;

            // Создаем таблицы последовательно
            this.db.serialize(() => {
                // Включаем WAL-режим для лучшей производительности
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA synchronous = NORMAL');

                this.db.run(usersTable, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        reject(err);
                    }
                });

                this.db.run(gamesTable, (err) => {
                    if (err) {
                        console.error('Error creating games table:', err);
                        reject(err);
                    }
                });

                this.db.run(gameParticipantsTable, (err) => {
                    if (err) {
                        console.error('Error creating game_participants table:', err);
                        reject(err);
                    }
                });

                this.db.run(chatHistoryTable, (err) => {
                    if (err) {
                        console.error('Error creating chat_history table:', err);
                        reject(err);
                    }
                });

                this.db.run(achievementsTable, (err) => {
                    if (err) {
                        console.error('Error creating achievements table:', err);
                        reject(err);
                    }
                });

                // Создаем индексы для ускорения запросов
                this.db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_game_participants_game_user ON game_participants(game_id, user_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_chat_history_game_timestamp ON chat_history(game_id, timestamp)');

                this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                    if (err) {
                        console.error('Error counting users:', err);
                        reject(err);
                        return;
                    }
                    console.log(`Total users in database: ${row.count}`);
                    resolve();
                });
            });
        });
    }

    // Методы для работы с пользователями
    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE username = ?';
            this.db.get(sql, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async createUser(username, passwordHash, email = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (username, password_hash, email, level, experience, created_at) 
                VALUES (?, ?, ?, 1, 0, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(sql, [username, passwordHash, email], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, username });
                }
            });
        });
    }

    async updateUserLastLogin(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(sql, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    async incrementUserGames(userId, caseSolved = false) {
        return new Promise((resolve, reject) => {
            const updates = ['total_games = total_games + 1'];
            const params = [userId];
            
            if (caseSolved) {
                updates.push('solved_cases = solved_cases + 1');
                updates.push('experience = experience + 100');
            } else {
                updates.push('experience = experience + 25');
            }
            
            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // Методы для работы с играми
    async createGame(roomId, caseId) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO games (room_id, case_id, status, started_at) 
                VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
            `;
            
            this.db.run(sql, [roomId, caseId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async addGameParticipant(gameId, userId, role) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO game_participants (game_id, user_id, role) 
                VALUES (?, ?, ?)
            `;
            
            this.db.run(sql, [gameId, userId, role], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async finishGame(gameId, winner = null, durationSeconds = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE games 
                SET status = 'finished', 
                    winner = ?, 
                    finished_at = CURRENT_TIMESTAMP,
                    duration_seconds = ?
                WHERE id = ?
            `;
            
            this.db.run(sql, [winner, durationSeconds, gameId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    async updateParticipantScore(participantId, score, correctVote = null) {
        return new Promise((resolve, reject) => {
            const updates = ['score = ?'];
            const params = [score, participantId];
            
            if (correctVote !== null) {
                updates.push('correct_vote = ?');
                params.splice(1, 0, correctVote);
            }
            
            const sql = `UPDATE game_participants SET ${updates.join(', ')} WHERE id = ?`;
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // Метод для сохранения сообщения чата
    async saveChatMessage(gameId, userId, username, role, message) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO chat_history (game_id, user_id, username, role, message) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [gameId, userId, username, role, message], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Закрытие соединения с БД
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Экспорт singleton экземпляра
const dbInstance = new Database();
module.exports = dbInstance;