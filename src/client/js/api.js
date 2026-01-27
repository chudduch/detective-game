class API {
    constructor() {
        this.baseURL = '';
        this.token = localStorage.getItem('detective_token') || '';
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
            }
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // Аутентификация
    async register(email, username, password) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password })
        });
    }
    
    async login(email, password) {
        const result = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (result.success && result.token) {
            this.setToken(result.token);
        }
        
        return result;
    }
    
    async verifyToken() {
        if (!this.token) {
            throw new Error('No token available');
        }
        
        return this.request('/api/auth/verify');
    }
    
    // Пользователи
    async getUserProfile(userId) {
        return this.request(`/api/users/${userId}`);
    }
    
    // Лидерборд
    async getLeaderboard(limit = 100) {
        return this.request(`/api/leaderboard?limit=${limit}`);
    }
    
    // Утилиты
    setToken(token) {
        this.token = token;
        localStorage.setItem('detective_token', token);
    }
    
    removeToken() {
        this.token = '';
        localStorage.removeItem('detective_token');
    }
    
    isAuthenticated() {
        return !!this.token;
    }
    
    // Проверка сервера
    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            return await response.json();
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}

const api = new API();