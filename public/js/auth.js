/**
 * Auth.js - логика для страницы аутентификации
 * Обрабатывает регистрацию, вход и проверку соединения с сервером
 */

// Конфигурация
const API_BASE_URL = window.location.origin;
const AUTH_ENDPOINTS = {
    register: '/api/register',
    login: '/api/login',
    verify: '/api/verify-token'
};

// DOM элементы
let loginForm, registerForm;
let loginUsernameInput, loginPasswordInput;
let registerUsernameInput, registerPasswordInput, registerConfirmInput, registerEmailInput;
let authTabs, switchToRegisterLink, switchToLoginLink;
let usernameAvailability, passwordStrength, passwordMatch;
let rulesModal, privacyModal, showRulesBtn, showPrivacyBtn;
let serverStatusIndicator;

// Состояние приложения
const appState = {
    token: localStorage.getItem('dm_token'),
    user: JSON.parse(localStorage.getItem('dm_user') || 'null'),
    serverConnected: false
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    checkServerConnection();
    
    // Если уже есть токен, проверяем его и перенаправляем в лобби
    if (appState.token) {
        verifyTokenAndRedirect();
    }
    
    // Показываем тестовые данные в консоли для разработки
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🎮 Detective Mastermind - Режим разработки');
        console.log('Тестовые аккаунты:');
        console.log('detective / detective123');
        console.log('forensic / forensic123');
        console.log('journalist / journalist123');
        console.log('private / private123');
    }
});

/**
 * Инициализация DOM элементов
 */
function initializeElements() {
    // Формы
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    
    // Поля ввода
    loginUsernameInput = document.getElementById('login-username');
    loginPasswordInput = document.getElementById('login-password');
    
    registerUsernameInput = document.getElementById('register-username');
    registerPasswordInput = document.getElementById('register-password');
    registerConfirmInput = document.getElementById('register-confirm');
    registerEmailInput = document.getElementById('register-email');
    
    // Табы
    authTabs = document.querySelectorAll('.tab-btn');
    switchToRegisterLink = document.querySelector('.switch-to-register');
    switchToLoginLink = document.querySelector('.switch-to-login');
    
    // Индикаторы
    usernameAvailability = document.getElementById('username-availability');
    passwordStrength = document.querySelector('.password-strength');
    passwordMatch = document.getElementById('password-match');
    
    // Модальные окна
    rulesModal = document.getElementById('rules-modal');
    privacyModal = document.getElementById('privacy-modal');
    showRulesBtn = document.getElementById('show-rules');
    showPrivacyBtn = document.getElementById('show-privacy');
    
    // Статус сервера
    serverStatusIndicator = document.getElementById('server-status');
    
    // Кнопки закрытия модальных окон
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
        });
    });
    
    // Закрытие модальных окон при клике вне контента
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Переключение табов
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Ссылки для переключения между формами
    if (switchToRegisterLink) {
        switchToRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('register');
        });
    }
    
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
    }
    
    // Валидация имени пользователя в реальном времени
    if (registerUsernameInput) {
        registerUsernameInput.addEventListener('input', debounce(validateUsername, 300));
    }
    
    // Валидация пароля в реальном времени
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', debounce(validatePasswordStrength, 300));
    }
    
    // Проверка совпадения паролей
    if (registerPasswordInput && registerConfirmInput) {
        registerPasswordInput.addEventListener('input', debounce(checkPasswordMatch, 300));
        registerConfirmInput.addEventListener('input', debounce(checkPasswordMatch, 300));
    }
    
    // Отправка формы входа
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Отправка формы регистрации
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // Открытие модальных окон
    if (showRulesBtn) {
        showRulesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            rulesModal.classList.add('active');
        });
    }
    
    if (showPrivacyBtn) {
        showPrivacyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            privacyModal.classList.add('active');
        });
    }
    
    // Автозаполнение тестовых данных (только для разработки)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setupDevShortcuts();
    }
}

/**
 * Переключение между табами входа и регистрации
 */
function switchTab(tabId) {
    // Обновляем активные табы
    authTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Показываем активную форму
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        if (form.id === `${tabId}-form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
    
    // Сбрасываем сообщения об ошибках
    clearValidationMessages();
    
    // Фокус на первое поле активной формы
    setTimeout(() => {
        const firstInput = document.querySelector(`#${tabId}-form input`);
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

/**
 * Обработка входа пользователя
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;
    
    // Валидация
    if (!username || !password) {
        showError('login', 'Пожалуйста, заполните все поля');
        return;
    }
    
    // Показываем индикатор загрузки
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.login}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Сохраняем токен и данные пользователя
            localStorage.setItem('dm_token', data.token);
            localStorage.setItem('dm_user', JSON.stringify(data.user));
            
            appState.token = data.token;
            appState.user = data.user;
            
            // Показываем успешное сообщение
            showSuccess('login', `Добро пожаловать, ${data.user.username}!`);
            
            // Перенаправляем в лобби через 1 секунду
            setTimeout(() => {
                window.location.href = '/lobby.html';
            }, 1000);
            
        } else {
            showError('login', data.error || 'Ошибка входа');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('login', 'Ошибка подключения к серверу');
        
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Обработка регистрации пользователя
 */
async function handleRegistration(e) {
    e.preventDefault();
    
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmInput.value;
    const email = registerEmailInput.value.trim() || null;
    
    // Валидация
    const usernameValidation = validateUsername();
    if (!usernameValidation.valid) {
        showError('register', usernameValidation.error);
        return;
    }
    
    if (password !== confirmPassword) {
        showError('register', 'Пароли не совпадают');
        return;
    }
    
    const passwordValidation = validatePasswordStrength();
    if (passwordValidation.score < 2) {
        showError('register', 'Пароль слишком слабый');
        return;
    }
    
    // Показываем индикатор загрузки
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.register}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Сохраняем токен и данные пользователя
            localStorage.setItem('dm_token', data.token);
            localStorage.setItem('dm_user', JSON.stringify(data.user));
            
            appState.token = data.token;
            appState.user = data.user;
            
            // Показываем успешное сообщение
            showSuccess('register', `Аккаунт ${data.user.username} успешно создан!`);
            
            // Автоматически входим и перенаправляем в лобби
            setTimeout(() => {
                window.location.href = '/lobby.html';
            }, 1500);
            
        } else {
            showError('register', data.error || 'Ошибка регистрации');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showError('register', 'Ошибка подключения к серверу');
        
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Валидация имени пользователя
 */
function validateUsername() {
    const username = registerUsernameInput.value.trim();
    const result = {
        valid: false,
        error: ''
    };
    
    if (!username) {
        result.error = 'Имя пользователя обязательно';
        updateUsernameAvailability('error', result.error);
        return result;
    }
    
    if (username.length < 3) {
        result.error = 'Имя пользователя должно быть не менее 3 символов';
        updateUsernameAvailability('error', result.error);
        return result;
    }
    
    if (username.length > 20) {
        result.error = 'Имя пользователя должно быть не более 20 символов';
        updateUsernameAvailability('error', result.error);
        return result;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
        result.error = 'Разрешены только буквы, цифры, подчеркивания и дефисы';
        updateUsernameAvailability('error', result.error);
        return result;
    }
    
    // Проверяем доступность имени (в реальном приложении - запрос к серверу)
    // Здесь только клиентская валидация, серверная проверка будет при отправке формы
    
    result.valid = true;
    updateUsernameAvailability('success', 'Имя пользователя доступно');
    return result;
}

/**
 * Валидация надежности пароля
 */
function validatePasswordStrength() {
    const password = registerPasswordInput.value;
    const result = {
        score: 0, // 0-4
        feedback: ''
    };
    
    if (!password) {
        updatePasswordStrength(0, 'Введите пароль');
        return result;
    }
    
    let score = 0;
    
    // Длина
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    
    // Сложность
    if (/[A-Z]/.test(password)) score++; // Заглавные буквы
    if (/[0-9]/.test(password)) score++; // Цифры
    if (/[^A-Za-z0-9]/.test(password)) score++; // Специальные символы
    
    result.score = Math.min(score, 4);
    
    // Обратная связь
    const feedback = {
        0: 'Очень слабый',
        1: 'Слабый',
        2: 'Средний',
        3: 'Хороший',
        4: 'Отличный'
    };
    
    result.feedback = feedback[result.score];
    updatePasswordStrength(result.score, result.feedback);
    
    return result;
}

/**
 * Проверка совпадения паролей
 */
function checkPasswordMatch() {
    const password = registerPasswordInput.value;
    const confirm = registerConfirmInput.value;
    
    if (!password || !confirm) {
        updatePasswordMatch('neutral', '');
        return false;
    }
    
    if (password === confirm) {
        updatePasswordMatch('success', 'Пароли совпадают');
        return true;
    } else {
        updatePasswordMatch('error', 'Пароли не совпадают');
        return false;
    }
}

/**
 * Обновление индикатора доступности имени пользователя
 */
function updateUsernameAvailability(status, message) {
    if (!usernameAvailability) return;
    
    usernameAvailability.textContent = message;
    usernameAvailability.className = 'availability-status';
    
    switch (status) {
        case 'success':
            usernameAvailability.classList.add('success');
            break;
        case 'error':
            usernameAvailability.classList.add('error');
            break;
        default:
            usernameAvailability.classList.add('neutral');
    }
}

/**
 * Обновление индикатора надежности пароля
 */
function updatePasswordStrength(score, feedback) {
    if (!passwordStrength) return;
    
    const bar = passwordStrength.querySelector('.strength-bar');
    const text = passwordStrength.querySelector('.strength-text');
    
    if (!bar || !text) return;
    
    // Обновляем ширину полосы
    const percentage = (score / 4) * 100;
    bar.style.width = `${percentage}%`;
    
    // Обновляем цвет и текст
    const colors = {
        0: '#e74c3c', // Красный
        1: '#e67e22', // Оранжевый
        2: '#f1c40f', // Желтый
        3: '#2ecc71', // Зеленый
        4: '#27ae60'  // Темно-зеленый
    };
    
    bar.style.backgroundColor = colors[score] || colors[0];
    text.textContent = feedback;
    text.style.color = colors[score] || colors[0];
}

/**
 * Обновление индикатора совпадения паролей
 */
function updatePasswordMatch(status, message) {
    if (!passwordMatch) return;
    
    passwordMatch.textContent = message;
    passwordMatch.className = 'match-status';
    
    switch (status) {
        case 'success':
            passwordMatch.classList.add('success');
            break;
        case 'error':
            passwordMatch.classList.add('error');
            break;
        default:
            passwordMatch.classList.add('neutral');
    }
}

/**
 * Проверка соединения с сервером
 */
async function checkServerConnection() {
    try {
        const response = await fetch(API_BASE_URL);
        if (response.ok) {
            updateServerStatus('connected', 'Сервер доступен');
            appState.serverConnected = true;
        } else {
            updateServerStatus('warning', 'Сервер отвечает с ошибкой');
            appState.serverConnected = false;
        }
    } catch (error) {
        updateServerStatus('error', 'Нет соединения с сервером');
        appState.serverConnected = false;
    }
}

/**
 * Обновление статуса сервера
 */
function updateServerStatus(status, message) {
    if (!serverStatusIndicator) return;
    
    const icon = serverStatusIndicator.querySelector('i');
    
    serverStatusIndicator.innerHTML = '';
    serverStatusIndicator.className = 'status-indicator';
    
    let iconClass, colorClass;
    
    switch (status) {
        case 'connected':
            iconClass = 'fa-check-circle';
            colorClass = 'connected';
            break;
        case 'warning':
            iconClass = 'fa-exclamation-triangle';
            colorClass = 'warning';
            break;
        case 'error':
            iconClass = 'fa-times-circle';
            colorClass = 'error';
            break;
        default:
            iconClass = 'fa-circle';
            colorClass = 'neutral';
    }
    
    const iconElement = document.createElement('i');
    iconElement.className = `fas ${iconClass}`;
    serverStatusIndicator.appendChild(iconElement);
    
    const textElement = document.createTextNode(` ${message}`);
    serverStatusIndicator.appendChild(textElement);
    serverStatusIndicator.classList.add(colorClass);
}

/**
 * Проверка токена и перенаправление в лобби
 */
async function verifyTokenAndRedirect() {
    if (!appState.token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.verify}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: appState.token })
        });
        
        const data = await response.json();
        
        if (response.ok && data.valid) {
            // Токен валиден, перенаправляем в лобби
            window.location.href = '/lobby.html';
        } else {
            // Токен невалиден, очищаем localStorage
            localStorage.removeItem('dm_token');
            localStorage.removeItem('dm_user');
            appState.token = null;
            appState.user = null;
        }
        
    } catch (error) {
        console.error('Token verification error:', error);
        // В случае ошибки оставляем пользователя на странице входа
    }
}

/**
 * Показ сообщения об ошибке
 */
function showError(formType, message) {
    // Находим контейнер для сообщений
    const form = document.getElementById(`${formType}-form`);
    let errorContainer = form.querySelector('.error-message');
    
    // Создаем контейнер, если его нет
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        form.insertBefore(errorContainer, form.firstChild);
    }
    
    // Показываем сообщение
    errorContainer.innerHTML = `
        <div class="alert alert-error">
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        </div>
    `;
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

/**
 * Показ сообщения об успехе
 */
function showSuccess(formType, message) {
    const form = document.getElementById(`${formType}-form`);
    let successContainer = form.querySelector('.success-message');
    
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.className = 'success-message';
        form.insertBefore(successContainer, form.firstChild);
    }
    
    successContainer.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        successContainer.innerHTML = '';
    }, 5000);
}

/**
 * Очистка сообщений валидации
 */
function clearValidationMessages() {
    const errorMessages = document.querySelectorAll('.error-message');
    const successMessages = document.querySelectorAll('.success-message');
    
    errorMessages.forEach(el => el.innerHTML = '');
    successMessages.forEach(el => el.innerHTML = '');
}

/**
 * Утилита: дебаунс
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Настройка горячих клавиш для разработки
 */
function setupDevShortcuts() {
    console.log('🔧 Режим разработки активирован');
    console.log('Горячие клавиши:');
    console.log('Ctrl+1 - Заполнить форму входа detective');
    console.log('Ctrl+2 - Заполнить форму входа forensic');
    console.log('Ctrl+3 - Заполнить форму входа journalist');
    console.log('Ctrl+4 - Заполнить форму входа private');
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && !e.altKey && !e.shiftKey) {
            const testAccounts = {
                '1': { username: 'detective', password: 'detective123' },
                '2': { username: 'forensic', password: 'forensic123' },
                '3': { username: 'journalist', password: 'journalist123' },
                '4': { username: 'private', password: 'private123' }
            };
            
            const account = testAccounts[e.key];
            if (account) {
                e.preventDefault();
                
                // Переключаемся на вкладку входа
                switchTab('login');
                
                // Заполняем форму
                setTimeout(() => {
                    loginUsernameInput.value = account.username;
                    loginPasswordInput.value = account.password;
                    
                    // Показываем уведомление
                    const notification = document.createElement('div');
                    notification.className = 'dev-notification';
                    notification.innerHTML = `
                        <div style="
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #2ecc71;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 5px;
                            z-index: 1000;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        ">
                            <i class="fas fa-magic"></i>
                            Заполнено: ${account.username} / ${account.password}
                        </div>
                    `;
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                    
                }, 100);
            }
        }
    });
}

// Добавляем стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    .alert {
        padding: 12px 16px;
        border-radius: var(--radius-md);
        margin-bottom: var(--space-md);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    }
    
    .alert-error {
        background: rgba(231, 76, 60, 0.2);
        border: 1px solid rgba(231, 76, 60, 0.5);
        color: #e74c3c;
    }
    
    .alert-success {
        background: rgba(46, 204, 113, 0.2);
        border: 1px solid rgba(46, 204, 113, 0.5);
        color: #2ecc71;
    }
    
    .availability-status,
    .match-status {
        font-size: 0.85rem;
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        display: inline-block;
    }
    
    .availability-status.success,
    .match-status.success {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
    }
    
    .availability-status.error,
    .match-status.error {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
    }
    
    .availability-status.neutral,
    .match-status.neutral {
        background: rgba(149, 165, 166, 0.2);
        color: #95a5a6;
    }
    
    .password-strength {
        margin-top: 8px;
    }
    
    .strength-bar {
        height: 4px;
        background: #e74c3c;
        border-radius: 2px;
        margin-bottom: 4px;
        transition: width 0.3s ease, background-color 0.3s ease;
    }
    
    .strength-text {
        font-size: 0.85rem;
        color: #95a5a6;
    }
    
    @keyframes slideIn {
        from {
            transform: translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .status-indicator.connected {
        color: #2ecc71;
    }
    
    .status-indicator.warning {
        color: #f39c12;
    }
    
    .status-indicator.error {
        color: #e74c3c;
    }
`;
document.head.appendChild(style);