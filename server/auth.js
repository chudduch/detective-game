const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('./database');

class AuthService {
    constructor() {
        // Секретный ключ для JWT (в продакшене должен быть в .env)
        this.JWT_SECRET = process.env.JWT_SECRET || 'detective-mastermind-secret-key-change-in-production';
        this.JWT_EXPIRES_IN = '24h';
        
        // Минимальные требования к паролю
        this.PASSWORD_MIN_LENGTH = 6;
        this.USERNAME_MIN_LENGTH = 3;
        this.USERNAME_MAX_LENGTH = 20;
    }

    // Валидация имени пользователя
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        const trimmedUsername = username.trim();
        
        if (trimmedUsername.length < this.USERNAME_MIN_LENGTH) {
            return { 
                valid: false, 
                error: `Username must be at least ${this.USERNAME_MIN_LENGTH} characters long` 
            };
        }
        
        if (trimmedUsername.length > this.USERNAME_MAX_LENGTH) {
            return { 
                valid: false, 
                error: `Username must be at most ${this.USERNAME_MAX_LENGTH} characters long` 
            };
        }

        // Проверка на допустимые символы
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(trimmedUsername)) {
            return { 
                valid: false, 
                error: 'Username can only contain letters, numbers, underscores and hyphens' 
            };
        }

        // Запрещенные имена
        const forbiddenUsernames = ['admin', 'system', 'root', 'moderator', 'support'];
        if (forbiddenUsernames.includes(trimmedUsername.toLowerCase())) {
            return { 
                valid: false, 
                error: 'This username is not allowed' 
            };
        }

        return { valid: true, username: trimmedUsername };
    }

    // Валидация пароля
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password is required' };
        }

        if (password.length < this.PASSWORD_MIN_LENGTH) {
            return { 
                valid: false, 
                error: `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long` 
            };
        }

        // Проверка на сложность (опционально, можно усилить)
        if (password.length < 8) {
            // Для коротких паролей требуем хотя бы одну цифру
            const hasNumber = /\d/.test(password);
            if (!hasNumber) {
                return { 
                    valid: false, 
                    error: 'Password must contain at least one number' 
                };
            }
        }

        return { valid: true };
    }

    // Генерация JWT токена
    generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            level: user.level || 1
        };

        return jwt.sign(payload, this.JWT_SECRET, { 
            expiresIn: this.JWT_EXPIRES_IN 
        });
    }

    // Регистрация нового пользователя
    async register(username, password, email = null) {
        try {
            // Валидация входных данных
            const usernameValidation = this.validateUsername(username);
            if (!usernameValidation.valid) {
                return { error: usernameValidation.error };
            }

            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.valid) {
                return { error: passwordValidation.error };
            }

            const validatedUsername = usernameValidation.username;

            // Проверка, существует ли пользователь
            const existingUser = await database.getUserByUsername(validatedUsername);
            if (existingUser) {
                return { error: 'Username already taken' };
            }

            // Хэширование пароля
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Создание пользователя в БД
            const newUser = await database.createUser(validatedUsername, passwordHash, email);
            
            if (!newUser || !newUser.id) {
                throw new Error('Failed to create user');
            }

            // Генерация токена
            const token = this.generateToken(newUser);

            // Обновление времени последнего входа
            await database.updateUserLastLogin(newUser.id);

            console.log(`New user registered: ${validatedUsername}`);
            
            return {
                success: true,
                token,
                user: {
                    id: newUser.id,
                    username: validatedUsername,
                    level: 1
                }
            };

        } catch (error) {
            console.error('Registration error:', error);
            
            // Обработка конкретных ошибок БД
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                return { error: 'Username already exists' };
            }
            
            return { error: 'Registration failed. Please try again.' };
        }
    }

    // Вход пользователя
    async login(username, password) {
        try {
            // Базовые проверки
            if (!username || !password) {
                return { error: 'Username and password are required' };
            }

            // Поиск пользователя в БД
            const user = await database.getUserByUsername(username);
            
            if (!user) {
                // Чтобы не показывать, существует ли пользователь
                await bcrypt.compare(password, '$2a$10$fakehashforsecurity'); // Фиктивная проверка
                return { error: 'Invalid username or password' };
            }

            // Проверка пароля
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            
            if (!isPasswordValid) {
                return { error: 'Invalid username or password' };
            }

            // Генерация токена
            const token = this.generateToken(user);

            // Обновление времени последнего входа
            await database.updateUserLastLogin(user.id);

            console.log(`User logged in: ${username}`);
            
            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    level: user.level || 1,
                    experience: user.experience || 0,
                    totalGames: user.total_games || 0,
                    solvedCases: user.solved_cases || 0
                }
            };

        } catch (error) {
            console.error('Login error:', error);
            return { error: 'Login failed. Please try again.' };
        }
    }

    // Верификация JWT токена
    async verifyToken(token) {
        try {
            if (!token) {
                return null;
            }

            // Удаляем префикс "Bearer " если он есть
            const cleanToken = token.replace('Bearer ', '');

            const decoded = jwt.verify(cleanToken, this.JWT_SECRET);
            
            if (!decoded || !decoded.id || !decoded.username) {
                return null;
            }

            // Дополнительная проверка: пользователь все еще существует
            const user = await database.getUserByUsername(decoded.username);
            
            if (!user) {
                return null;
            }

            // Возвращаем обновленные данные пользователя
            return {
                id: user.id,
                username: user.username,
                level: user.level || 1,
                experience: user.experience || 0
            };

        } catch (error) {
            // Ловим различные ошибки JWT
            if (error.name === 'JsonWebTokenError') {
                console.log('Invalid JWT token');
            } else if (error.name === 'TokenExpiredError') {
                console.log('JWT token expired');
            } else {
                console.error('Token verification error:', error.message);
            }
            
            return null;
        }
    }

    // Извлечение токена из заголовков
    extractTokenFromHeaders(headers) {
        if (!headers || !headers.authorization) {
            return null;
        }

        const authHeader = headers.authorization;
        
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return authHeader;
    }

    // Обновление токена (для будущего расширения)
    async refreshToken(oldToken) {
        try {
            const decoded = jwt.verify(oldToken, this.JWT_SECRET, { ignoreExpiration: true });
            
            if (!decoded || !decoded.id || !decoded.username) {
                return null;
            }

            // Проверяем, что пользователь существует
            const user = await database.getUserByUsername(decoded.username);
            
            if (!user) {
                return null;
            }

            // Генерируем новый токен
            const newToken = this.generateToken(user);
            
            return {
                success: true,
                token: newToken,
                user: {
                    id: user.id,
                    username: user.username,
                    level: user.level || 1
                }
            };

        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }

    // Изменение пароля (для будущего расширения)
    async changePassword(userId, oldPassword, newPassword) {
        try {
            // Получаем пользователя
            const user = await database.getUserById(userId);
            
            if (!user) {
                return { error: 'User not found' };
            }

            // Проверяем старый пароль
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
            
            if (!isOldPasswordValid) {
                return { error: 'Current password is incorrect' };
            }

            // Валидация нового пароля
            const passwordValidation = this.validatePassword(newPassword);
            if (!passwordValidation.valid) {
                return { error: passwordValidation.error };
            }

            // Хэширование нового пароля
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);

            // Обновление пароля в БД
            await database.updatePassword(userId, newPasswordHash);

            console.log(`Password changed for user ID: ${userId}`);
            
            return { success: true };

        } catch (error) {
            console.error('Change password error:', error);
            return { error: 'Failed to change password' };
        }
    }

    // Получение данных пользователя по ID (для будущего расширения)
    async getUserProfile(userId) {
        try {
            const user = await database.getUserById(userId);
            
            if (!user) {
                return null;
            }

            // Не возвращаем хэш пароля
            delete user.password_hash;
            
            return user;

        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    }
}

// Экспорт singleton экземпляра
const authService = new AuthService();
module.exports = authService;