/**
 * Journalist Interface - интерфейс для роли Журналиста
 */

// Состояние интерфейса журналиста
const JournalistState = {
    // Блокнот с заметками
    notebook: {
        entries: [],
        currentEntry: null,
        nextId: 1
    },
    
    // Слухи и сплетни
    rumors: [],
    
    // Социальные связи
    socialConnections: [],
    
    // Интервью и контакты
    contacts: [],
    
    // Способности
    abilities: {
        interview_witness: {
            name: "Интервью свидетеля",
            description: "Получить дополнительную информацию от свидетеля",
            cooldown: 180,
            lastUsed: 0
        },
        social_network: {
            name: "Социальные связи",
            description: "Раскрыть скрытые связи между персонажами",
            cooldown: 300,
            lastUsed: 0
        },
        investigate_rumor: {
            name: "Проверка слухов",
            description: "Проверить слух на достоверность",
            cooldown: 240,
            lastUsed: 0
        }
    },
    
    // Карта социальных связей
    networkMap: {
        nodes: [],
        connections: []
    }
};

/**
 * Инициализация интерфейса журналиста
 */
function initJournalistInterface(playerData) {
    console.log('Инициализация интерфейса Журналиста:', playerData);
    
    // Обновляем состояние
    updateJournalistState(playerData);
    
    // Создаем интерфейс
    createJournalistInterface();
    
    // Загружаем начальные данные
    loadJournalistData();
    
    // Настраиваем обработчики событий
    setupJournalistEventHandlers();
    
    // Обновляем кд способностей
    updateJournalistAbilityCooldowns();
}

/**
 * Обновление состояния журналиста
 */
function updateJournalistState(playerData) {
    // Сохраняем специальную информацию
    if (playerData.specialInfo) {
        JournalistState.rumors = playerData.specialInfo.rumors || [];
        JournalistState.socialConnections = playerData.specialInfo.socialConnections || [];
    }
    
    // Инициализируем способности
    if (playerData.roleInfo && playerData.roleInfo.abilities) {
        playerData.roleInfo.abilities.forEach(ability => {
            if (JournalistState.abilities[ability.id]) {
                JournalistState.abilities[ability.id].description = ability.description;
                JournalistState.abilities[ability.id].cooldown = ability.cooldown || 0;
            }
        });
    }
    
    // Инициализируем блокнот с начальной заметкой
    if (JournalistState.notebook.entries.length === 0) {
        JournalistState.notebook.entries.push({
            id: JournalistState.notebook.nextId++,
            title: 'Начальные заметки',
            content: `Дело: ${playerData.caseInfo?.title || 'Неизвестно'}\nДата: ${new Date().toLocaleDateString()}\n\nМои наблюдения:\n1. Собрать все слухи и сплетни\n2. Изучить социальные связи\n3. Взять интервью у ключевых свидетелей\n4. Проверить все слухи на достоверность`,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: ['начало', 'план']
        });
        JournalistState.notebook.currentEntry = JournalistState.notebook.entries[0];
    }
}

/**
 * Создание интерфейса журналиста
 */
function createJournalistInterface() {
    const interfaceContainer = document.getElementById('role-specific-interface');
    if (!interfaceContainer) return;
    
    interfaceContainer.innerHTML = '';
    interfaceContainer.className = 'journalist-interface';
    
    // Основная структура интерфейса
    interfaceContainer.innerHTML = `
        <div class="role-interface">
            <!-- Блокнот журналиста -->
            <div class="role-section notebook-section">
                <h3><i class="fas fa-book"></i> Блокнот журналиста</h3>
                <div class="notebook-panel" id="notebook-panel">
                    <div class="notebook-entries" id="notebook-entries">
                        <!-- Список записей будет загружен динамически -->
                    </div>
                    <div class="notebook-editor" id="notebook-editor">
                        <!-- Редактор заметок -->
                        <div class="editor-toolbar">
                            <button class="btn btn-small" id="new-note">
                                <i class="fas fa-plus"></i> Новая заметка
                            </button>
                            <button class="btn btn-small" id="save-note">
                                <i class="fas fa-save"></i> Сохранить
                            </button>
                            <button class="btn btn-small" id="share-note">
                                <i class="fas fa-share"></i> Поделиться
                            </button>
                        </div>
                        <div class="editor-content">
                            <input type="text" id="note-title" placeholder="Заголовок заметки" class="note-title-input">
                            <textarea id="note-content" placeholder="Введите текст заметки..." class="note-content-textarea"></textarea>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Карта социальных связей -->
            <div class="role-section network-section">
                <h3><i class="fas fa-project-diagram"></i> Карта социальных связей</h3>
                <div class="network-map" id="network-map">
                    <!-- Карта связей будет отрисована динамически -->
                    <div class="network-placeholder">
                        <i class="fas fa-users"></i>
                        <p>Изучайте связи между персонажами</p>
                    </div>
                </div>
                <div class="network-controls">
                    <button class="btn btn-primary" id="reveal-connections">
                        <i class="fas fa-eye"></i> Раскрыть связи
                    </button>
                    <button class="btn btn-secondary" id="reset-network">
                        <i class="fas fa-redo"></i> Сбросить
                    </button>
                </div>
            </div>
            
            <!-- Слухи и сплетни -->
            <div class="role-section rumors-section">
                <h3><i class="fas fa-comments"></i> Слухи и сплетни</h3>
                <div class="rumors-board" id="rumors-board">
                    <!-- Слухи будут загружены динамически -->
                </div>
                <div class="rumors-controls">
                    <button class="btn btn-primary" id="check-rumor">
                        <i class="fas fa-check-circle"></i> Проверить слух
                    </button>
                    <button class="btn btn-secondary" id="gather-rumors">
                        <i class="fas fa-bullhorn"></i> Собрать слухи
                    </button>
                </div>
            </div>
            
            <!-- Интервью и контакты -->
            <div class="role-section contacts-section">
                <h3><i class="fas fa-microphone-alt"></i> Интервью и контакты</h3>
                <div class="contacts-panel" id="contacts-panel">
                    <div class="contacts-list" id="contacts-list">
                        <!-- Список контактов -->
                        <div class="no-contacts">
                            <i class="fas fa-user-plus"></i>
                            <p>Начните брать интервью у свидетелей</p>
                        </div>
                    </div>
                    <div class="interview-panel" id="interview-panel">
                        <!-- Панель интервью -->
                        <div class="interview-placeholder">
                            <i class="fas fa-microphone"></i>
                            <p>Выберите контакт для интервью</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем компоненты
    initializeNotebook();
    initializeNetworkMap();
    initializeRumorsBoard();
    initializeContactsPanel();
}

/**
 * Инициализация блокнота
 */
function initializeNotebook() {
    const notebookEntries = document.getElementById('notebook-entries');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const newNoteBtn = document.getElementById('new-note');
    const saveNoteBtn = document.getElementById('save-note');
    const shareNoteBtn = document.getElementById('share-note');
    
    if (!notebookEntries || !noteTitle || !noteContent) return;
    
    // Загружаем список записей
    updateNotebookEntries();
    
    // Показываем первую запись
    if (JournalistState.notebook.currentEntry) {
        loadNoteIntoEditor(JournalistState.notebook.currentEntry);
    }
    
    // Обработчики кнопок
    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', createNewNote);
    }
    
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', saveCurrentNote);
    }
    
    if (shareNoteBtn) {
        shareNoteBtn.addEventListener('click', shareCurrentNote);
    }
    
    // Автосохранение при изменении
    if (noteTitle && noteContent) {
        noteTitle.addEventListener('input', debounce(autoSaveNote, 1000));
        noteContent.addEventListener('input', debounce(autoSaveNote, 1000));
    }
}

/**
 * Инициализация карты социальных связей
 */
function initializeNetworkMap() {
    const networkMap = document.getElementById('network-map');
    const revealBtn = document.getElementById('reveal-connections');
    const resetBtn = document.getElementById('reset-network');
    
    if (!networkMap) return;
    
    // Создаем начальные узлы
    createInitialNetworkNodes();
    
    // Отрисовываем карту
    renderNetworkMap();
    
    // Обработчики кнопок
    if (revealBtn) {
        revealBtn.addEventListener('click', revealSocialConnections);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetNetworkMap);
    }
}

/**
 * Инициализация доски слухов
 */
function initializeRumorsBoard() {
    const rumorsBoard = document.getElementById('rumors-board');
    const checkRumorBtn = document.getElementById('check-rumor');
    const gatherRumorsBtn = document.getElementById('gather-rumors');
    
    if (!rumorsBoard) return;
    
    // Загружаем слухи
    updateRumorsBoard();
    
    // Обработчики кнопок
    if (checkRumorBtn) {
        checkRumorBtn.addEventListener('click', checkSelectedRumor);
    }
    
    if (gatherRumorsBtn) {
        gatherRumorsBtn.addEventListener('click', gatherNewRumors);
    }
}

/**
 * Инициализация панели контактов
 */
function initializeContactsPanel() {
    const contactsList = document.getElementById('contacts-list');
    const interviewPanel = document.getElementById('interview-panel');
    
    if (!contactsList || !interviewPanel) return;
    
    // Загружаем начальные контакты
    loadInitialContacts();
    
    // Обновляем список контактов
    updateContactsList();
}

/**
 * Загрузка начальных данных
 */
function loadJournalistData() {
    // Инициализируем карту социальных связей
    initializeNetworkData();
    
    // Загружаем дополнительные слухи, если есть
    if (JournalistState.rumors.length === 0) {
        loadSampleRumors();
    }
}

/**
 * Настройка обработчиков событий
 */
function setupJournalistEventHandlers() {
    // Обработчики уже настроены в функциях инициализации
}

/**
 * Обновление списка записей в блокноте
 */
function updateNotebookEntries() {
    const notebookEntries = document.getElementById('notebook-entries');
    if (!notebookEntries) return;
    
    notebookEntries.innerHTML = '';
    
    JournalistState.notebook.entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'notebook-entry';
        if (JournalistState.notebook.currentEntry && entry.id === JournalistState.notebook.currentEntry.id) {
            entryElement.classList.add('active');
        }
        entryElement.dataset.entryId = entry.id;
        
        // Обрезаем длинный контент для preview
        const preview = entry.content.length > 100 
            ? entry.content.substring(0, 100) + '...' 
            : entry.content;
        
        entryElement.innerHTML = `
            <div class="entry-title">${entry.title}</div>
            <div class="entry-preview">${preview}</div>
            <div class="entry-date">${new Date(entry.updated).toLocaleDateString()}</div>
        `;
        
        // Обработчик клика
        entryElement.addEventListener('click', () => {
            selectNotebookEntry(entry);
        });
        
        notebookEntries.appendChild(entryElement);
    });
}

/**
 * Выбор записи в блокноте
 */
function selectNotebookEntry(entry) {
    JournalistState.notebook.currentEntry = entry;
    
    // Обновляем активный элемент в списке
    document.querySelectorAll('.notebook-entry').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.entryId) === entry.id) {
            el.classList.add('active');
        }
    });
    
    // Загружаем запись в редактор
    loadNoteIntoEditor(entry);
}

/**
 * Загрузка записи в редактор
 */
function loadNoteIntoEditor(entry) {
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    
    if (noteTitle && noteContent) {
        noteTitle.value = entry.title;
        noteContent.value = entry.content;
    }
}

/**
 * Создание новой заметки
 */
function createNewNote() {
    const newEntry = {
        id: JournalistState.notebook.nextId++,
        title: 'Новая заметка',
        content: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: []
    };
    
    JournalistState.notebook.entries.push(newEntry);
    JournalistState.notebook.currentEntry = newEntry;
    
    // Обновляем интерфейс
    updateNotebookEntries();
    loadNoteIntoEditor(newEntry);
    
    // Фокус на заголовок
    const noteTitle = document.getElementById('note-title');
    if (noteTitle) {
        noteTitle.focus();
    }
    
    showJournalistNotification('Создана новая заметка', 'success');
}

/**
 * Сохранение текущей заметки
 */
function saveCurrentNote() {
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    
    if (!noteTitle || !noteContent || !JournalistState.notebook.currentEntry) return;
    
    const entry = JournalistState.notebook.currentEntry;
    entry.title = noteTitle.value.trim() || 'Без названия';
    entry.content = noteContent.value;
    entry.updated = new Date().toISOString();
    
    // Обновляем отображение в списке
    updateNotebookEntries();
    
    showJournalistNotification('Заметка сохранена', 'success');
}

/**
 * Автосохранение заметки
 */
function autoSaveNote() {
    saveCurrentNote();
}

/**
 * Поделиться заметкой
 */
function shareCurrentNote() {
    if (!JournalistState.notebook.currentEntry) return;
    
    const entry = JournalistState.notebook.currentEntry;
    const preview = entry.content.length > 100 
        ? entry.content.substring(0, 100) + '...' 
        : entry.content;
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Заметка журналиста] ${entry.title}: ${preview}`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showJournalistNotification('Ошибка отправки заметки', 'error');
            } else {
                showJournalistNotification('Заметка отправлена в чат', 'success');
            }
        });
    }
}

/**
 * Инициализация данных для карты связей
 */
function initializeNetworkData() {
    // Создаем начальные узлы (подозреваемые)
    const initialNodes = [
        { id: 'suspect1', name: 'Доктор Вэнс', type: 'suspect', x: 50, y: 50 },
        { id: 'suspect2', name: 'Миллисент Фэрчайлд', type: 'suspect', x: 200, y: 50 },
        { id: 'suspect3', name: 'Виктор Кроули', type: 'suspect', x: 50, y: 150 },
        { id: 'suspect4', name: 'Изабелла Росси', type: 'suspect', x: 200, y: 150 },
        { id: 'museum', name: 'Музей', type: 'location', x: 125, y: 100 }
    ];
    
    JournalistState.networkMap.nodes = initialNodes;
    
    // Начальные связи (будут раскрываться позже)
    JournalistState.networkMap.connections = [];
}

/**
 * Отрисовка карты социальных связей
 */
function renderNetworkMap() {
    const networkMap = document.getElementById('network-map');
    if (!networkMap) return;
    
    networkMap.innerHTML = '';
    
    // Очищаем плейсхолдер
    const placeholder = networkMap.querySelector('.network-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    // Отрисовываем связи
    JournalistState.networkMap.connections.forEach(connection => {
        const fromNode = JournalistState.networkMap.nodes.find(n => n.id === connection.from);
        const toNode = JournalistState.networkMap.nodes.find(n => n.id === connection.to);
        
        if (fromNode && toNode) {
            const connectionElement = document.createElement('div');
            connectionElement.className = 'network-connection';
            connectionElement.style.cssText = `
                position: absolute;
                left: ${fromNode.x + 30}px;
                top: ${fromNode.y + 30}px;
                width: ${Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2))}px;
                height: 2px;
                background: ${connection.type === 'hidden' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.7)'};
                transform: rotate(${Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)}rad);
                transform-origin: 0 0;
                z-index: 1;
            `;
            
            if (connection.type === 'hidden') {
                connectionElement.style.border = '1px dashed rgba(231, 76, 60, 0.5)';
                connectionElement.style.background = 'transparent';
            }
            
            networkMap.appendChild(connectionElement);
        }
    });
    
    // Отрисовываем узлы
    JournalistState.networkMap.nodes.forEach(node => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'network-node';
        nodeElement.dataset.nodeId = node.id;
        nodeElement.style.cssText = `
            position: absolute;
            left: ${node.x}px;
            top: ${node.y}px;
            width: 60px;
            height: 60px;
            background: ${getNodeColor(node.type)};
            border: 2px solid ${getNodeBorderColor(node.type)};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            cursor: pointer;
            z-index: 2;
            font-size: 0.8rem;
            text-align: center;
            padding: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        nodeElement.innerHTML = node.name.split(' ').map(word => word[0]).join('').toUpperCase();
        
        // Всплывающая подсказка
        nodeElement.title = `${node.name} (${getNodeTypeName(node.type)})`;
        
        // Обработчик клика
        nodeElement.addEventListener('click', () => {
            showNodeDetails(node);
        });
        
        networkMap.appendChild(nodeElement);
    });
}

/**
 * Раскрытие социальных связей
 */
function revealSocialConnections() {
    const ability = JournalistState.abilities.social_network;
    if (!checkJournalistAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateJournalistAbilityCooldown('social_network');
    
    showJournalistNotification('Раскрытие социальных связей...', 'info');
    
    // Имитация раскрытия связей
    setTimeout(() => {
        // Добавляем новые связи
        const newConnections = [
            { from: 'suspect1', to: 'suspect2', type: 'professional', label: 'Работают вместе' },
            { from: 'suspect1', to: 'museum', type: 'employment', label: 'Работает в' },
            { from: 'suspect3', to: 'museum', type: 'employment', label: 'Охраняет' },
            { from: 'suspect2', to: 'museum', type: 'financial', label: 'Спонсирует' }
        ];
        
        newConnections.forEach(conn => {
            if (!JournalistState.networkMap.connections.some(c => c.from === conn.from && c.to === conn.to)) {
                JournalistState.networkMap.connections.push(conn);
            }
        });
        
        // Обновляем карту
        renderNetworkMap();
        
        // Добавляем заметку в блокнот
        addNetworkNotes();
        
        showJournalistNotification('Обнаружены новые социальные связи', 'success');
    }, 2000);
}

/**
 * Сброс карты связей
 */
function resetNetworkMap() {
    // Скрываем все связи, кроме базовых
    JournalistState.networkMap.connections = JournalistState.networkMap.connections.filter(
        conn => conn.type === 'hidden'
    );
    
    renderNetworkMap();
    showJournalistNotification('Карта связей сброшена', 'info');
}

/**
 * Добавление заметок о связях в блокнот
 */
function addNetworkNotes() {
    const newEntry = {
        id: JournalistState.notebook.nextId++,
        title: 'Социальные связи',
        content: 'Обнаруженные связи:\n\n' + 
                JournalistState.networkMap.connections
                    .filter(conn => conn.type !== 'hidden')
                    .map(conn => {
                        const fromNode = JournalistState.networkMap.nodes.find(n => n.id === conn.from);
                        const toNode = JournalistState.networkMap.nodes.find(n => n.id === conn.to);
                        return `• ${fromNode?.name} ↔ ${toNode?.name}: ${conn.label || 'Связь'}`;
                    })
                    .join('\n'),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['связи', 'анализ']
    };
    
    JournalistState.notebook.entries.push(newEntry);
    updateNotebookEntries();
}

/**
 * Показать детали узла
 */
function showNodeDetails(node) {
    const details = getNodeDetails(node);
    
    const modal = document.getElementById('evidence-modal');
    const modalBody = document.getElementById('evidence-modal-body');
    
    if (!modal || !modalBody) {
        createTempNodeModal(node, details);
        return;
    }
    
    modalBody.innerHTML = `
        <h3>${node.name}</h3>
        <div class="node-type">${getNodeTypeName(node.type)}</div>
        
        <div class="node-details">
            <p>${details}</p>
        </div>
        
        <div class="node-connections">
            <h4>Связи:</h4>
            <ul>
                ${JournalistState.networkMap.connections
                    .filter(conn => conn.from === node.id || conn.to === node.id)
                    .map(conn => {
                        const otherId = conn.from === node.id ? conn.to : conn.from;
                        const otherNode = JournalistState.networkMap.nodes.find(n => n.id === otherId);
                        return `<li>${otherNode?.name} - ${conn.label || 'Связан'}</li>`;
                    })
                    .join('') || '<li>Связей не обнаружено</li>'}
            </ul>
        </div>
        
        <div class="node-actions">
            <button class="btn btn-primary" onclick="interviewPerson('${node.id}')">
                <i class="fas fa-microphone"></i> Взять интервью
            </button>
            <button class="btn btn-secondary" onclick="shareNodeInfo('${node.id}')">
                <i class="fas fa-share"></i> Поделиться
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Обновление доски слухов
 */
function updateRumorsBoard() {
    const rumorsBoard = document.getElementById('rumors-board');
    if (!rumorsBoard) return;
    
    rumorsBoard.innerHTML = '';
    
    if (JournalistState.rumors.length === 0) {
        rumorsBoard.innerHTML = `
            <div class="no-rumors">
                <i class="fas fa-comments"></i>
                <p>Слухи еще не собраны</p>
                <button class="btn btn-small" onclick="gatherNewRumors()">
                    <i class="fas fa-bullhorn"></i> Собрать слухи
                </button>
            </div>
        `;
        return;
    }
    
    JournalistState.rumors.forEach((rumor, index) => {
        const rumorCard = document.createElement('div');
        rumorCard.className = 'rumor-card';
        rumorCard.dataset.rumorIndex = index;
        
        if (rumor.verified !== undefined) {
            rumorCard.classList.add(rumor.verified ? 'verified' : 'debunked');
        }
        
        rumorCard.innerHTML = `
            <div class="rumor-header">
                <div class="rumor-source">${rumor.source || 'Анонимный источник'}</div>
                <div class="rumor-reliability">
                    ${rumor.reliability ? `Надежность: ${rumor.reliability}%` : 'Не проверено'}
                </div>
            </div>
            <div class="rumor-text">${rumor.text}</div>
            <div class="rumor-actions">
                <button class="btn btn-small ${rumor.verified === true ? 'btn-success' : rumor.verified === false ? 'btn-danger' : 'btn-primary'}" 
                        onclick="verifyRumor(${index})">
                    <i class="fas fa-${rumor.verified === true ? 'check' : rumor.verified === false ? 'times' : 'search'}"></i>
                    ${rumor.verified === true ? 'Подтверждено' : rumor.verified === false ? 'Опровергнуто' : 'Проверить'}
                </button>
                <button class="btn btn-small btn-secondary" onclick="shareRumor(${index})">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        rumorsBoard.appendChild(rumorCard);
    });
}

/**
 * Проверка выбранного слуха
 */
function checkSelectedRumor() {
    // Находим первый непроверенный слух
    const unverifiedIndex = JournalistState.rumors.findIndex(r => r.verified === undefined);
    
    if (unverifiedIndex === -1) {
        showJournalistNotification('Все слухи уже проверены', 'info');
        return;
    }
    
    verifyRumor(unverifiedIndex);
}

/**
 * Проверка слуха
 */
function verifyRumor(rumorIndex) {
    if (rumorIndex < 0 || rumorIndex >= JournalistState.rumors.length) return;
    
    const ability = JournalistState.abilities.investigate_rumor;
    if (!checkJournalistAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateJournalistAbilityCooldown('investigate_rumor');
    
    const rumor = JournalistState.rumors[rumorIndex];
    showJournalistNotification(`Проверка слуха: "${rumor.text.substring(0, 50)}..."`, 'info');
    
    // Имитация проверки
    setTimeout(() => {
        // Случайное определение истинности
        const isTrue = Math.random() > 0.5;
        rumor.verified = isTrue;
        rumor.reliability = isTrue ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 30);
        
        // Обновляем доску
        updateRumorsBoard();
        
        // Добавляем заметку
        addRumorNote(rumor, isTrue);
        
        showJournalistNotification(
            `Слух ${isTrue ? 'подтвержден' : 'опровергнут'} (достоверность: ${rumor.reliability}%)`,
            isTrue ? 'success' : 'warning'
        );
    }, 2000);
}

/**
 * Сбор новых слухов
 */
function gatherNewRumors() {
    showJournalistNotification('Сбор новых слухов...', 'info');
    
    // Имитация сбора слухов
    setTimeout(() => {
        const newRumors = [
            {
                text: 'Слышал, что у куратора Вэнса большие gambling долги',
                source: 'Бывший сотрудник музея',
                reliability: null,
                verified: undefined
            },
            {
                text: 'Охранник Кроули недавно интересовался ценами на черном рынке искусства',
                source: 'Анонимный дилер',
                reliability: null,
                verified: undefined
            },
            {
                text: 'Фэрчайлд и Вэнс встречались тайно за неделю до кражи',
                source: 'Официант в кафе',
                reliability: null,
                verified: undefined
            }
        ];
        
        newRumors.forEach(rumor => {
            if (!JournalistState.rumors.some(r => r.text === rumor.text)) {
                JournalistState.rumors.push(rumor);
            }
        });
        
        updateRumorsBoard();
        showJournalistNotification('Собраны новые слухи', 'success');
    }, 1500);
}

/**
 * Добавление заметки о слухе
 */
function addRumorNote(rumor, isTrue) {
    const newEntry = {
        id: JournalistState.notebook.nextId++,
        title: `Проверка слуха: ${isTrue ? 'Подтвержден' : 'Опровергнут'}`,
        content: `Слух: ${rumor.text}\n\nИсточник: ${rumor.source}\nРезультат проверки: ${isTrue ? 'ПОДТВЕРЖДЕНО' : 'ОПРОВЕРГНУТО'}\nДостоверность: ${rumor.reliability}%\n\n${isTrue ? 'Эту информацию можно использовать в расследовании' : 'Этот слух оказался ложным'}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: [isTrue ? 'подтверждено' : 'опровергнуто', 'слухи']
    };
    
    JournalistState.notebook.entries.push(newEntry);
    updateNotebookEntries();
}

/**
 * Загрузка начальных контактов
 */
function loadInitialContacts() {
    JournalistState.contacts = [
        {
            id: 'witness1',
            name: 'Марта Уилкинс',
            role: 'Уборщица',
            status: 'available',
            info: 'Работает в музее 5 лет. Видела многое.',
            lastInterview: null
        },
        {
            id: 'witness2',
            name: 'Томас Рид',
            role: 'Бармен',
            status: 'available',
            info: 'Работал на мероприятии. Общался со многими гостями.',
            lastInterview: null
        },
        {
            id: 'witness3',
            name: 'Доктор Вэнс',
            role: 'Куратор музея',
            status: 'unavailable',
            info: 'Главный подозреваемый. Неохотно идет на контакт.',
            lastInterview: null
        }
    ];
}

/**
 * Обновление списка контактов
 */
function updateContactsList() {
    const contactsList = document.getElementById('contacts-list');
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    JournalistState.contacts.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = `contact-item ${contact.status}`;
        contactItem.dataset.contactId = contact.id;
        
        contactItem.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-role">${contact.role}</div>
                <div class="contact-status">${contact.status === 'available' ? 'Доступен' : 'Недоступен'}</div>
            </div>
            <div class="contact-actions">
                <button class="btn btn-small ${contact.status === 'available' ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="interviewPerson('${contact.id}')"
                        ${contact.status === 'unavailable' ? 'disabled' : ''}>
                    <i class="fas fa-microphone"></i>
                </button>
            </div>
        `;
        
        // Обработчик клика для просмотра информации
        contactItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
                showContactDetails(contact);
            }
        });
        
        contactsList.appendChild(contactItem);
    });
}

/**
 * Показать детали контакта
 */
function showContactDetails(contact) {
    const interviewPanel = document.getElementById('interview-panel');
    if (!interviewPanel) return;
    
    interviewPanel.innerHTML = `
        <div class="contact-details">
            <div class="details-header">
                <h4>${contact.name}</h4>
                <div class="contact-role-badge">${contact.role}</div>
            </div>
            
            <div class="details-body">
                <div class="detail-item">
                    <label>Статус:</label>
                    <span class="status-${contact.status}">${contact.status === 'available' ? 'Доступен для интервью' : 'Недоступен'}</span>
                </div>
                
                <div class="detail-item">
                    <label>Информация:</label>
                    <p>${contact.info}</p>
                </div>
                
                ${contact.lastInterview ? `
                    <div class="detail-item">
                        <label>Последнее интервью:</label>
                        <p>${new Date(contact.lastInterview).toLocaleString()}</p>
                    </div>
                ` : ''}
                
                <div class="interview-questions">
                    <h5>Возможные вопросы:</h5>
                    <ul>
                        <li>Что вы видели в день происшествия?</li>
                        <li>Замечали ли вы что-то подозрительное?</li>
                        <li>Кого вы видели возле закрытого зала?</li>
                    </ul>
                </div>
                
                <div class="interview-actions">
                    <button class="btn btn-primary" 
                            onclick="interviewPerson('${contact.id}')"
                            ${contact.status === 'unavailable' ? 'disabled' : ''}>
                        <i class="fas fa-microphone"></i> Взять интервью
                    </button>
                    <button class="btn btn-secondary" onclick="shareContactInfo('${contact.id}')">
                        <i class="fas fa-share"></i> Поделиться контактом
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Взять интервью у человека
 */
function interviewPerson(personId) {
    const ability = JournalistState.abilities.interview_witness;
    if (!checkJournalistAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateJournalistAbilityCooldown('interview_witness');
    
    // Находим контакт
    const contact = JournalistState.contacts.find(c => c.id === personId) ||
                   JournalistState.networkMap.nodes.find(n => n.id === personId);
    
    if (!contact) return;
    
    if (contact.status === 'unavailable') {
        showJournalistNotification(`${contact.name} недоступен для интервью`, 'warning');
        return;
    }
    
    showJournalistNotification(`Начато интервью с ${contact.name}...`, 'info');
    
    // Имитация интервью
    setTimeout(() => {
        const interviewResult = conductInterview(contact);
        
        // Обновляем время последнего интервью
        if (JournalistState.contacts.some(c => c.id === personId)) {
            const contactIndex = JournalistState.contacts.findIndex(c => c.id === personId);
            JournalistState.contacts[contactIndex].lastInterview = new Date().toISOString();
        }
        
        // Добавляем заметку
        addInterviewNote(contact, interviewResult);
        
        // Обновляем панель интервью
        if (contact.id.startsWith('witness')) {
            showContactDetails(contact);
        }
        
        showJournalistNotification(`Интервью с ${contact.name} завершено`, 'success');
        
        // Поделиться ключевой информацией
        shareKeyInsight(contact, interviewResult);
    }, 3000);
}

/**
 * Проведение интервью
 */
function conductInterview(person) {
    const insights = {
        witness1: 'Видела, как доктор Вэнс выходил из закрытого зала с большой сумкой в 20:15. Обычно он ничего не носит.',
        witness2: 'Миллисент Фэрчайлд просила двойной виски в 19:45, что для нее необычно. Она казалась взволнованной.',
        suspect1: 'Утверждает, что был в своем кабинете весь вечер. Кажется нервным при вопросах о финансах.',
        suspect3: 'Делал обход каждый час. Утверждает, что ничего не видел, но избегает зрительного контакта.'
    };
    
    return insights[person.id] || 
           `${person.name} предоставил общую информацию, но ничего конкретного о происшествии.`;
}

/**
 * Добавление заметки об интервью
 */
function addInterviewNote(person, result) {
    const newEntry = {
        id: JournalistState.notebook.nextId++,
        title: `Интервью с ${person.name}`,
        content: `Дата: ${new Date().toLocaleDateString()}\nРоль: ${person.role || 'Неизвестно'}\n\nРезультаты интервью:\n${result}\n\nВыводы: ${extractKeyInsights(result)}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['интервью', person.role?.toLowerCase() || 'контакт']
    };
    
    JournalistState.notebook.entries.push(newEntry);
    updateNotebookEntries();
}

/**
 * Извлечение ключевых моментов
 */
function extractKeyInsights(text) {
    const keyPhrases = [
        'видел', 'видела', 'слышал', 'заметил', 'обнаружил',
        'нервный', 'взволнованный', 'подозрительный',
        'сумка', 'тайно', 'скрытно', 'ложь'
    ];
    
    const sentences = text.split(/[.!?]+/);
    const insights = sentences.filter(sentence => 
        keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase))
    );
    
    return insights.length > 0 ? insights.join('; ') : 'Конкретных улик не обнаружено';
}

/**
 * Поделиться ключевой информацией
 */
function shareKeyInsight(person, insight) {
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Интервью журналиста] ${person.name}: ${insight.substring(0, 100)}...`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (!error) {
                showJournalistNotification('Ключевая информация отправлена в чат', 'success');
            }
        });
    }
}

/**
 * Загрузка примерных слухов
 */
function loadSampleRumors() {
    const sampleRumors = [
        {
            text: 'Ваза была застрахована на сумму, превышающую ее реальную стоимость',
            source: 'Сотрудник страховой компании',
            reliability: null,
            verified: undefined
        },
        {
            text: 'В музее планировались сокращения штата на следующей неделе',
            source: 'Анонимный источник в администрации',
            reliability: null,
            verified: undefined
        },
        {
            text: 'Доктор Вэнс продавал личную коллекцию искусства через сомнительных дилеров',
            source: 'Коллега по арт-сообществу',
            reliability: null,
            verified: undefined
        }
    ];
    
    JournalistState.rumors = sampleRumors;
    updateRumorsBoard();
}

/**
 * Проверка кд способности
 */
function checkJournalistAbilityCooldown(ability) {
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    if (ability.lastUsed > 0 && timeSinceLastUse < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        showJournalistNotification(`Способность на перезарядке. Осталось: ${remainingTime}с`, 'warning');
        return false;
    }
    
    return true;
}

/**
 * Обновление кд способностей
 */
function updateJournalistAbilityCooldowns() {
    // Проверяем кд каждую секунду
    setInterval(() => {
        // Можно добавить визуальное обновление кд на кнопках
    }, 1000);
}

/**
 * Обновление отображения кд для конкретной способности
 */
function updateJournalistAbilityCooldown(abilityId) {
    // Визуальное обновление кд на кнопках способностей
    const ability = JournalistState.abilities[abilityId];
    if (!ability || ability.cooldown === 0) return;
    
    // Можно обновить текст или состояние кнопок
    // Например, кнопки в интерфейсе могут показывать оставшееся время
}

/**
 * Вспомогательные функции
 */
function getNodeColor(type) {
    const colors = {
        suspect: 'rgba(231, 76, 60, 0.8)',
        witness: 'rgba(52, 152, 219, 0.8)',
        location: 'rgba(46, 204, 113, 0.8)',
        default: 'rgba(149, 165, 166, 0.8)'
    };
    return colors[type] || colors.default;
}

function getNodeBorderColor(type) {
    const colors = {
        suspect: '#e74c3c',
        witness: '#3498db',
        location: '#2ecc71',
        default: '#95a5a6'
    };
    return colors[type] || colors.default;
}

function getNodeTypeName(type) {
    const names = {
        suspect: 'Подозреваемый',
        witness: 'Свидетель',
        location: 'Место',
        default: 'Персонаж'
    };
    return names[type] || names.default;
}

function getNodeDetails(node) {
    const details = {
        suspect1: 'Главный куратор музея. Эксперт по азиатскому искусству. Работает в музее 15 лет.',
        suspect2: 'Известная благотворительница, спонсирует музей. Вдова промышленного магната.',
        suspect3: 'Старший охранник музея. Бывший военный. Работает в музее 8 лет.',
        suspect4: 'Арт-дилер из Милана. Приглашенный эксперт для оценки коллекции.',
        museum: 'Музей современного искусства "Новый взгляд". Место происшествия.',
        default: 'Информация об этом персонаже еще не собрана.'
    };
    
    return details[node.id] || details.default;
}

function createTempNodeModal(node, details) {
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
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
        ">
            <div class="modal-header">
                <h3 style="margin: 0; color: #e74c3c;">${node.name}</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p>${details}</p>
                <button class="btn btn-primary" onclick="interviewPerson('${node.id}')">
                    <i class="fas fa-microphone"></i> Взять интервью
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

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

function showJournalistNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(`[Журналист] ${message}`, type);
    } else {
        console.log(`[Журналист ${type}]: ${message}`);
    }
}

function shareRumor(rumorIndex) {
    if (rumorIndex < 0 || rumorIndex >= JournalistState.rumors.length) return;
    
    const rumor = JournalistState.rumors[rumorIndex];
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Слух] ${rumor.text.substring(0, 100)}... (Источник: ${rumor.source})`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showJournalistNotification('Ошибка отправки слуха', 'error');
            } else {
                showJournalistNotification('Слух отправлен в чат', 'success');
            }
        });
    }
}

function shareNodeInfo(nodeId) {
    const node = JournalistState.networkMap.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Социальная связь] ${node.name} (${getNodeTypeName(node.type)})`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (!error) {
                showJournalistNotification('Информация о персонаже отправлена', 'success');
            }
        });
    }
}

function shareContactInfo(contactId) {
    const contact = JournalistState.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Контакт журналиста] ${contact.name} - ${contact.role}: ${contact.info.substring(0, 50)}...`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (!error) {
                showJournalistNotification('Контакт отправлен в чат', 'success');
            }
        });
    }
}

// Экспортируем функции для использования в HTML
window.initJournalistInterface = initJournalistInterface;
window.interviewPerson = interviewPerson;
window.verifyRumor = verifyRumor;
window.gatherNewRumors = gatherNewRumors;
window.shareRumor = shareRumor;
window.shareNodeInfo = shareNodeInfo;
window.shareContactInfo = shareContactInfo;

// Добавляем стили для интерфейса журналиста
const journalistStyles = document.createElement('style');
journalistStyles.textContent = `
    .journalist-interface {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
    }
    
    .notebook-panel {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 20px;
        height: 300px;
    }
    
    @media (max-width: 768px) {
        .notebook-panel {
            grid-template-columns: 1fr;
            height: auto;
        }
    }
    
    .notebook-entries {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 10px;
        overflow-y: auto;
        border: 1px solid rgba(231, 76, 60, 0.3);
    }
    
    .notebook-entry {
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-left: 3px solid transparent;
    }
    
    .notebook-entry:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .notebook-entry.active {
        background: rgba(231, 76, 60, 0.1);
        border-left-color: #e74c3c;
    }
    
    .entry-title {
        font-weight: 600;
        margin-bottom: 5px;
        color: white;
        font-size: 0.9rem;
    }
    
    .entry-preview {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 5px;
        line-height: 1.3;
    }
    
    .entry-date {
        font-size: 0.7rem;
        color: #7f8c8d;
    }
    
    .notebook-editor {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .editor-toolbar {
        display: flex;
        gap: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .editor-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .note-title-input {
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #95a5a6;
        border-radius: 6px;
        color: white;
        font-size: 1rem;
        font-weight: 600;
    }
    
    .note-title-input:focus {
        outline: none;
        border-color: #e74c3c;
    }
    
    .note-content-textarea {
        flex: 1;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid #95a5a6;
        border-radius: 8px;
        color: white;
        font-family: inherit;
        font-size: 0.9rem;
        line-height: 1.5;
        resize: none;
    }
    
    .note-content-textarea:focus {
        outline: none;
        border-color: #e74c3c;
    }
    
    .network-map {
        height: 250px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        border: 2px solid rgba(231, 76, 60, 0.3);
        position: relative;
        overflow: hidden;
        margin-bottom: 15px;
    }
    
    .network-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
    }
    
    .network-placeholder i {
        font-size: 3rem;
        margin-bottom: 10px;
        opacity: 0.5;
    }
    
    .network-controls {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    
    .rumors-board {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .rumor-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(231, 76, 60, 0.3);
    }
    
    .rumor-card.verified {
        border-color: #2ecc71;
        background: rgba(46, 204, 113, 0.05);
    }
    
    .rumor-card.debunked {
        border-color: #e74c3c;
        background: rgba(231, 76, 60, 0.05);
    }
    
    .rumor-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 10px;
    }
    
    .rumor-source {
        font-size: 0.8rem;
        background: rgba(231, 76, 60, 0.2);
        padding: 3px 8px;
        border-radius: 4px;
        color: #e74c3c;
    }
    
    .rumor-reliability {
        font-size: 0.7rem;
        color: #f39c12;
    }
    
    .rumor-text {
        font-size: 0.9rem;
        color: white;
        line-height: 1.4;
        margin-bottom: 10px;
    }
    
    .rumor-actions {
        display: flex;
        gap: 5px;
    }
    
    .no-rumors {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
        grid-column: 1 / -1;
    }
    
    .no-rumors i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
        display: block;
    }
    
    .rumors-controls {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    
    .contacts-panel {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 20px;
        height: 250px;
    }
    
    @media (max-width: 768px) {
        .contacts-panel {
            grid-template-columns: 1fr;
            height: auto;
        }
    }
    
    .contacts-list {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 10px;
        overflow-y: auto;
        border: 1px solid rgba(231, 76, 60, 0.3);
    }
    
    .contact-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    
    .contact-item:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .contact-item.available {
        border-left: 3px solid #2ecc71;
    }
    
    .contact-item.unavailable {
        border-left: 3px solid #e74c3c;
        opacity: 0.7;
    }
    
    .contact-avatar {
        width: 40px;
        height: 40px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e74c3c;
    }
    
    .contact-info {
        flex: 1;
    }
    
    .contact-name {
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 2px;
        color: white;
    }
    
    .contact-role {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 2px;
    }
    
    .contact-status {
        font-size: 0.7rem;
        color: #7f8c8d;
    }
    
    .no-contacts {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
    }
    
    .no-contacts i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
        display: block;
    }
    
    .interview-panel {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(231, 76, 60, 0.3);
        overflow-y: auto;
    }
    
    .interview-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
    }
    
    .interview-placeholder i {
        font-size: 3rem;
        margin-bottom: 10px;
        opacity: 0.5;
    }
    
    .contact-details {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .details-header h4 {
        margin: 0;
        color: #e74c3c;
    }
    
    .contact-role-badge {
        font-size: 0.8rem;
        background: rgba(231, 76, 60, 0.2);
        padding: 3px 8px;
        border-radius: 4px;
        color: #e74c3c;
    }
    
    .details-body {
        flex: 1;
        overflow-y: auto;
    }
    
    .detail-item {
        margin-bottom: 12px;
    }
    
    .detail-item label {
        display: block;
        font-weight: 600;
        color: #95a5a6;
        font-size: 0.9rem;
        margin-bottom: 5px;
    }
    
    .detail-item p {
        margin: 0;
        color: white;
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    .status-available {
        color: #2ecc71;
        font-weight: 600;
    }
    
    .status-unavailable {
        color: #e74c3c;
        font-weight: 600;
    }
    
    .interview-questions {
        margin: 20px 0;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        border-left: 3px solid #e74c3c;
    }
    
    .interview-questions h5 {
        color: #e74c3c;
        margin: 0 0 10px 0;
        font-size: 0.9rem;
    }
    
    .interview-questions ul {
        margin: 0;
        padding-left: 20px;
        color: white;
        font-size: 0.85rem;
        line-height: 1.4;
    }
    
    .interview-questions li {
        margin-bottom: 5px;
    }
    
    .interview-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    
    .node-details, .node-connections, .node-actions {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .node-type {
        font-size: 0.9rem;
        color: #e74c3c;
        margin-bottom: 10px;
        font-weight: 600;
    }
    
    .node-connections ul {
        margin: 10px 0 0 0;
        padding-left: 20px;
        color: white;
        font-size: 0.9rem;
    }
    
    .node-connections li {
        margin-bottom: 5px;
    }
`;
document.head.appendChild(journalistStyles);