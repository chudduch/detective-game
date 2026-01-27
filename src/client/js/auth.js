class AuthManager {
    constructor() {
        this.api = api;
        this.currentUser = null;
        this.init();
    }
    
    async init() {
        // Проверяем сохранённый токен
        if (this.api.isAuthenticated()) {
            try {
                const result = await this.api.verifyToken();
                if (result.success) {
                    this.currentUser = result.user;
                    this.onLoginSuccess(this.currentUser);
                } else {
                    this.api.removeToken();
                }
            } catch (error) {
                console.log('Invalid token, removing...');
                this.api.removeToken();
            }
        }
        
        // Обновляем интерфейс
        this.updateUI();
    }
    
    async register(email, username, password) {
        try {
            const result = await this.api.register(email, username, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.api.setToken(result.token);
                this.onLoginSuccess(this.currentUser);
                this.showNotification('Регистрация успешна!', 'success');
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            throw error;
        }
    }
    
    async login(email, password) {
        try {
            const result = await this.api.login(email, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.onLoginSuccess(this.currentUser);
                this.showNotification('Вход выполнен успешно!', 'success');
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            throw error;
        }
    }
    
    logout() {
        this.currentUser = null;
        this.api.removeToken();
        this.onLogout();
        this.showNotification('Вы вышли из системы', 'info');
    }
    
    onLoginSuccess(user) {
        console.log('User logged in:', user);
        this.updateUI();
        
        // Обновляем данные профиля
        this.updateProfileInfo();
        
        // Переключаем на экран профиля
        this.showScreen('profile-screen');
    }
    
    onLogout() {
        console.log('User logged out');
        this.updateUI();
        this.showScreen('welcome-screen');
    }
    
    updateUI() {
        const isLoggedIn = !!this.currentUser;
        
        // Обновляем навигацию
        document.getElementById('nav-profile').style.display = 
            isLoggedIn ? 'inline-block' : 'none';
        document.getElementById('nav-logout').style.display = 
            isLoggedIn ? 'inline-block' : 'none';
            
        // Показываем/скрываем кнопки на главной
        document.getElementById('quick-play-btn').style.display = 
            isLoggedIn ? 'block' : 'none';
    }
    
    async updateProfileInfo() {
        if (!this.currentUser) return;
        
        try {
            const result = await this.api.getUserProfile(this.currentUser.userId);
            
            if (result.success) {
                const user = result.user;
                
                // Обновляем информацию в профиле
                document.getElementById('profile-username').textContent = 
                    user.display_name || user.username;
                document.getElementById('profile-email').textContent = user.email;
                document.getElementById('profile-rating').textContent = user.rating;
                
                // Определяем ранг по рейтингу
                const rank = this.getRank(user.rating);
                document.getElementById('profile-rank').textContent = rank;
                
                // Обновляем статистику
                document.getElementById('stat-games').textContent = 
                    user.games_played || 0;
                document.getElementById('stat-wins').textContent = 
                    user.games_won || 0;
                
                const winRate = user.games_played > 0 
                    ? Math.round((user.games_won / user.games_played) * 100) 
                    : 0;
                document.getElementById('stat-winrate').textContent = `${winRate}%`;
                
                // Форматируем лучшее время
                if (user.best_time) {
                    const minutes = Math.floor(user.best_time / 60);
                    const seconds = user.best_time % 60;
                    document.getElementById('stat-best-time').textContent = 
                        `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    }
    
    getRank(rating) {
        if (rating >= 2000) return 'Легенда';
        if (rating >= 1800) return 'Мастер';
        if (rating >= 1600) return 'Эксперт';
        if (rating >= 1400) return 'Опытный';
        if (rating >= 1200) return 'Детектив';
        return 'Новичок';
    }
    
    showScreen(screenId) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div>${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

const auth = new AuthManager();