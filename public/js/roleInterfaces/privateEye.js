/**
 * Private Eye Interface - интерфейс для роли Частного детектива
 */

// Состояние интерфейса частного детектива
const PrivateEyeState = {
    // Досье на подозреваемых
    dossiers: [],
    
    // Журнал наблюдения
    surveillanceLog: [],
    
    // Задание клиента
    clientBrief: null,
    
    // Скрытые мотивы
    hiddenMotives: [],
    
    // Криминальные контакты
    criminalContacts: [],
    
    // Активное наблюдение
    activeSurveillance: null,
    
    // Способности
    abilities: {
        surveillance: {
            name: "Наблюдение",
            description: "Следить за подозреваемым и получать скрытую информацию",
            cooldown: 300,
            lastUsed: 0
        },
        underworld_contact: {
            name: "Криминальный контакт",
            description: "Получить информацию из криминальных кругов",
            cooldown: 420,
            lastUsed: 0
        },
        hidden_motive: {
            name: "Скрытый мотив",
            description: "Раскрыть истинные мотивы персонажа",
            cooldown: 360,
            lastUsed: 0
        }
    },
    
    // Секретная цель клиента
    secretObjective: null
};

/**
 * Инициализация интерфейса частного детектива
 */
function initPrivateEyeInterface(playerData) {
    console.log('Инициализация интерфейса Частного детектива:', playerData);
    
    // Обновляем состояние
    updatePrivateEyeState(playerData);
    
    // Создаем интерфейс
    createPrivateEyeInterface();
    
    // Загружаем начальные данные
    loadPrivateEyeData();
    
    // Настраиваем обработчики событий
    setupPrivateEyeEventHandlers();
    
    // Обновляем кд способностей
    updatePrivateEyeAbilityCooldowns();
}

/**
 * Обновление состояния частного детектива
 */
function updatePrivateEyeState(playerData) {
    // Сохраняем специальную информацию
    if (playerData.specialInfo) {
        PrivateEyeState.dossiers = playerData.specialInfo.hiddenMotives || [];
        PrivateEyeState.surveillanceLog = playerData.specialInfo.surveillanceReports || [];
        PrivateEyeState.clientBrief = playerData.specialInfo.clientObjective || 'Собрать компрометирующие материалы на подозреваемых';
        PrivateEyeState.secretObjective = playerData.specialInfo.clientObjective || 'Определить истинного заказчика преступления';
    }
    
    // Инициализируем способности
    if (playerData.roleInfo && playerData.roleInfo.abilities) {
        playerData.roleInfo.abilities.forEach(ability => {
            if (PrivateEyeState.abilities[ability.id]) {
                PrivateEyeState.abilities[ability.id].description = ability.description;
                PrivateEyeState.abilities[ability.id].cooldown = ability.cooldown || 0;
            }
        });
    }
}

/**
 * Создание интерфейса частного детектива
 */
function createPrivateEyeInterface() {
    const interfaceContainer = document.getElementById('role-specific-interface');
    if (!interfaceContainer) return;
    
    interfaceContainer.innerHTML = '';
    interfaceContainer.className = 'private-eye-interface';
    
    // Основная структура интерфейса
    interfaceContainer.innerHTML = `
        <div class="role-interface">
            <!-- Задание клиента -->
            <div class="role-section client-section">
                <h3><i class="fas fa-user-secret"></i> Задание клиента</h3>
                <div class="client-brief" id="client-brief">
                    <!-- Задание будет загружено динамически -->
                    <div class="brief-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Загрузка задания...</p>
                    </div>
                </div>
            </div>
            
            <!-- Досье -->
            <div class="role-section dossiers-section">
                <h3><i class="fas fa-folder"></i> Досье на подозреваемых</h3>
                <div class="dossier-container" id="dossier-container">
                    <!-- Досье будут загружены динамически -->
                </div>
            </div>
            
            <!-- Скрытые действия -->
            <div class="role-section covert-section">
                <h3><i class="fas fa-eye-slash"></i> Скрытые действия</h3>
                <div class="covert-actions" id="covert-actions">
                    <!-- Кнопки действий будут созданы динамически -->
                </div>
            </div>
            
            <!-- Журнал наблюдения -->
            <div class="role-section surveillance-section">
                <h3><i class="fas fa-binoculars"></i> Журнал наблюдения</h3>
                <div class="surveillance-log" id="surveillance-log">
                    <!-- Записи наблюдения -->
                    <div class="log-placeholder">
                        <i class="fas fa-binoculars"></i>
                        <p>Начните наблюдение за подозреваемыми</p>
                    </div>
                </div>
                <div class="surveillance-controls">
                    <button class="btn btn-primary" id="start-surveillance">
                        <i class="fas fa-play"></i> Начать наблюдение
                    </button>
                    <button class="btn btn-secondary" id="review-log">
                        <i class="fas fa-search"></i> Анализировать записи
                    </button>
                </div>
            </div>
            
            <!-- Криминальные контакты -->
            <div class="role-section contacts-section">
                <h3><i class="fas fa-address-book"></i> Криминальные контакты</h3>
                <div class="underworld-contacts" id="underworld-contacts">
                    <!-- Список контактов -->
                    <div class="contacts-placeholder">
                        <i class="fas fa-user-ninja"></i>
                        <p>Используйте криминальные контакты для получения информации</p>
                    </div>
                </div>
                <div class="contacts-controls">
                    <button class="btn btn-primary" id="contact-underworld">
                        <i class="fas fa-phone"></i> Связаться с контактом
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем компоненты
    initializeClientBrief();
    initializeDossiers();
    initializeCovertActions();
    initializeSurveillanceLog();
    initializeUnderworldContacts();
}

/**
 * Инициализация задания клиента
 */
function initializeClientBrief() {
    const clientBriefContainer = document.getElementById('client-brief');
    if (!clientBriefContainer) return;
    
    updateClientBrief();
}

/**
 * Инициализация досье
 */
function initializeDossiers() {
    const dossierContainer = document.getElementById('dossier-container');
    if (!dossierContainer) return;
    
    updateDossiers();
}

/**
 * Инициализация скрытых действий
 */
function initializeCovertActions() {
    const covertActionsContainer = document.getElementById('covert-actions');
    if (!covertActionsContainer) return;
    
    createCovertActionButtons();
}

/**
 * Инициализация журнала наблюдения
 */
function initializeSurveillanceLog() {
    const surveillanceLog = document.getElementById('surveillance-log');
    const startSurveillanceBtn = document.getElementById('start-surveillance');
    const reviewLogBtn = document.getElementById('review-log');
    
    if (!surveillanceLog) return;
    
    // Обработчики кнопок
    if (startSurveillanceBtn) {
        startSurveillanceBtn.addEventListener('click', startNewSurveillance);
    }
    
    if (reviewLogBtn) {
        reviewLogBtn.addEventListener('click', reviewSurveillanceLog);
    }
    
    // Обновляем журнал
    updateSurveillanceLog();
}

/**
 * Инициализация криминальных контактов
 */
function initializeUnderworldContacts() {
    const contactsContainer = document.getElementById('underworld-contacts');
    const contactBtn = document.getElementById('contact-underworld');
    
    if (!contactsContainer) return;
    
    // Обработчик кнопки
    if (contactBtn) {
        contactBtn.addEventListener('click', contactUnderworld);
    }
    
    // Загружаем контакты
    loadUnderworldContacts();
}

/**
 * Загрузка начальных данных
 */
function loadPrivateEyeData() {
    // Если нет досье, загружаем примерные
    if (PrivateEyeState.dossiers.length === 0) {
        loadSampleDossiers();
    }
    
    // Если нет записей наблюдения, добавляем начальные
    if (PrivateEyeState.surveillanceLog.length === 0) {
        loadInitialSurveillanceEntries();
    }
    
    // Загружаем криминальные контакты
    if (PrivateEyeState.criminalContacts.length === 0) {
        loadCriminalContacts();
    }
}

/**
 * Настройка обработчиков событий
 */
function setupPrivateEyeEventHandlers() {
    // Обработчики уже настроены в функциях инициализации
}

/**
 * Обновление задания клиента
 */
function updateClientBrief() {
    const clientBriefContainer = document.getElementById('client-brief');
    if (!clientBriefContainer) return;
    
    clientBriefContainer.innerHTML = '';
    
    const briefElement = document.createElement('div');
    briefElement.className = 'client-brief-content';
    
    briefElement.innerHTML = `
        <div class="brief-header">
            <div class="brief-title">Конфиденциально</div>
            <div class="brief-priority">Высокий приоритет</div>
        </div>
        
        <div class="brief-body">
            <div class="brief-objective">
                <h4><i class="fas fa-bullseye"></i> Основная цель:</h4>
                <p>${PrivateEyeState.clientBrief || 'Собрать информацию о преступлении'}</p>
            </div>
            
            <div class="brief-secret" style="display: ${PrivateEyeState.secretObjective ? 'block' : 'none'}">
                <h4><i class="fas fa-lock"></i> Секретная цель:</h4>
                <p class="secret-text">${PrivateEyeState.secretObjective}</p>
                <small><i class="fas fa-exclamation-triangle"></i> Не раскрывать другим игрокам</small>
            </div>
            
            <div class="brief-notes">
                <h4><i class="fas fa-sticky-note"></i> Примечания клиента:</h4>
                <ul>
                    <li>Используйте все доступные методы наблюдения</li>
                    <li>Клиента интересует финансовая сторона дела</li>
                    <li>Ищите связи с криминальным миром</li>
                    <li>Собирайте компрометирующие материалы</li>
                </ul>
            </div>
        </div>
        
        <div class="brief-footer">
            <div class="brief-reward">
                <i class="fas fa-money-bill-wave"></i>
                Вознаграждение: Конфиденциально
            </div>
            <button class="btn btn-small btn-secondary" onclick="shareClientInfo()">
                <i class="fas fa-share"></i> Поделиться (общая информация)
            </button>
        </div>
    `;
    
    clientBriefContainer.appendChild(briefElement);
}

/**
 * Обновление досье
 */
function updateDossiers() {
    const dossierContainer = document.getElementById('dossier-container');
    if (!dossierContainer) return;
    
    dossierContainer.innerHTML = '';
    
    if (PrivateEyeState.dossiers.length === 0) {
        dossierContainer.innerHTML = `
            <div class="no-dossiers">
                <i class="fas fa-folder-open"></i>
                <p>Досье еще не собраны</p>
                <button class="btn btn-small" onclick="investigateHiddenMotives()">
                    <i class="fas fa-search"></i> Исследовать мотивы
                </button>
            </div>
        `;
        return;
    }
    
    PrivateEyeState.dossiers.forEach((dossier, index) => {
        const dossierCard = document.createElement('div');
        dossierCard.className = 'dossier-card';
        dossierCard.dataset.dossierIndex = index;
        
        dossierCard.innerHTML = `
            <div class="dossier-photo">
                <i class="fas fa-user-secret"></i>
            </div>
            <div class="dossier-name">${dossier.name || `Подозреваемый #${index + 1}`}</div>
            <div class="dossier-role">${dossier.role || 'Неизвестно'}</div>
            <div class="dossier-motives">
                <i class="fas fa-brain"></i>
                ${dossier.hiddenMotive || 'Мотивы не исследованы'}
            </div>
            <div class="dossier-actions">
                <button class="btn btn-small btn-primary" onclick="investigatePerson(${index})">
                    <i class="fas fa-search"></i>
                </button>
                <button class="btn btn-small btn-secondary" onclick="shareDossier(${index})">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        // Обработчик клика для просмотра деталей
        dossierCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
                showDossierDetails(index);
            }
        });
        
        dossierContainer.appendChild(dossierCard);
    });
}

/**
 * Создание кнопок скрытых действий
 */
function createCovertActionButtons() {
    const covertActionsContainer = document.getElementById('covert-actions');
    if (!covertActionsContainer) return;
    
    covertActionsContainer.innerHTML = '';
    
    // Создаем кнопки для каждой способности
    Object.entries(PrivateEyeState.abilities).forEach(([abilityId, ability]) => {
        const actionButton = document.createElement('button');
        actionButton.className = 'covert-action';
        actionButton.id = `covert-${abilityId}`;
        actionButton.dataset.abilityId = abilityId;
        
        actionButton.innerHTML = `
            <i class="fas fa-${getCovertActionIcon(abilityId)}"></i>
            <div class="action-name">${ability.name}</div>
            <div class="action-description">${ability.description}</div>
            <div class="cooldown" id="cooldown-${abilityId}">Готово</div>
        `;
        
        // Обработчик клика
        actionButton.addEventListener('click', () => {
            useCovertAction(abilityId);
        });
        
        covertActionsContainer.appendChild(actionButton);
    });
}

/**
 * Обновление журнала наблюдения
 */
function updateSurveillanceLog() {
    const surveillanceLog = document.getElementById('surveillance-log');
    if (!surveillanceLog) return;
    
    // Удаляем плейсхолдер
    const placeholder = surveillanceLog.querySelector('.log-placeholder');
    if (placeholder && PrivateEyeState.surveillanceLog.length > 0) {
        placeholder.remove();
    }
    
    // Если записей нет, показываем плейсхолдер
    if (PrivateEyeState.surveillanceLog.length === 0) {
        if (!placeholder) {
            surveillanceLog.innerHTML = `
                <div class="log-placeholder">
                    <i class="fas fa-binoculars"></i>
                    <p>Начните наблюдение за подозреваемыми</p>
                </div>
            `;
        }
        return;
    }
    
    // Обновляем только если нужно
    if (surveillanceLog.children.length === PrivateEyeState.surveillanceLog.length + (placeholder ? 1 : 0)) {
        return;
    }
    
    surveillanceLog.innerHTML = '';
    
    // Показываем последние 5 записей
    const recentLogs = PrivateEyeState.surveillanceLog.slice(-5).reverse();
    
    recentLogs.forEach((entry, index) => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        logEntry.innerHTML = `
            <div class="log-time">${entry.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="log-content">
                <span class="log-subject">${entry.subject || 'Неизвестный'}</span>
                ${entry.action || 'Наблюдение'}
            </div>
            <div class="log-importance ${entry.important ? 'important' : ''}">
                ${entry.important ? 'Важно!' : ''}
            </div>
        `;
        
        surveillanceLog.appendChild(logEntry);
    });
}

/**
 * Загрузка криминальных контактов
 */
function loadUnderworldContacts() {
    const contactsContainer = document.getElementById('underworld-contacts');
    if (!contactsContainer) return;
    
    // Примерные криминальные контакты
    PrivateEyeState.criminalContacts = [
        {
            id: 'contact1',
            name: 'Тень',
            specialization: 'Информация о черном рынке искусства',
            reliability: 0.8,
            lastContact: null,
            status: 'available'
        },
        {
            id: 'contact2',
            name: 'Молчун',
            specialization: 'Букмекерские конторы и gambling долги',
            reliability: 0.7,
            lastContact: null,
            status: 'available'
        },
        {
            id: 'contact3',
            name: 'Сова',
            specialization: 'Ночная жизнь и тайные встречи',
            reliability: 0.9,
            lastContact: null,
            status: 'available'
        }
    ];
    
    updateUnderworldContactsDisplay();
}

/**
 * Обновление отображения криминальных контактов
 */
function updateUnderworldContactsDisplay() {
    const contactsContainer = document.getElementById('underworld-contacts');
    if (!contactsContainer) return;
    
    // Удаляем плейсхолдер
    const placeholder = contactsContainer.querySelector('.contacts-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    contactsContainer.innerHTML = '';
    
    PrivateEyeState.criminalContacts.forEach(contact => {
        const contactCard = document.createElement('div');
        contactCard.className = `underworld-contact ${contact.status}`;
        contactCard.dataset.contactId = contact.id;
        
        const reliabilityColor = contact.reliability >= 0.8 ? '#2ecc71' : 
                                contact.reliability >= 0.6 ? '#f39c12' : '#e74c3c';
        
        contactCard.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user-ninja"></i>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-specialization">${contact.specialization}</div>
                <div class="contact-reliability">
                    <div class="reliability-bar">
                        <div class="reliability-fill" style="
                            width: ${contact.reliability * 100}%;
                            background: ${reliabilityColor};
                        "></div>
                    </div>
                    <span>Надежность: ${Math.round(contact.reliability * 100)}%</span>
                </div>
            </div>
            <div class="contact-status">
                ${contact.status === 'available' ? 
                    '<i class="fas fa-check-circle" style="color: #2ecc71;"></i>' : 
                    '<i class="fas fa-clock" style="color: #f39c12;"></i>'}
            </div>
        `;
        
        // Обработчик клика
        contactCard.addEventListener('click', () => {
            selectUnderworldContact(contact.id);
        });
        
        contactsContainer.appendChild(contactCard);
    });
}

/**
 * Использование скрытого действия
 */
function useCovertAction(abilityId) {
    const ability = PrivateEyeState.abilities[abilityId];
    if (!ability) return;
    
    // Проверка кд
    if (!checkPrivateEyeAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updatePrivateEyeAbilityCooldown(abilityId);
    
    // Выполняем действие
    switch (abilityId) {
        case 'surveillance':
            performSurveillance();
            break;
            
        case 'underworld_contact':
            contactUnderworld();
            break;
            
        case 'hidden_motive':
            investigateHiddenMotives();
            break;
    }
}

/**
 * Выполнение наблюдения
 */
function performSurveillance() {
    showPrivateEyeNotification('Выбор цели для наблюдения...', 'info');
    
    // Показываем диалог выбора цели
    showSurveillanceTargetDialog();
}

/**
 * Начать новое наблюдение
 */
function startNewSurveillance() {
    useCovertAction('surveillance');
}

/**
 * Контакт с криминальным миром
 */
function contactUnderworld() {
    const ability = PrivateEyeState.abilities.underworld_contact;
    if (!checkPrivateEyeAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updatePrivateEyeAbilityCooldown('underworld_contact');
    
    showPrivateEyeNotification('Установление связи с криминальным миром...', 'info');
    
    // Имитация контакта
    setTimeout(() => {
        const contact = getRandomAvailableContact();
        if (!contact) {
            showPrivateEyeNotification('Все контакты недоступны', 'warning');
            return;
        }
        
        // Обновляем статус контакта
        contact.status = 'cooldown';
        contact.lastContact = new Date().toISOString();
        
        // Получаем информацию
        const info = getUnderworldInformation(contact);
        
        // Добавляем в журнал
        addSurveillanceLog({
            subject: contact.name,
            action: `Контакт: ${info}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            important: true
        });
        
        // Обновляем отображение
        updateUnderworldContactsDisplay();
        
        showPrivateEyeNotification(`Получена информация от "${contact.name}": ${info}`, 'success');
        
        // Через 5 минут контакт снова доступен
        setTimeout(() => {
            contact.status = 'available';
            updateUnderworldContactsDisplay();
        }, 5 * 60 * 1000); // 5 минут в реальном времени
        
    }, 2000);
}

/**
 * Исследование скрытых мотивов
 */
function investigateHiddenMotives() {
    const ability = PrivateEyeState.abilities.hidden_motive;
    if (!checkPrivateEyeAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updatePrivateEyeAbilityCooldown('hidden_motive');
    
    showPrivateEyeNotification('Исследование скрытых мотивов...', 'info');
    
    // Имитация исследования
    setTimeout(() => {
        // Если досье пустые, загружаем образцы
        if (PrivateEyeState.dossiers.length === 0) {
            loadSampleDossiers();
        } else {
            // Или обновляем существующие
            updateRandomDossier();
        }
        
        updateDossiers();
        showPrivateEyeNotification('Обнаружены новые скрытые мотивы', 'success');
        
    }, 2500);
}

/**
 * Загрузка примерных досье
 */
function loadSampleDossiers() {
    PrivateEyeState.dossiers = [
        {
            name: 'Доктор Артур Вэнс',
            role: 'Куратор музея',
            hiddenMotive: 'Крупные gambling долги. Продавал личную коллекцию через черный рынок.',
            additionalInfo: 'Тайные встречи: 3 раза за последнюю неделю',
            evidence: ['Записи телефонных разговоров с букмекерами', 'Продажа имущества']
        },
        {
            name: 'Миллисент Фэрчайлд',
            role: 'Благотворитель',
            hiddenMotive: 'Финансовые проблемы из-за неудачных инвестиций. Пытается сохранить репутацию.',
            additionalInfo: 'Переговоры о продаже активов',
            evidence: ['Конфиденциальные финансовые документы']
        },
        {
            name: 'Виктор Кроули',
            role: 'Охранник',
            hiddenMotive: 'Сын нуждается в дорогостоящей операции. Ищет быстрые деньги.',
            additionalInfo: 'Опрашивал коллег о дополнительной работе',
            evidence: ['Медицинские счета', 'Запросы на кредиты']
        },
        {
            name: 'Изабелла Росси',
            role: 'Арт-дилер',
            hiddenMotive: 'Конкурирующий аукционный дом предложил большую комиссию за вазу.',
            additionalInfo: 'Связи с подозрительными коллекционерами',
            evidence: ['Переписка с конкурентами']
        }
    ];
}

/**
 * Обновление случайного досье
 */
function updateRandomDossier() {
    if (PrivateEyeState.dossiers.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * PrivateEyeState.dossiers.length);
    const dossier = PrivateEyeState.dossiers[randomIndex];
    
    // Добавляем дополнительную информацию
    const additionalInfos = [
        'Замечен в нервном состоянии накануне кражи',
        'Недавно менял пароли от всех аккаунтов',
        'Имеет альтернативный паспорт',
        'Совершал крупные денежные переводы',
        'Встречался с подозрительными личностями'
    ];
    
    dossier.additionalInfo = additionalInfos[Math.floor(Math.random() * additionalInfos.length)];
}

/**
 * Загрузка начальных записей наблюдения
 */
function loadInitialSurveillanceEntries() {
    PrivateEyeState.surveillanceLog = [
        {
            subject: 'Доктор Вэнс',
            action: 'Посетил банк трижды на прошлой неделе',
            time: 'Вчера, 14:30',
            important: true
        },
        {
            subject: 'Миллисент Фэрчайлд',
            action: 'Приобрела билет в Швейцарию на следующей неделе',
            time: 'Вчера, 16:45',
            important: false
        },
        {
            subject: 'Общая информация',
            action: 'Музей планировал сокращения штата',
            time: '2 дня назад, 11:20',
            important: true
        }
    ];
}

/**
 * Добавление записи в журнал наблюдения
 */
function addSurveillanceLog(entry) {
    PrivateEyeState.surveillanceLog.push(entry);
    updateSurveillanceLog();
}

/**
 * Показать диалог выбора цели для наблюдения
 */
function showSurveillanceTargetDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'surveillance-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const targets = PrivateEyeState.dossiers.length > 0 ? 
        PrivateEyeState.dossiers : 
        [{name: 'Доктор Вэнс'}, {name: 'Миллисент Фэрчайлд'}, {name: 'Виктор Кроули'}, {name: 'Изабелла Росси'}];
    
    dialog.innerHTML = `
        <div class="dialog-content" style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            border: 2px solid #f39c12;
        ">
            <div class="dialog-header">
                <h3 style="margin: 0; color: #f39c12;">
                    <i class="fas fa-binoculars"></i> Выбор цели наблюдения
                </h3>
                <button class="close-dialog" onclick="this.closest('.surveillance-dialog').remove()">&times;</button>
            </div>
            <div class="dialog-body">
                <p style="color: #95a5a6; margin-bottom: 20px;">
                    Выберите цель для скрытого наблюдения. Будьте осторожны, чтобы не быть замеченным.
                </p>
                
                <div class="surveillance-targets">
                    ${targets.map((target, index) => `
                        <div class="target-option" onclick="startSurveillanceOnTarget('${target.name}', ${index})">
                            <div class="target-avatar">
                                <i class="fas fa-user-secret"></i>
                            </div>
                            <div class="target-info">
                                <div class="target-name">${target.name}</div>
                                <div class="target-role">${target.role || 'Подозреваемый'}</div>
                            </div>
                            <div class="target-risk">
                                <div class="risk-level ${getRiskLevel(target)}">${getRiskText(target)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" onclick="this.closest('.surveillance-dialog').remove()">
                    Отмена
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

/**
 * Начать наблюдение за целью
 */
function startSurveillanceOnTarget(targetName, targetIndex) {
    // Закрываем диалог
    const dialog = document.querySelector('.surveillance-dialog');
    if (dialog) dialog.remove();
    
    showPrivateEyeNotification(`Начато наблюдение за ${targetName}...`, 'info');
    
    // Устанавливаем активное наблюдение
    PrivateEyeState.activeSurveillance = {
        target: targetName,
        startTime: new Date(),
        status: 'active'
    };
    
    // Имитация наблюдения
    setTimeout(() => {
        const surveillanceResults = conductSurveillance(targetName);
        
        // Добавляем результаты в журнал
        addSurveillanceLog({
            subject: targetName,
            action: surveillanceResults,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            important: true
        });
        
        // Сбрасываем активное наблюдение
        PrivateEyeState.activeSurveillance = null;
        
        showPrivateEyeNotification(`Наблюдение за ${targetName} завершено`, 'success');
        
    }, 3000);
}

/**
 * Проведение наблюдения
 */
function conductSurveillance(targetName) {
    const surveillanceResults = {
        'Доктор Вэнс': 'Обнаружена тайная встреча с неизвестным в кафе. Передал конверт.',
        'Миллисент Фэрчайлд': 'Посетила адвоката. Выносила из офиса папку с документами.',
        'Виктор Кроули': 'Совершил несколько подозрительных звонков. Проверял расписание охраны.',
        'Изабелла Росси': 'Встречалась с иностранным коллекционером. Обсуждали "специальную доставку".',
        'default': 'Цель вела себя обыденно. Подозрительных действий не замечено.'
    };
    
    return surveillanceResults[targetName] || surveillanceResults.default;
}

/**
 * Анализ журнала наблюдения
 */
function reviewSurveillanceLog() {
    if (PrivateEyeState.surveillanceLog.length === 0) {
        showPrivateEyeNotification('Журнал наблюдения пуст', 'warning');
        return;
    }
    
    showPrivateEyeNotification('Анализ журнала наблюдения...', 'info');
    
    // Имитация анализа
    setTimeout(() => {
        const analysis = analyzeSurveillanceLog();
        
        // Добавляем анализ в журнал
        addSurveillanceLog({
            subject: 'Аналитик',
            action: `Анализ журнала: ${analysis}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            important: true
        });
        
        showPrivateEyeNotification('Анализ завершен. Обнаружены закономерности.', 'success');
        
    }, 2000);
}

/**
 * Анализ журнала наблюдения
 */
function analyzeSurveillanceLog() {
    const patterns = [
        'Доктор Вэнс проявляет наибольшую активность в финансовых вопросах',
        'Все подозреваемые имеют финансовые мотивы',
        'Наблюдается координация действий между некоторыми подозреваемыми',
        'Временные промежутки между подозрительными действиями сокращаются'
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Выбор криминального контакта
 */
function selectUnderworldContact(contactId) {
    const contact = PrivateEyeState.criminalContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (contact.status !== 'available') {
        showPrivateEyeNotification(`${contact.name} временно недоступен`, 'warning');
        return;
    }
    
    // Показываем детали контакта
    const modal = document.getElementById('evidence-modal');
    const modalBody = document.getElementById('evidence-modal-body');
    
    if (!modal || !modalBody) {
        createTempContactModal(contact);
        return;
    }
    
    modalBody.innerHTML = `
        <h3>${contact.name}</h3>
        <div class="contact-type">Криминальный контакт</div>
        
        <div class="contact-details">
            <div class="detail-item">
                <label>Специализация:</label>
                <p>${contact.specialization}</p>
            </div>
            
            <div class="detail-item">
                <label>Надежность:</label>
                <div class="reliability-display">
                    <div class="reliability-bar">
                        <div class="reliability-fill" style="
                            width: ${contact.reliability * 100}%;
                            background: ${contact.reliability >= 0.8 ? '#2ecc71' : contact.reliability >= 0.6 ? '#f39c12' : '#e74c3c'};
                        "></div>
                    </div>
                    <span>${Math.round(contact.reliability * 100)}%</span>
                </div>
            </div>
            
            ${contact.lastContact ? `
                <div class="detail-item">
                    <label>Последний контакт:</label>
                    <p>${new Date(contact.lastContact).toLocaleString()}</p>
                </div>
            ` : ''}
            
            <div class="contact-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Информация от этого источника может быть неточной. Проверяйте все данные.</p>
            </div>
        </div>
        
        <div class="contact-actions">
            <button class="btn btn-primary" onclick="useUnderworldContact('${contact.id}')">
                <i class="fas fa-phone"></i> Связаться
            </button>
            <button class="btn btn-secondary" onclick="shareContactInfo('${contact.id}')">
                <i class="fas fa-share"></i> Поделиться
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Использование криминального контакта
 */
function useUnderworldContact(contactId) {
    const contact = PrivateEyeState.criminalContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (contact.status !== 'available') {
        showPrivateEyeNotification(`${contact.name} временно недоступен`, 'warning');
        return;
    }
    
    contactUnderworld();
    
    // Закрываем модальное окно
    const modal = document.getElementById('evidence-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Показать детали досье
 */
function showDossierDetails(index) {
    if (index < 0 || index >= PrivateEyeState.dossiers.length) return;
    
    const dossier = PrivateEyeState.dossiers[index];
    
    const modal = document.getElementById('evidence-modal');
    const modalBody = document.getElementById('evidence-modal-body');
    
    if (!modal || !modalBody) {
        createTempDossierModal(dossier);
        return;
    }
    
    modalBody.innerHTML = `
        <h3>${dossier.name}</h3>
        <div class="dossier-role-badge">${dossier.role}</div>
        
        <div class="dossier-details">
            <div class="detail-item">
                <label>Скрытый мотив:</label>
                <p class="dossier-motive">${dossier.hiddenMotive}</p>
            </div>
            
            ${dossier.additionalInfo ? `
                <div class="detail-item">
                    <label>Дополнительная информация:</label>
                    <p>${dossier.additionalInfo}</p>
                </div>
            ` : ''}
            
            ${dossier.evidence && dossier.evidence.length > 0 ? `
                <div class="detail-item">
                    <label>Собранные улики:</label>
                    <ul>
                        ${dossier.evidence.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
        
        <div class="dossier-actions">
            <button class="btn btn-primary" onclick="investigatePerson(${index})">
                <i class="fas fa-search"></i> Исследовать дальше
            </button>
            <button class="btn btn-secondary" onclick="shareDossier(${index})">
                <i class="fas fa-share"></i> Поделиться (селективно)
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Исследовать человека
 */
function investigatePerson(index) {
    const ability = PrivateEyeState.abilities.hidden_motive;
    if (!checkPrivateEyeAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updatePrivateEyeAbilityCooldown('hidden_motive');
    
    const dossier = PrivateEyeState.dossiers[index];
    if (!dossier) return;
    
    showPrivateEyeNotification(`Исследование ${dossier.name}...`, 'info');
    
    // Имитация исследования
    setTimeout(() => {
        const newInfo = getAdditionalInvestigationInfo(dossier.name);
        
        // Обновляем досье
        if (!dossier.additionalInfo) {
            dossier.additionalInfo = newInfo;
        } else {
            dossier.additionalInfo += `\n${newInfo}`;
        }
        
        // Добавляем в журнал
        addSurveillanceLog({
            subject: dossier.name,
            action: `Углубленное исследование: ${newInfo}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            important: true
        });
        
        // Обновляем отображение
        updateDossiers();
        
        showPrivateEyeNotification(`Получена дополнительная информация о ${dossier.name}`, 'success');
        
    }, 2000);
}

/**
 * Получить дополнительную информацию
 */
function getAdditionalInvestigationInfo(personName) {
    const infoMap = {
        'Доктор Артур Вэнс': 'Имеет счет в швейцарском банке, открытый 3 месяца назад',
        'Миллисент Фэрчайлд': 'Продала фамильные драгоценности через аукцион в прошлом месяце',
        'Виктор Кроули': 'Встречался с представителем частной охранной компании накануне кражи',
        'Изабелла Росси': 'Имела доступ к планам системы безопасности музея',
        'default': 'Обнаружены дополнительные финансовые операции'
    };
    
    return infoMap[personName] || infoMap.default;
}

/**
 * Поделиться информацией из досье
 */
function shareDossier(index) {
    if (index < 0 || index >= PrivateEyeState.dossiers.length) return;
    
    const dossier = PrivateEyeState.dossiers[index];
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Досье ЧД] ${dossier.name} (${dossier.role}): ${dossier.hiddenMotive.substring(0, 80)}...`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showPrivateEyeNotification('Ошибка отправки информации', 'error');
            } else {
                showPrivateEyeNotification('Информация из досье отправлена в чат', 'success');
            }
        });
    }
}

/**
 * Поделиться информацией о клиенте
 */
function shareClientInfo() {
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = '[ЧД] Получено задание от анонимного клиента. Расследую финансовые аспекты дела.';
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (!error) {
                showPrivateEyeNotification('Общая информация о задании отправлена', 'success');
            }
        });
    }
}

/**
 * Поделиться информацией о контакте
 */
function shareContactInfo(contactId) {
    const contact = PrivateEyeState.criminalContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Контакт ЧД] ${contact.name}: ${contact.specialization}`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (!error) {
                showPrivateEyeNotification('Информация о контакте отправлена', 'success');
            }
        });
    }
}

/**
 * Получить случайный доступный контакт
 */
function getRandomAvailableContact() {
    const availableContacts = PrivateEyeState.criminalContacts.filter(c => c.status === 'available');
    if (availableContacts.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableContacts.length);
    return availableContacts[randomIndex];
}

/**
 * Получить информацию из криминального мира
 */
function getUnderworldInformation(contact) {
    const infoMap = {
        'Тень': 'Ваза была предложена на черном рынке за 2 дня до кражи. Покупатель из Азии.',
        'Молчун': 'Доктор Вэнс должен крупную сумму букмекерам. Срок выплаты истек на прошлой неделе.',
        'Сова': 'Видела встречу Фэрчайлд с неизвестным в ночном клубе. Обсуждали "срочную продажу".',
        'default': 'Информация требует проверки. Источник ненадежен.'
    };
    
    return infoMap[contact.name] || infoMap.default;
}

/**
 * Получить иконку для скрытого действия
 */
function getCovertActionIcon(abilityId) {
    const icons = {
        'surveillance': 'binoculars',
        'underworld_contact': 'phone',
        'hidden_motive': 'brain'
    };
    
    return icons[abilityId] || 'question';
}

/**
 * Получить уровень риска
 */
function getRiskLevel(target) {
    if (target.role === 'Куратор музея') return 'high';
    if (target.role === 'Охранник') return 'medium';
    return 'low';
}

/**
 * Получить текст риска
 */
function getRiskText(target) {
    const riskLevel = getRiskLevel(target);
    
    const texts = {
        'high': 'Высокий риск',
        'medium': 'Средний риск',
        'low': 'Низкий риск'
    };
    
    return texts[riskLevel] || 'Неизвестно';
}

/**
 * Создать временное модальное окно для контакта
 */
function createTempContactModal(contact) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            border: 2px solid #f39c12;
        ">
            <div class="modal-header">
                <h3 style="margin: 0; color: #f39c12;">${contact.name}</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Специализация: ${contact.specialization}</p>
                <p>Надежность: ${Math.round(contact.reliability * 100)}%</p>
                <button class="btn btn-primary" onclick="useUnderworldContact('${contact.id}'); this.closest('.modal').remove()">
                    <i class="fas fa-phone"></i> Связаться
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Создать временное модальное окно для досье
 */
function createTempDossierModal(dossier) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            border: 2px solid #f39c12;
        ">
            <div class="modal-header">
                <h3 style="margin: 0; color: #f39c12;">${dossier.name}</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Роль: ${dossier.role}</p>
                <p>Мотив: ${dossier.hiddenMotive}</p>
                <button class="btn btn-primary" onclick="investigatePerson(${PrivateEyeState.dossiers.findIndex(d => d.name === dossier.name)}); this.closest('.modal').remove()">
                    <i class="fas fa-search"></i> Исследовать
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Проверка кд способности
 */
function checkPrivateEyeAbilityCooldown(ability) {
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    if (ability.lastUsed > 0 && timeSinceLastUse < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        showPrivateEyeNotification(`Способность на перезарядке. Осталось: ${remainingTime}с`, 'warning');
        return false;
    }
    
    return true;
}

/**
 * Обновление кд способностей
 */
function updatePrivateEyeAbilityCooldowns() {
    // Проверяем кд каждую секунду
    setInterval(() => {
        Object.entries(PrivateEyeState.abilities).forEach(([abilityId, ability]) => {
            updatePrivateEyeAbilityCooldown(abilityId);
        });
    }, 1000);
}

/**
 * Обновление отображения кд для конкретной способности
 */
function updatePrivateEyeAbilityCooldown(abilityId) {
    const ability = PrivateEyeState.abilities[abilityId];
    if (!ability || ability.cooldown === 0) return;
    
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    const cooldownElement = document.getElementById(`cooldown-${abilityId}`);
    if (!cooldownElement) return;
    
    const buttonElement = document.getElementById(`covert-${abilityId}`);
    
    if (ability.lastUsed > 0 && timeSinceLastUse < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        cooldownElement.textContent = `${remainingTime}с`;
        
        if (buttonElement) {
            buttonElement.style.opacity = '0.6';
            buttonElement.style.cursor = 'not-allowed';
        }
    } else {
        cooldownElement.textContent = 'Готово';
        
        if (buttonElement) {
            buttonElement.style.opacity = '1';
            buttonElement.style.cursor = 'pointer';
        }
    }
}

/**
 * Показать уведомление
 */
function showPrivateEyeNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(`[Частный детектив] ${message}`, type);
    } else {
        console.log(`[Частный детектив ${type}]: ${message}`);
    }
}

/**
 * Задержка выполнения функции
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

// Добавляем стили для интерфейса частного детектива
const privateEyeStyles = document.createElement('style');
privateEyeStyles.textContent = `
    .private-eye-interface {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
    }
    
    .client-section, .dossiers-section, .covert-section, .surveillance-section, .contacts-section {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        padding: 15px;
        border: 2px solid rgba(243, 156, 18, 0.3);
    }
    
    .client-brief-content {
        background: rgba(243, 156, 18, 0.1);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(243, 156, 18, 0.5);
    }
    
    .brief-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .brief-title {
        font-weight: 600;
        color: #f39c12;
        font-size: 1.1rem;
    }
    
    .brief-priority {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
    }
    
    .brief-body {
        margin-bottom: 15px;
    }
    
    .brief-objective, .brief-secret, .brief-notes {
        margin-bottom: 15px;
    }
    
    .brief-objective h4, .brief-secret h4, .brief-notes h4 {
        color: #f39c12;
        margin: 0 0 8px 0;
        font-size: 0.9rem;
    }
    
    .secret-text {
        color: #e74c3c;
        font-weight: 600;
        background: rgba(231, 76, 60, 0.1);
        padding: 10px;
        border-radius: 6px;
        border-left: 3px solid #e74c3c;
    }
    
    .brief-notes ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
        color: #95a5a6;
        font-size: 0.9rem;
    }
    
    .brief-notes li {
        margin-bottom: 5px;
    }
    
    .brief-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .brief-reward {
        color: #2ecc71;
        font-size: 0.9rem;
    }
    
    .dossier-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
    }
    
    .dossier-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        border: 1px solid rgba(243, 156, 18, 0.3);
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .dossier-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }
    
    .dossier-photo {
        width: 50px;
        height: 50px;
        background: rgba(243, 156, 18, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 10px auto;
        color: #f39c12;
        font-size: 1.2rem;
    }
    
    .dossier-name {
        font-weight: 600;
        color: white;
        margin-bottom: 5px;
        font-size: 0.9rem;
    }
    
    .dossier-role {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 10px;
    }
    
    .dossier-motives {
        font-size: 0.8rem;
        color: #f39c12;
        margin-bottom: 10px;
        line-height: 1.3;
    }
    
    .dossier-actions {
        display: flex;
        gap: 5px;
        justify-content: center;
    }
    
    .no-dossiers {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
        grid-column: 1 / -1;
    }
    
    .no-dossiers i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
        display: block;
    }
    
    .covert-actions {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
    }
    
    .covert-action {
        flex: 1;
        min-width: 150px;
        background: rgba(243, 156, 18, 0.1);
        border: 2px solid rgba(243, 156, 18, 0.5);
        border-radius: 8px;
        padding: 15px;
        color: white;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .covert-action:hover {
        background: rgba(243, 156, 18, 0.2);
        transform: translateY(-2px);
    }
    
    .covert-action i {
        font-size: 1.5rem;
        color: #f39c12;
        margin-bottom: 10px;
    }
    
    .action-name {
        font-weight: 600;
        margin-bottom: 5px;
        color: white;
    }
    
    .action-description {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 10px;
        line-height: 1.3;
    }
    
    .cooldown {
        font-size: 0.8rem;
        color: #2ecc71;
        font-weight: 600;
    }
    
    .surveillance-log {
        height: 150px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 10px;
        overflow-y: auto;
        margin-bottom: 10px;
        border: 1px solid rgba(243, 156, 18, 0.3);
    }
    
    .log-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
    }
    
    .log-placeholder i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
    }
    
    .log-entry {
        display: flex;
        align-items: center;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 5px;
    }
    
    .log-time {
        font-size: 0.7rem;
        color: #7f8c8d;
        width: 50px;
        flex-shrink: 0;
    }
    
    .log-content {
        flex: 1;
        font-size: 0.85rem;
        color: white;
    }
    
    .log-subject {
        color: #f39c12;
        font-weight: 600;
        margin-right: 5px;
    }
    
    .log-importance {
        font-size: 0.7rem;
        color: #e74c3c;
        font-weight: 600;
    }
    
    .log-importance.important {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
    
    .surveillance-controls {
        display: flex;
        gap: 10px;
    }
    
    .underworld-contacts {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .underworld-contact {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(243, 156, 18, 0.3);
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    
    .underworld-contact:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .underworld-contact.available {
        border-color: rgba(46, 204, 113, 0.5);
    }
    
    .contact-avatar {
        width: 40px;
        height: 40px;
        background: rgba(243, 156, 18, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f39c12;
    }
    
    .contact-info {
        flex: 1;
    }
    
    .contact-name {
        font-weight: 600;
        color: white;
        font-size: 0.9rem;
        margin-bottom: 2px;
    }
    
    .contact-specialization {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 5px;
    }
    
    .contact-reliability {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .reliability-bar {
        width: 60px;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .reliability-fill {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .contact-reliability span {
        font-size: 0.7rem;
        color: #7f8c8d;
    }
    
    .contacts-placeholder {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
    }
    
    .contacts-placeholder i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
        display: block;
    }
    
    .contacts-controls {
        margin-top: 10px;
    }
    
    .surveillance-targets {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .target-option {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .target-option:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(5px);
    }
    
    .target-avatar {
        width: 40px;
        height: 40px;
        background: rgba(243, 156, 18, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f39c12;
    }
    
    .target-info {
        flex: 1;
    }
    
    .target-name {
        font-weight: 600;
        color: white;
        font-size: 0.9rem;
    }
    
    .target-role {
        font-size: 0.8rem;
        color: #95a5a6;
    }
    
    .risk-level {
        font-size: 0.7rem;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: 600;
    }
    
    .risk-level.high {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
    }
    
    .risk-level.medium {
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
    }
    
    .risk-level.low {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
    }
    
    .dossier-role-badge {
        display: inline-block;
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.9rem;
        margin-bottom: 15px;
    }
    
    .dossier-motive {
        background: rgba(243, 156, 18, 0.1);
        padding: 10px;
        border-radius: 6px;
        border-left: 3px solid #f39c12;
        color: white;
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    .dossier-details ul {
        margin: 10px 0 0 20px;
        padding: 0;
        color: white;
        font-size: 0.9rem;
    }
    
    .dossier-details li {
        margin-bottom: 5px;
    }
    
    .reliability-display {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .contact-type {
        font-size: 0.9rem;
        color: #f39c12;
        margin-bottom: 15px;
        font-weight: 600;
    }
    
    .contact-warning {
        background: rgba(231, 76, 60, 0.1);
        border: 1px solid rgba(231, 76, 60, 0.3);
        border-radius: 6px;
        padding: 10px;
        margin-top: 15px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .contact-warning i {
        color: #e74c3c;
        flex-shrink: 0;
    }
    
    .contact-warning p {
        margin: 0;
        color: #e74c3c;
        font-size: 0.85rem;
        line-height: 1.3;
    }
`;
document.head.appendChild(privateEyeStyles);

// Экспортируем функции для использования в HTML
window.initPrivateEyeInterface = initPrivateEyeInterface;
window.startSurveillanceOnTarget = startSurveillanceOnTarget;
window.useUnderworldContact = useUnderworldContact;
window.investigatePerson = investigatePerson;
window.shareDossier = shareDossier;
window.shareClientInfo = shareClientInfo;
window.shareContactInfo = shareContactInfo;
window.selectUnderworldContact = selectUnderworldContact;
window.investigateHiddenMotives = investigateHiddenMotives;
window.contactUnderworld = contactUnderworld;
window.startNewSurveillance = startNewSurveillance;
window.reviewSurveillanceLog = reviewSurveillanceLog;