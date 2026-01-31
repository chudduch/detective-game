/**
 * Investigator Interface - интерфейс для роли Следователя
 */

// Состояние интерфейса следователя
const InvestigatorState = {
    documents: [],
    databaseRecords: [],
    activeRequests: [],
    cooldowns: {},
    
    // Способности
    abilities: {
        official_request: {
            name: "Официальный запрос",
            description: "Запросить информацию из полицейской базы данных",
            cooldown: 300, // 5 минут
            lastUsed: 0
        },
        warrant: {
            name: "Ордер на обыск",
            description: "Получить дополнительную информацию о подозреваемом",
            cooldown: 600, // 10 минут
            lastUsed: 0
        },
        access_all_clues: {
            name: "Доступ ко всем уликам",
            description: "Просмотреть все улики, найденные командой",
            cooldown: 0,
            lastUsed: 0
        }
    }
};

/**
 * Инициализация интерфейса следователя
 */
function initInvestigatorInterface(playerData) {
    console.log('Инициализация интерфейса Следователя:', playerData);
    
    // Обновляем состояние
    updateInvestigatorState(playerData);
    
    // Создаем интерфейс
    createInvestigatorInterface();
    
    // Загружаем начальные данные
    loadInitialData();
    
    // Настраиваем обработчики событий
    setupInvestigatorEventHandlers();
    
    // Обновляем кд способностей
    updateAbilityCooldowns();
}

/**
 * Обновление состояния следователя
 */
function updateInvestigatorState(playerData) {
    // Сохраняем специальную информацию
    if (playerData.specialInfo) {
        InvestigatorState.documents = playerData.specialInfo.officialDocuments || [];
        InvestigatorState.databaseAccess = playerData.specialInfo.databaseAccess;
    }
    
    // Инициализируем способности
    if (playerData.roleInfo && playerData.roleInfo.abilities) {
        playerData.roleInfo.abilities.forEach(ability => {
            if (InvestigatorState.abilities[ability.id]) {
                InvestigatorState.abilities[ability.id].description = ability.description;
                InvestigatorState.abilities[ability.id].cooldown = ability.cooldown || 0;
            }
        });
    }
}

/**
 * Создание интерфейса следователя
 */
function createInvestigatorInterface() {
    const interfaceContainer = document.getElementById('role-specific-interface');
    if (!interfaceContainer) return;
    
    interfaceContainer.innerHTML = '';
    interfaceContainer.className = 'investigator-interface';
    
    // Основная структура интерфейса
    interfaceContainer.innerHTML = `
        <div class="role-interface">
            <!-- Панель документов -->
            <div class="role-section documents-section">
                <h3><i class="fas fa-file-alt"></i> Официальные документы</h3>
                <div class="documents-panel" id="investigator-documents">
                    <!-- Документы будут загружены динамически -->
                </div>
            </div>
            
            <!-- Панель базы данных -->
            <div class="role-section database-section">
                <h3><i class="fas fa-database"></i> База данных полиции</h3>
                <div class="database-search">
                    <div class="search-bar">
                        <input type="text" id="database-search-input" 
                               placeholder="Поиск по имени, делу или номеру...">
                        <button class="btn btn-primary" id="database-search-btn">
                            <i class="fas fa-search"></i> Поиск
                        </button>
                    </div>
                    <div class="search-results" id="database-results">
                        <!-- Результаты поиска -->
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <p>Введите запрос для поиска в базе данных</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Панель официальных запросов -->
            <div class="role-section requests-section">
                <h3><i class="fas fa-paper-plane"></i> Официальные запросы</h3>
                <div class="request-panel" id="request-panel">
                    <!-- Кнопки запросов будут созданы динамически -->
                </div>
            </div>
            
            <!-- Панель всех улик -->
            <div class="role-section all-clues-section">
                <h3><i class="fas fa-clipboard-list"></i> Все найденные улики</h3>
                <div class="all-clues-panel" id="all-clues-panel">
                    <!-- Все улики команды -->
                    <div class="loading-clues">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Загрузка информации об уликах...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем компоненты
    initializeDocumentsPanel();
    initializeDatabasePanel();
    initializeRequestsPanel();
    initializeAllCluesPanel();
}

/**
 * Инициализация панели документов
 */
function initializeDocumentsPanel() {
    const documentsPanel = document.getElementById('investigator-documents');
    if (!documentsPanel || !InvestigatorState.documents.length) return;
    
    documentsPanel.innerHTML = '';
    
    InvestigatorState.documents.forEach((doc, index) => {
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.dataset.docId = `doc_${index}`;
        
        docCard.innerHTML = `
            <div class="document-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="document-title">Документ #${index + 1}</div>
            <div class="document-description">${doc}</div>
            <div class="document-meta">
                <span class="document-date">Сегодня</span>
                <span class="document-type">Официальный</span>
            </div>
        `;
        
        // Обработчик клика для просмотра документа
        docCard.addEventListener('click', () => {
            viewDocument(doc, `Документ #${index + 1}`);
        });
        
        documentsPanel.appendChild(docCard);
    });
}

/**
 * Инициализация панели базы данных
 */
function initializeDatabasePanel() {
    const searchInput = document.getElementById('database-search-input');
    const searchBtn = document.getElementById('database-search-btn');
    const resultsContainer = document.getElementById('database-results');
    
    if (!searchInput || !searchBtn || !resultsContainer) return;
    
    // Обработчик поиска
    searchBtn.addEventListener('click', performDatabaseSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performDatabaseSearch();
        }
    });
    
    // Предварительная загрузка примеров записей
    loadSampleDatabaseRecords();
}

/**
 * Инициализация панели запросов
 */
function initializeRequestsPanel() {
    const requestPanel = document.getElementById('request-panel');
    if (!requestPanel) return;
    
    requestPanel.innerHTML = '';
    
    // Создаем кнопки для каждой способности
    Object.entries(InvestigatorState.abilities).forEach(([abilityId, ability]) => {
        if (ability.cooldown > 0) { // Показываем только способности с кд
            const requestButton = document.createElement('button');
            requestButton.className = 'request-button';
            requestButton.dataset.abilityId = abilityId;
            requestButton.id = `request-${abilityId}`;
            
            requestButton.innerHTML = `
                <i class="fas fa-${getAbilityIcon(abilityId)}"></i>
                <div class="action-name">${ability.name}</div>
                <div class="action-description">${ability.description}</div>
                <div class="cooldown" id="cooldown-${abilityId}">Доступно</div>
            `;
            
            // Обработчик клика
            requestButton.addEventListener('click', () => {
                useAbility(abilityId);
            });
            
            requestPanel.appendChild(requestButton);
        }
    });
}

/**
 * Инициализация панели всех улик
 */
function initializeAllCluesPanel() {
    const allCluesPanel = document.getElementById('all-clues-panel');
    if (!allCluesPanel) return;
    
    // Запрос всех улик у сервера
    requestAllClues();
}

/**
 * Загрузка начальных данных
 */
function loadInitialData() {
    // Загружаем примеры записей из базы данных
    setTimeout(() => {
        loadSampleDatabaseRecords();
    }, 1000);
    
    // Загружаем все улики
    setTimeout(() => {
        requestAllClues();
    }, 1500);
}

/**
 * Настройка обработчиков событий
 */
function setupInvestigatorEventHandlers() {
    // Обработчики уже настроены в функциях инициализации
}

/**
 * Просмотр документа
 */
function viewDocument(content, title) {
    const modal = document.getElementById('evidence-modal');
    const modalBody = document.getElementById('evidence-modal-body');
    
    if (!modal || !modalBody) {
        // Создаем временное модальное окно
        createTempModal(content, title);
        return;
    }
    
    modalBody.innerHTML = `
        <h3>${title}</h3>
        <div class="document-content">
            <pre>${content}</pre>
        </div>
        <div class="document-actions">
            <button class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> Закрыть
            </button>
            <button class="btn btn-primary" onclick="shareDocument('${escapeHtml(content.substring(0, 100))}...')">
                <i class="fas fa-share"></i> Поделиться в чате
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Создание временного модального окна
 */
function createTempModal(content, title) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
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
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
        ">
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            ">
                <h3 style="margin: 0;">${title}</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                ">&times;</button>
            </div>
            <div class="modal-body">
                <pre style="
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: 'Courier New', monospace;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 15px;
                    border-radius: 6px;
                    max-height: 50vh;
                    overflow-y: auto;
                ">${content}</pre>
            </div>
            <div class="modal-footer" style="
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            ">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Закрыть
                </button>
                <button class="btn btn-primary" onclick="shareDocument('${escapeHtml(content.substring(0, 100))}...')">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Поиск в базе данных
 */
function performDatabaseSearch() {
    const searchInput = document.getElementById('database-search-input');
    const resultsContainer = document.getElementById('database-results');
    
    if (!searchInput || !resultsContainer) return;
    
    const query = searchInput.value.trim();
    
    if (!query) {
        showInvestigatorNotification('Введите поисковый запрос', 'warning');
        return;
    }
    
    // Показываем загрузку
    resultsContainer.innerHTML = `
        <div class="searching">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Поиск в базе данных...</p>
        </div>
    `;
    
    // Имитация поиска (в реальном приложении - запрос к серверу)
    setTimeout(() => {
        const searchResults = simulateDatabaseSearch(query);
        displaySearchResults(searchResults);
    }, 1000);
}

/**
 * Имитация поиска в базе данных
 */
function simulateDatabaseSearch(query) {
    // Примерные данные базы данных
    const sampleRecords = [
        {
            id: 'rec_001',
            name: 'Доктор Артур Вэнс',
            type: 'Подозреваемый',
            info: 'Сотрудник музея. Имеет доступ ко всем залам. Проверялся по делу о пропаже экспонатов в 2020 году, но был оправдан.',
            relevance: 0.95
        },
        {
            id: 'rec_002',
            name: 'Миллисент Фэрчайлд',
            type: 'Свидетель',
            info: 'Член попечительского совета. Известный благотворитель. Не имеет судимостей.',
            relevance: 0.85
        },
        {
            id: 'rec_003',
            name: 'Виктор Кроули',
            type: 'Подозреваемый',
            info: 'Охранник музея. Бывший военный. Имеет разрешение на ношение оружия. Ранее привлекался за мелкое хулиганство (2018).',
            relevance: 0.75
        },
        {
            id: 'rec_004',
            name: 'Дело #2023-045',
            type: 'Похожее дело',
            info: 'Кража картины из галереи "Современное искусство" (январь 2023). Преступление не раскрыто. Похожий почерк.',
            relevance: 0.65
        },
        {
            id: 'rec_005',
            name: 'Изабелла Росси',
            type: 'Свидетель',
            info: 'Арт-дилер из Милана. Частый гость на аукционах. Проверка не выявила нарушений.',
            relevance: 0.55
        }
    ];
    
    // Фильтруем по запросу
    const queryLower = query.toLowerCase();
    return sampleRecords.filter(record => {
        return record.name.toLowerCase().includes(queryLower) ||
               record.type.toLowerCase().includes(queryLower) ||
               record.info.toLowerCase().includes(queryLower);
    });
}

/**
 * Отображение результатов поиска
 */
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('database-results');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>По вашему запросу ничего не найдено</p>
                <p class="hint">Попробуйте изменить поисковый запрос</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    results.forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'database-record';
        recordElement.dataset.recordId = record.id;
        
        // Цветовая индикация релевантности
        let relevanceColor = '#e74c3c'; // Низкая
        if (record.relevance >= 0.8) relevanceColor = '#2ecc71'; // Высокая
        else if (record.relevance >= 0.6) relevanceColor = '#f39c12'; // Средняя
        
        recordElement.innerHTML = `
            <div class="record-header">
                <div class="record-name">${record.name}</div>
                <div class="record-type">${record.type}</div>
            </div>
            <div class="record-info">${record.info}</div>
            <div class="record-footer">
                <div class="record-relevance">
                    <div class="relevance-bar">
                        <div class="relevance-fill" style="
                            width: ${record.relevance * 100}%;
                            background: ${relevanceColor};
                        "></div>
                    </div>
                    <span class="relevance-text">Релевантность: ${Math.round(record.relevance * 100)}%</span>
                </div>
                <button class="btn btn-small btn-secondary record-action"
                        onclick="shareRecordInfo('${escapeHtml(record.name)}', '${escapeHtml(record.info)}')">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
        `;
        
        resultsContainer.appendChild(recordElement);
    });
}

/**
 * Загрузка примеров записей базы данных
 */
function loadSampleDatabaseRecords() {
    const resultsContainer = document.getElementById('database-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="database-hint">
            <p><strong>Примеры запросов для поиска:</strong></p>
            <ul>
                <li>Артур Вэнс</li>
                <li>Подозреваемый</li>
                <li>Кража музея</li>
                <li>Охранник</li>
            </ul>
            <p class="hint"><i class="fas fa-lightbulb"></i> Используйте точные имена или ключевые слова</p>
        </div>
    `;
}

/**
 * Использование способности
 */
function useAbility(abilityId) {
    const ability = InvestigatorState.abilities[abilityId];
    if (!ability) return;
    
    // Проверка кд
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    if (timeSinceLastUse < cooldownMs && ability.lastUsed > 0) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        showInvestigatorNotification(`Способность на перезарядке. Осталось: ${remainingTime}с`, 'warning');
        return;
    }
    
    // Используем способность
    ability.lastUsed = now;
    InvestigatorState.cooldowns[abilityId] = now;
    
    // Обновляем отображение кд
    updateAbilityCooldown(abilityId);
    
    // Выполняем действие в зависимости от способности
    switch (abilityId) {
        case 'official_request':
            performOfficialRequest();
            break;
            
        case 'warrant':
            performWarrantRequest();
            break;
            
        case 'access_all_clues':
            accessAllClues();
            break;
    }
    
    showInvestigatorNotification(`Способность "${ability.name}" использована`, 'success');
}

/**
 * Выполнение официального запроса
 */
function performOfficialRequest() {
    // Пример запроса
    const requests = [
        "Запрос финансовых операций подозреваемых за последний месяц",
        "Проверка криминального прошлого всех участников",
        "Запрос логов доступа к системе безопасности музея",
        "Проверка страховых полисов на украденные предметы"
    ];
    
    const randomRequest = requests[Math.floor(Math.random() * requests.length)];
    
    // Добавляем в документы
    InvestigatorState.documents.push(randomRequest);
    
    // Обновляем панель документов
    initializeDocumentsPanel();
    
    // Показываем уведомление
    showInvestigatorNotification(`Официальный запрос отправлен: "${randomRequest}"`, 'info');
    
    // Автоматически ищем в базе данных
    setTimeout(() => {
        const searchInput = document.getElementById('database-search-input');
        if (searchInput) {
            searchInput.value = randomRequest.split(' ').slice(-2).join(' ');
            performDatabaseSearch();
        }
    }, 2000);
}

/**
 * Выполнение запроса на ордер
 */
function performWarrantRequest() {
    const suspects = ['Доктор Артур Вэнс', 'Виктор Кроули', 'Миллисент Фэрчайлд', 'Изабелла Росси'];
    const randomSuspect = suspects[Math.floor(Math.random() * suspects.length)];
    
    // Создаем документ с ордером
    const warrantDoc = `
ОРДЕР НА ОБЫСК №${Math.floor(Math.random() * 1000) + 100}

На основании подозрений в причастности к делу о пропаже вазы династии Мин,
санкционирован обыск имущества и места жительства:

ПОДОЗРЕВАЕМЫЙ: ${randomSuspect}

ОСНОВАНИЕ: Наличие косвенных улик и мотива

РАЗРЕШЕНО:
1. Обыск личных вещей и электронных устройств
2. Проверка финансовых документов
3. Изъятие потенциальных улик

СРОК ДЕЙСТВИЯ: 24 часа с момента выдачи

ВЫДАЛ: Отдел расследований
ДАТА: ${new Date().toLocaleDateString()}
`;
    
    // Добавляем в документы
    InvestigatorState.documents.push(warrantDoc);
    
    // Обновляем панель документов
    initializeDocumentsPanel();
    
    // Показываем уведомление
    showInvestigatorNotification(`Ордер на обыск выдан для: ${randomSuspect}`, 'info');
    
    // Автоматически открываем документ
    setTimeout(() => {
        viewDocument(warrantDoc, `Ордер на обыск - ${randomSuspect}`);
    }, 1000);
}

/**
 * Доступ ко всем уликам
 */
function accessAllClues() {
    // Эта способность всегда активна, просто обновляем панель
    requestAllClues();
    showInvestigatorNotification('Получен доступ ко всем уликам команды', 'info');
}

/**
 * Запрос всех улик у сервера
 */
function requestAllClues() {
    const allCluesPanel = document.getElementById('all-clues-panel');
    if (!allCluesPanel) return;
    
    // Показываем загрузку
    allCluesPanel.innerHTML = `
        <div class="loading-clues">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Запрос информации об уликах...</p>
        </div>
    `;
    
    // Имитация запроса к серверу (в реальном приложении - Socket.IO)
    setTimeout(() => {
        // Примерные данные всех улик (в реальном приложении это придет с сервера)
        const allClues = [
            { id: 'clue1', name: 'Отпечатки на витрине', type: 'physical', foundBy: 'Все' },
            { id: 'clue2', name: 'Страховой полис', type: 'document', foundBy: 'Следователь' },
            { id: 'clue3', name: 'Записи камер наблюдения', type: 'digital', foundBy: 'Следователь, Криминалист' },
            { id: 'clue4', name: 'Обрывок ткани', type: 'physical', foundBy: 'Криминалист' },
            { id: 'clue5', name: 'Тайное письмо', type: 'document', foundBy: 'Частный детектив' },
            { id: 'clue6', name: 'Слухи среди персонала', type: 'witness', foundBy: 'Журналист' },
            { id: 'clue7', name: 'Химический состав пыли', type: 'physical', foundBy: 'Криминалист' },
            { id: 'clue8', name: 'Записи телефонных разговоров', type: 'digital', foundBy: 'Следователь' }
        ];
        
        displayAllClues(allClues);
    }, 1500);
}

/**
 * Отображение всех улик
 */
function displayAllClues(clues) {
    const allCluesPanel = document.getElementById('all-clues-panel');
    if (!allCluesPanel) return;
    
    if (!clues || clues.length === 0) {
        allCluesPanel.innerHTML = `
            <div class="no-clues">
                <i class="fas fa-search"></i>
                <p>Командой еще не найдено улик</p>
            </div>
        `;
        return;
    }
    
    allCluesPanel.innerHTML = '';
    
    // Группируем улики по типу
    const cluesByType = {};
    clues.forEach(clue => {
        if (!cluesByType[clue.type]) {
            cluesByType[clue.type] = [];
        }
        cluesByType[clue.type].push(clue);
    });
    
    // Создаем аккордеон для каждого типа
    Object.entries(cluesByType).forEach(([type, typeClues]) => {
        const typeSection = document.createElement('div');
        typeSection.className = 'clue-type-section';
        
        typeSection.innerHTML = `
            <div class="type-header">
                <h4>
                    <i class="fas fa-${getClueTypeIcon(type)}"></i>
                    ${getClueTypeName(type)} (${typeClues.length})
                    <i class="fas fa-chevron-down"></i>
                </h4>
            </div>
            <div class="type-clues" style="display: none;">
                <!-- Улики этого типа -->
            </div>
        `;
        
        // Обработчик разворачивания/сворачивания
        const typeHeader = typeSection.querySelector('.type-header');
        const typeCluesContainer = typeSection.querySelector('.type-clues');
        
        typeHeader.addEventListener('click', () => {
            const isHidden = typeCluesContainer.style.display === 'none';
            typeCluesContainer.style.display = isHidden ? 'block' : 'none';
            const icon = typeHeader.querySelector('.fa-chevron-down');
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
        
        // Добавляем улики
        typeClues.forEach(clue => {
            const clueElement = document.createElement('div');
            clueElement.className = 'team-clue-item';
            clueElement.innerHTML = `
                <div class="clue-name">${clue.name}</div>
                <div class="clue-found-by">
                    <i class="fas fa-user"></i>
                    Найдено: ${clue.foundBy}
                </div>
            `;
            typeCluesContainer.appendChild(clueElement);
        });
        
        allCluesPanel.appendChild(typeSection);
    });
}

/**
 * Обновление кд способностей
 */
function updateAbilityCooldowns() {
    Object.keys(InvestigatorState.abilities).forEach(abilityId => {
        updateAbilityCooldown(abilityId);
    });
    
    // Проверяем кд каждую секунду
    setInterval(() => {
        Object.keys(InvestigatorState.abilities).forEach(abilityId => {
            updateAbilityCooldown(abilityId);
        });
    }, 1000);
}

/**
 * Обновление отображения кд для конкретной способности
 */
function updateAbilityCooldown(abilityId) {
    const ability = InvestigatorState.abilities[abilityId];
    if (!ability || ability.cooldown === 0) return;
    
    const cooldownElement = document.getElementById(`cooldown-${abilityId}`);
    const buttonElement = document.getElementById(`request-${abilityId}`);
    
    if (!cooldownElement || !buttonElement) return;
    
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    if (ability.lastUsed === 0 || timeSinceLastUse >= cooldownMs) {
        // Способность доступна
        cooldownElement.textContent = 'Доступно';
        cooldownElement.className = 'cooldown available';
        buttonElement.disabled = false;
    } else {
        // Способность на кд
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        cooldownElement.textContent = `${remainingSeconds}с`;
        cooldownElement.className = 'cooldown active';
        buttonElement.disabled = true;
    }
}

/**
 * Показать уведомление для следователя
 */
function showInvestigatorNotification(message, type = 'info') {
    // Используем общую функцию showNotification из game.js
    if (typeof showNotification === 'function') {
        showNotification(`[Следователь] ${message}`, type);
    } else {
        // Запасной вариант
        console.log(`[Следователь ${type}]: ${message}`);
        alert(`[Следователь] ${message}`);
    }
}

/**
 * Поделиться информацией в чате
 */
function shareDocument(contentPreview) {
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Документ следователя] ${contentPreview}`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showInvestigatorNotification('Ошибка отправки сообщения', 'error');
            } else {
                showInvestigatorNotification('Информация отправлена в чат', 'success');
            }
        });
    }
}

/**
 * Поделиться информацией о записи
 */
function shareRecordInfo(recordName, recordInfo) {
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[База данных] ${recordName}: ${recordInfo.substring(0, 100)}...`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showInvestigatorNotification('Ошибка отправки сообщения', 'error');
            } else {
                showInvestigatorNotification('Информация отправлена в чат', 'success');
            }
        });
    }
}

/**
 * Вспомогательные функции
 */
function getAbilityIcon(abilityId) {
    const icons = {
        official_request: 'paper-plane',
        warrant: 'search',
        access_all_clues: 'clipboard-list'
    };
    return icons[abilityId] || 'question';
}

function getClueTypeIcon(type) {
    const icons = {
        physical: 'fingerprint',
        document: 'file-alt',
        witness: 'user',
        digital: 'laptop',
        location: 'map-marker-alt'
    };
    return icons[type] || 'question';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeModal() {
    const modal = document.getElementById('evidence-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Экспортируем функции для использования в HTML
window.initInvestigatorInterface = initInvestigatorInterface;
window.shareDocument = shareDocument;
window.shareRecordInfo = shareRecordInfo;
window.closeModal = closeModal;

// Добавляем стили для интерфейса следователя
const investigatorStyles = document.createElement('style');
investigatorStyles.textContent = `
    .investigator-interface {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
    }
    
    .documents-panel {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
    }
    
    .document-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(52, 152, 219, 0.3);
    }
    
    .document-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border-color: #3498db;
    }
    
    .document-icon {
        width: 40px;
        height: 40px;
        background: rgba(52, 152, 219, 0.2);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
        color: #3498db;
        font-size: 1.2rem;
    }
    
    .document-title {
        font-weight: 600;
        margin-bottom: 5px;
        color: white;
    }
    
    .document-description {
        font-size: 0.9rem;
        color: #95a5a6;
        margin-bottom: 10px;
        line-height: 1.4;
    }
    
    .document-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #7f8c8d;
    }
    
    .database-search {
        margin-bottom: 20px;
    }
    
    .search-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
    }
    
    .search-bar input {
        flex: 1;
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #95a5a6;
        border-radius: 6px;
        color: white;
        font-size: 1rem;
    }
    
    .search-bar input:focus {
        outline: none;
        border-color: #3498db;
    }
    
    .search-results {
        max-height: 300px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
    }
    
    .no-results, .searching, .database-hint, .loading-clues, .no-clues {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
    }
    
    .no-results i, .searching i, .database-hint i, .loading-clues i, .no-clues i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
    }
    
    .database-hint ul {
        text-align: left;
        margin: 10px 0;
        padding-left: 20px;
    }
    
    .database-hint li {
        margin-bottom: 5px;
        color: #3498db;
    }
    
    .database-record {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        border-left: 3px solid #3498db;
    }
    
    .record-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .record-name {
        font-weight: 600;
        color: #3498db;
    }
    
    .record-type {
        font-size: 0.8rem;
        background: rgba(52, 152, 219, 0.2);
        padding: 3px 8px;
        border-radius: 4px;
    }
    
    .record-info {
        font-size: 0.9rem;
        color: #ecf0f1;
        line-height: 1.4;
        margin-bottom: 10px;
    }
    
    .record-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .record-relevance {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .relevance-bar {
        width: 60px;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .relevance-fill {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .relevance-text {
        font-size: 0.8rem;
        color: #95a5a6;
    }
    
    .request-panel {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
    }
    
    .request-button {
        padding: 15px;
        background: rgba(52, 152, 219, 0.1);
        border: 2px solid #3498db;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
    }
    
    .request-button:hover:not(:disabled) {
        background: rgba(52, 152, 219, 0.2);
        transform: translateY(-2px);
    }
    
    .request-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: #95a5a6;
    }
    
    .request-button i {
        font-size: 1.5rem;
        color: #3498db;
    }
    
    .action-name {
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .action-description {
        font-size: 0.8rem;
        color: #95a5a6;
        line-height: 1.3;
    }
    
    .cooldown {
        font-size: 0.8rem;
        margin-top: 5px;
        padding: 3px 8px;
        border-radius: 4px;
    }
    
    .cooldown.available {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
    }
    
    .cooldown.active {
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
    }
    
    .all-clues-panel {
        max-height: 300px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
    }
    
    .clue-type-section {
        margin-bottom: 10px;
    }
    
    .type-header {
        background: rgba(255, 255, 255, 0.05);
        padding: 10px 15px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: background-color 0.3s ease;
    }
    
    .type-header:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .type-header h4 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1rem;
    }
    
    .type-header .fa-chevron-down {
        transition: transform 0.3s ease;
    }
    
    .type-clues {
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 0 0 6px 6px;
    }
    
    .team-clue-item {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin-bottom: 5px;
        border-left: 2px solid #3498db;
    }
    
    .team-clue-item:last-child {
        margin-bottom: 0;
    }
    
    .clue-name {
        font-weight: 600;
        margin-bottom: 3px;
    }
    
    .clue-found-by {
        font-size: 0.8rem;
        color: #95a5a6;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .document-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        justify-content: flex-end;
    }
    
    .hint {
        font-size: 0.8rem;
        color: #f39c12;
        font-style: italic;
        margin-top: 5px;
    }
`;
document.head.appendChild(investigatorStyles);