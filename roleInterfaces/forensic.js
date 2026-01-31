/**
 * Forensic Interface - интерфейс для роли Эксперта-криминалиста
 */

// Состояние интерфейса криминалиста
const ForensicState = {
    // Инструменты и оборудование
    tools: [
        {
            id: 'microscope',
            name: 'Электронный микроскоп',
            description: 'Увеличение до 10000x',
            status: 'available',
            currentSample: null
        },
        {
            id: 'chemical_analyzer',
            name: 'Химический анализатор',
            description: 'Анализ состава веществ',
            status: 'available',
            currentTest: null
        },
        {
            id: 'dna_scanner',
            name: 'ДНК-сканер',
            description: 'Сравнение образцов ДНК',
            status: 'available',
            currentSample: null
        },
        {
            id: 'fingerprint_db',
            name: 'База отпечатков',
            description: 'Сравнение отпечатков пальцев',
            status: 'available'
        }
    ],
    
    // Образцы для анализа
    samples: [],
    
    // Результаты анализов
    analysisResults: [],
    
    // Способности
    abilities: {
        detailed_analysis: {
            name: "Детальный анализ",
            description: "Изучить улику под микроскопом",
            cooldown: 180,
            lastUsed: 0
        },
        chemical_test: {
            name: "Химический тест",
            description: "Провести химический анализ вещества",
            cooldown: 300,
            lastUsed: 0
        },
        fingerprint_scan: {
            name: "Сканирование отпечатков",
            description: "Сравнить отпечатки с базой данных",
            cooldown: 240,
            lastUsed: 0
        }
    },
    
    // Текущие настройки микроскопа
    microscope: {
        zoom: 100,
        focus: 50,
        contrast: 50,
        currentView: 'default'
    }
};

/**
 * Инициализация интерфейса криминалиста
 */
function initForensicInterface(playerData) {
    console.log('Инициализация интерфейса Эксперта-криминалиста:', playerData);
    
    // Обновляем состояние
    updateForensicState(playerData);
    
    // Создаем интерфейс
    createForensicInterface();
    
    // Загружаем начальные данные
    loadForensicData();
    
    // Настраиваем обработчики событий
    setupForensicEventHandlers();
    
    // Обновляем кд способностей
    updateForensicAbilityCooldowns();
}

/**
 * Обновление состояния криминалиста
 */
function updateForensicState(playerData) {
    // Сохраняем специальную информацию
    if (playerData.specialInfo) {
        ForensicState.samples = playerData.specialInfo.detailedClues || [];
        ForensicState.analysisResults = playerData.specialInfo.labAnalysis || [];
    }
    
    // Инициализируем способности
    if (playerData.roleInfo && playerData.roleInfo.abilities) {
        playerData.roleInfo.abilities.forEach(ability => {
            if (ForensicState.abilities[ability.id]) {
                ForensicState.abilities[ability.id].description = ability.description;
                ForensicState.abilities[ability.id].cooldown = ability.cooldown || 0;
            }
        });
    }
}

/**
 * Создание интерфейса криминалиста
 */
function createForensicInterface() {
    const interfaceContainer = document.getElementById('role-specific-interface');
    if (!interfaceContainer) return;
    
    interfaceContainer.innerHTML = '';
    interfaceContainer.className = 'forensic-interface';
    
    // Основная структура интерфейса
    interfaceContainer.innerHTML = `
        <div class="role-interface">
            <!-- Микроскоп -->
            <div class="role-section microscope-section">
                <h3><i class="fas fa-microscope"></i> Электронный микроскоп</h3>
                <div class="microscope-view" id="microscope-view">
                    <div class="microscope-header">
                        <div class="microscope-info">
                            <span class="microscope-status" id="microscope-status">Готов к работе</span>
                        </div>
                        <div class="microscope-controls">
                            <button class="control-button" id="microscope-zoom-in" title="Увеличить">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="control-button" id="microscope-zoom-out" title="Уменьшить">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button class="control-button" id="microscope-focus-plus" title="Увеличить фокус">
                                <i class="fas fa-plus-circle"></i>
                            </button>
                            <button class="control-button" id="microscope-focus-minus" title="Уменьшить фокус">
                                <i class="fas fa-minus-circle"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="microscope-display" id="microscope-display">
                        <!-- Изображение под микроскопом -->
                        <div class="microscope-placeholder">
                            <i class="fas fa-microscope"></i>
                            <p>Выберите образец для анализа</p>
                        </div>
                    </div>
                    
                    <div class="microscope-settings">
                        <div class="setting">
                            <label for="zoom-level">Увеличение:</label>
                            <span id="zoom-level">100x</span>
                        </div>
                        <div class="setting">
                            <label for="focus-level">Фокус:</label>
                            <span id="focus-level">50%</span>
                        </div>
                        <div class="setting">
                            <label for="contrast-level">Контраст:</label>
                            <input type="range" id="contrast-level" min="0" max="100" value="50">
                        </div>
                    </div>
                    
                    <div class="microscope-actions">
                        <button class="btn btn-primary" id="analyze-sample">
                            <i class="fas fa-search"></i> Анализировать образец
                        </button>
                        <button class="btn btn-secondary" id="save-analysis">
                            <i class="fas fa-save"></i> Сохранить результат
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Лабораторные инструменты -->
            <div class="role-section tools-section">
                <h3><i class="fas fa-tools"></i> Лабораторное оборудование</h3>
                <div class="lab-tools" id="lab-tools">
                    <!-- Инструменты будут загружены динамически -->
                </div>
            </div>
            
            <!-- Образцы для анализа -->
            <div class="role-section samples-section">
                <h3><i class="fas fa-vial"></i> Образцы для анализа</h3>
                <div class="samples-container" id="samples-container">
                    <div class="samples-list" id="samples-list">
                        <!-- Список образцов -->
                        <div class="no-samples">
                            <i class="fas fa-vial"></i>
                            <p>Образцы еще не загружены</p>
                        </div>
                    </div>
                    <div class="sample-details" id="sample-details" style="display: none;">
                        <!-- Детали выбранного образца -->
                    </div>
                </div>
            </div>
            
            <!-- Научные отчеты -->
            <div class="role-section reports-section">
                <h3><i class="fas fa-clipboard-check"></i> Научные отчеты</h3>
                <div class="forensic-reports" id="forensic-reports">
                    <div class="no-reports">
                        <i class="fas fa-file-alt"></i>
                        <p>Отчеты по анализам будут здесь</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем компоненты
    initializeMicroscope();
    initializeLabTools();
    initializeSamplesPanel();
    initializeReportsPanel();
}

/**
 * Инициализация микроскопа
 */
function initializeMicroscope() {
    const zoomInBtn = document.getElementById('microscope-zoom-in');
    const zoomOutBtn = document.getElementById('microscope-zoom-out');
    const focusPlusBtn = document.getElementById('microscope-focus-plus');
    const focusMinusBtn = document.getElementById('microscope-focus-minus');
    const contrastSlider = document.getElementById('contrast-level');
    const analyzeBtn = document.getElementById('analyze-sample');
    const saveBtn = document.getElementById('save-analysis');
    
    // Обработчики кнопок микроскопа
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => adjustMicroscopeZoom(50));
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => adjustMicroscopeZoom(-50));
    }
    
    if (focusPlusBtn) {
        focusPlusBtn.addEventListener('click', () => adjustMicroscopeFocus(10));
    }
    
    if (focusMinusBtn) {
        focusMinusBtn.addEventListener('click', () => adjustMicroscopeFocus(-10));
    }
    
    if (contrastSlider) {
        contrastSlider.addEventListener('input', (e) => {
            adjustMicroscopeContrast(parseInt(e.target.value));
        });
    }
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeCurrentSample);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAnalysisResult);
    }
    
    // Обновляем отображение настроек
    updateMicroscopeDisplay();
}

/**
 * Инициализация лабораторных инструментов
 */
function initializeLabTools() {
    const labToolsContainer = document.getElementById('lab-tools');
    if (!labToolsContainer) return;
    
    labToolsContainer.innerHTML = '';
    
    ForensicState.tools.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.dataset.toolId = tool.id;
        
        toolCard.innerHTML = `
            <div class="tool-icon">
                <i class="fas fa-${getToolIcon(tool.id)}"></i>
            </div>
            <div class="tool-name">${tool.name}</div>
            <div class="tool-desc">${tool.description}</div>
            <div class="tool-status ${tool.status}">
                ${tool.status === 'available' ? 'Доступен' : 'Занят'}
            </div>
        `;
        
        // Обработчик клика
        toolCard.addEventListener('click', () => {
            useTool(tool.id);
        });
        
        labToolsContainer.appendChild(toolCard);
    });
}

/**
 * Инициализация панели образцов
 */
function initializeSamplesPanel() {
    const samplesList = document.getElementById('samples-list');
    if (!samplesList) return;
    
    updateSamplesList();
}

/**
 * Инициализация панели отчетов
 */
function initializeReportsPanel() {
    updateReportsPanel();
}

/**
 * Загрузка начальных данных
 */
function loadForensicData() {
    // Загружаем образцы из данных игры
    if (ForensicState.samples.length > 0) {
        updateSamplesList();
    }
    
    // Загружаем начальные отчеты
    loadInitialReports();
}

/**
 * Настройка обработчиков событий
 */
function setupForensicEventHandlers() {
    // Обработчики уже настроены в функциях инициализации
}

/**
 * Регулировка увеличения микроскопа
 */
function adjustMicroscopeZoom(change) {
    const newZoom = ForensicState.microscope.zoom + change;
    ForensicState.microscope.zoom = Math.max(100, Math.min(10000, newZoom));
    updateMicroscopeDisplay();
    
    // Обновляем изображение, если есть активный образец
    updateMicroscopeImage();
}

/**
 * Регулировка фокуса микроскопа
 */
function adjustMicroscopeFocus(change) {
    const newFocus = ForensicState.microscope.focus + change;
    ForensicState.microscope.focus = Math.max(0, Math.min(100, newFocus));
    updateMicroscopeDisplay();
}

/**
 * Регулировка контраста микроскопа
 */
function adjustMicroscopeContrast(value) {
    ForensicState.microscope.contrast = value;
    updateMicroscopeDisplay();
    
    // Обновляем стили изображения
    const display = document.getElementById('microscope-display');
    if (display) {
        const image = display.querySelector('.microscope-image');
        if (image) {
            image.style.filter = `contrast(${value}%)`;
        }
    }
}

/**
 * Обновление отображения настроек микроскопа
 */
function updateMicroscopeDisplay() {
    const zoomLevel = document.getElementById('zoom-level');
    const focusLevel = document.getElementById('focus-level');
    const contrastSlider = document.getElementById('contrast-level');
    
    if (zoomLevel) {
        zoomLevel.textContent = `${ForensicState.microscope.zoom}x`;
    }
    
    if (focusLevel) {
        focusLevel.textContent = `${ForensicState.microscope.focus}%`;
    }
    
    if (contrastSlider) {
        contrastSlider.value = ForensicState.microscope.contrast;
    }
}

/**
 * Обновление изображения в микроскопе
 */
function updateMicroscopeImage() {
    const display = document.getElementById('microscope-display');
    if (!display) return;
    
    // Проверяем, есть ли активный образец
    const microscopeTool = ForensicState.tools.find(t => t.id === 'microscope');
    if (!microscopeTool || !microscopeTool.currentSample) {
        return;
    }
    
    const sample = microscopeTool.currentSample;
    
    // Создаем/обновляем изображение
    let image = display.querySelector('.microscope-image');
    if (!image) {
        image = document.createElement('img');
        image.className = 'microscope-image';
        display.innerHTML = '';
        display.appendChild(image);
        
        // Удаляем плейсхолдер
        const placeholder = display.querySelector('.microscope-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    }
    
    // Устанавливаем изображение в зависимости от типа образца
    const imageUrl = getSampleImage(sample);
    image.src = imageUrl;
    image.alt = sample.name || 'Образец';
    
    // Применяем настройки
    const scale = ForensicState.microscope.zoom / 100;
    image.style.transform = `scale(${scale})`;
    image.style.filter = `contrast(${ForensicState.microscope.contrast}%) blur(${(100 - ForensicState.microscope.focus) / 100}px)`;
}

/**
 * Использование инструмента
 */
function useTool(toolId) {
    const tool = ForensicState.tools.find(t => t.id === toolId);
    if (!tool || tool.status !== 'available') {
        showForensicNotification('Инструмент недоступен', 'warning');
        return;
    }
    
    switch (toolId) {
        case 'microscope':
            useMicroscope();
            break;
            
        case 'chemical_analyzer':
            useChemicalAnalyzer();
            break;
            
        case 'dna_scanner':
            useDnaScanner();
            break;
            
        case 'fingerprint_db':
            useFingerprintDatabase();
            break;
    }
}

/**
 * Использование микроскопа
 */
function useMicroscope() {
    // Проверяем способность
    const ability = ForensicState.abilities.detailed_analysis;
    if (!checkAbilityCooldown(ability)) return;
    
    // Используем способность
    ability.lastUsed = Date.now();
    updateForensicAbilityCooldown('detailed_analysis');
    
    // Проверяем, есть ли образец
    const microscopeTool = ForensicState.tools.find(t => t.id === 'microscope');
    if (!microscopeTool.currentSample) {
        showForensicNotification('Поместите образец в микроскоп', 'warning');
        return;
    }
    
    // Анализируем образец
    const sample = microscopeTool.currentSample;
    const analysisResult = analyzeWithMicroscope(sample);
    
    showForensicNotification(`Образец "${sample.name}" проанализирован под микроскопом`, 'success');
    
    // Добавляем результат в отчеты
    addAnalysisReport({
        tool: 'Микроскоп',
        sample: sample.name,
        result: analysisResult,
        confidence: Math.floor(Math.random() * 30) + 70 // 70-100%
    });
}

/**
 * Использование химического анализатора
 */
function useChemicalAnalyzer() {
    const ability = ForensicState.abilities.chemical_test;
    if (!checkAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateForensicAbilityCooldown('chemical_test');
    
    // Нужен образец для анализа
    showForensicNotification('Выберите образец для химического анализа', 'info');
    
    // Показываем диалог выбора образца
    showSampleSelectionDialog('chemical');
}

/**
 * Использование ДНК-сканера
 */
function useDnaScanner() {
    showForensicNotification('ДНК-сканер готов к работе. Выберите образец ДНК.', 'info');
    showSampleSelectionDialog('dna');
}

/**
 * Использование базы отпечатков
 */
function useFingerprintDatabase() {
    const ability = ForensicState.abilities.fingerprint_scan;
    if (!checkAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateForensicAbilityCooldown('fingerprint_scan');
    
    showForensicNotification('Сканирование отпечатков...', 'info');
    
    // Имитация сравнения отпечатков
    setTimeout(() => {
        const matches = simulateFingerprintMatch();
        
        const report = {
            tool: 'База отпечатков',
            sample: 'Отпечатки с места преступления',
            result: matches.length > 0 
                ? `Найдены совпадения: ${matches.join(', ')}`
                : 'Совпадений не найдено',
            confidence: matches.length > 0 ? 95 : 99
        };
        
        addAnalysisReport(report);
        showForensicNotification(report.result, matches.length > 0 ? 'success' : 'info');
    }, 2000);
}

/**
 * Анализ текущего образца
 */
function analyzeCurrentSample() {
    const microscopeTool = ForensicState.tools.find(t => t.id === 'microscope');
    if (!microscopeTool || !microscopeTool.currentSample) {
        showForensicNotification('Нет образца для анализа', 'warning');
        return;
    }
    
    useTool('microscope');
}

/**
 * Сохранение результата анализа
 */
function saveAnalysisResult() {
    // Получаем последний анализ
    if (ForensicState.analysisResults.length === 0) {
        showForensicNotification('Нет результатов для сохранения', 'warning');
        return;
    }
    
    const lastReport = ForensicState.analysisResults[ForensicState.analysisResults.length - 1];
    
    // Поделиться в чате
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Криминалистический отчет] ${lastReport.tool}: ${lastReport.result}`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showForensicNotification('Ошибка отправки отчета', 'error');
            } else {
                showForensicNotification('Отчет отправлен в чат', 'success');
            }
        });
    }
}

/**
 * Обновление списка образцов
 */
function updateSamplesList() {
    const samplesList = document.getElementById('samples-list');
    if (!samplesList) return;
    
    samplesList.innerHTML = '';
    
    if (ForensicState.samples.length === 0) {
        samplesList.innerHTML = `
            <div class="no-samples">
                <i class="fas fa-vial"></i>
                <p>Образцы еще не загружены</p>
            </div>
        `;
        return;
    }
    
    ForensicState.samples.forEach((sample, index) => {
        const sampleItem = document.createElement('div');
        sampleItem.className = 'sample-item';
        sampleItem.dataset.sampleIndex = index;
        
        sampleItem.innerHTML = `
            <div class="sample-icon">
                <i class="fas fa-${getSampleIcon(sample.type)}"></i>
            </div>
            <div class="sample-info">
                <div class="sample-name">${sample.name || `Образец #${index + 1}`}</div>
                <div class="sample-type">${sample.type || 'Неизвестно'}</div>
            </div>
            <div class="sample-actions">
                <button class="btn btn-small btn-secondary" onclick="loadSampleInMicroscope(${index})">
                    <i class="fas fa-microscope"></i>
                </button>
            </div>
        `;
        
        // Обработчик клика для просмотра деталей
        sampleItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
                showSampleDetails(index);
            }
        });
        
        samplesList.appendChild(sampleItem);
    });
}

/**
 * Загрузка образца в микроскоп
 */
function loadSampleInMicroscope(sampleIndex) {
    if (sampleIndex < 0 || sampleIndex >= ForensicState.samples.length) return;
    
    const sample = ForensicState.samples[sampleIndex];
    const microscopeTool = ForensicState.tools.find(t => t.id === 'microscope');
    
    if (!microscopeTool) return;
    
    microscopeTool.currentSample = sample;
    microscopeTool.status = 'busy';
    
    // Обновляем статус инструмента
    updateToolStatus('microscope', 'busy');
    
    // Обновляем изображение в микроскопе
    updateMicroscopeImage();
    
    // Обновляем статус микроскопа
    const statusElement = document.getElementById('microscope-status');
    if (statusElement) {
        statusElement.textContent = `Анализ: ${sample.name}`;
        statusElement.style.color = '#f39c12';
    }
    
    showForensicNotification(`Образец "${sample.name}" помещен в микроскоп`, 'success');
}

/**
 * Показать детали образца
 */
function showSampleDetails(sampleIndex) {
    if (sampleIndex < 0 || sampleIndex >= ForensicState.samples.length) return;
    
    const sample = ForensicState.samples[sampleIndex];
    const detailsContainer = document.getElementById('sample-details');
    const samplesContainer = document.getElementById('samples-container');
    
    if (!detailsContainer || !samplesContainer) return;
    
    detailsContainer.style.display = 'block';
    detailsContainer.innerHTML = `
        <div class="sample-details-content">
            <div class="details-header">
                <h4>${sample.name || `Образец #${sampleIndex + 1}`}</h4>
                <button class="close-details" onclick="hideSampleDetails()">&times;</button>
            </div>
            
            <div class="details-body">
                <div class="detail-row">
                    <span class="detail-label">Тип:</span>
                    <span class="detail-value">${sample.type || 'Неизвестно'}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Место обнаружения:</span>
                    <span class="detail-value">${sample.location || 'Не указано'}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Описание:</span>
                    <span class="detail-value">${sample.description || 'Нет описания'}</span>
                </div>
                
                ${sample.detailedInfo ? `
                    <div class="detail-row">
                        <span class="detail-label">Детальный анализ:</span>
                        <span class="detail-value">${sample.detailedInfo}</span>
                    </div>
                ` : ''}
                
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="loadSampleInMicroscope(${sampleIndex})">
                        <i class="fas fa-microscope"></i> Поместить в микроскоп
                    </button>
                    <button class="btn btn-secondary" onclick="performChemicalTest(${sampleIndex})">
                        <i class="fas fa-flask"></i> Химический анализ
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Настраиваем ширину контейнеров
    samplesContainer.style.gridTemplateColumns = '1fr 1fr';
}

/**
 * Скрыть детали образца
 */
function hideSampleDetails() {
    const detailsContainer = document.getElementById('sample-details');
    const samplesContainer = document.getElementById('samples-container');
    
    if (detailsContainer && samplesContainer) {
        detailsContainer.style.display = 'none';
        samplesContainer.style.gridTemplateColumns = '1fr';
    }
}

/**
 * Выполнение химического теста
 */
function performChemicalTest(sampleIndex) {
    if (sampleIndex < 0 || sampleIndex >= ForensicState.samples.length) return;
    
    const ability = ForensicState.abilities.chemical_test;
    if (!checkAbilityCooldown(ability)) return;
    
    ability.lastUsed = Date.now();
    updateForensicAbilityCooldown('chemical_test');
    
    const sample = ForensicState.samples[sampleIndex];
    
    showForensicNotification(`Химический анализ образца "${sample.name}"...`, 'info');
    
    // Имитация анализа
    setTimeout(() => {
        const chemicalResult = simulateChemicalAnalysis(sample);
        
        const report = {
            tool: 'Химический анализатор',
            sample: sample.name,
            result: chemicalResult,
            confidence: Math.floor(Math.random() * 20) + 80 // 80-100%
        };
        
        addAnalysisReport(report);
        showForensicNotification(`Результат химического анализа: ${chemicalResult}`, 'success');
    }, 3000);
}

/**
 * Обновление панели отчетов
 */
function updateReportsPanel() {
    const reportsContainer = document.getElementById('forensic-reports');
    if (!reportsContainer) return;
    
    if (ForensicState.analysisResults.length === 0) {
        reportsContainer.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-file-alt"></i>
                <p>Отчеты по анализам будут здесь</p>
            </div>
        `;
        return;
    }
    
    reportsContainer.innerHTML = '';
    
    // Показываем последние 5 отчетов
    const recentReports = ForensicState.analysisResults.slice(-5).reverse();
    
    recentReports.forEach((report, index) => {
        const reportElement = document.createElement('div');
        reportElement.className = 'report-item';
        
        reportElement.innerHTML = `
            <div class="report-header">
                <div class="report-title">${report.tool}</div>
                <div class="report-confidence">${report.confidence}% точность</div>
            </div>
            <div class="report-sample">Образец: ${report.sample}</div>
            <div class="report-data">${report.result}</div>
            <div class="report-actions">
                <button class="btn btn-small btn-secondary" 
                        onclick="shareReport(${ForensicState.analysisResults.length - 1 - index})">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
        `;
        
        reportsContainer.appendChild(reportElement);
    });
}

/**
 * Добавление отчета об анализе
 */
function addAnalysisReport(report) {
    ForensicState.analysisResults.push(report);
    updateReportsPanel();
}

/**
 * Загрузка начальных отчетов
 */
function loadInitialReports() {
    // Пример начальных отчетов
    const initialReports = [
        {
            tool: 'Первичный осмотр',
            sample: 'Место преступления',
            result: 'Обнаружены следы борьбы, повреждена витрина',
            confidence: 95
        },
        {
            tool: 'База данных',
            sample: 'История музея',
            result: 'За последние 5 лет 3 подобных инцидента',
            confidence: 100
        }
    ];
    
    initialReports.forEach(report => {
        ForensicState.analysisResults.push(report);
    });
    
    updateReportsPanel();
}

/**
 * Обновление статуса инструмента
 */
function updateToolStatus(toolId, status) {
    const tool = ForensicState.tools.find(t => t.id === toolId);
    if (!tool) return;
    
    tool.status = status;
    
    // Обновляем отображение
    const toolCard = document.querySelector(`.tool-card[data-tool-id="${toolId}"]`);
    if (toolCard) {
        const statusElement = toolCard.querySelector('.tool-status');
        if (statusElement) {
            statusElement.className = `tool-status ${status}`;
            statusElement.textContent = status === 'available' ? 'Доступен' : 'Занят';
        }
    }
}

/**
 * Проверка кд способности
 */
function checkAbilityCooldown(ability) {
    const now = Date.now();
    const timeSinceLastUse = now - ability.lastUsed;
    const cooldownMs = ability.cooldown * 1000;
    
    if (ability.lastUsed > 0 && timeSinceLastUse < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        showForensicNotification(`Способность на перезарядке. Осталось: ${remainingTime}с`, 'warning');
        return false;
    }
    
    return true;
}

/**
 * Обновление кд способностей
 */
function updateForensicAbilityCooldowns() {
    Object.keys(ForensicState.abilities).forEach(abilityId => {
        updateForensicAbilityCooldown(abilityId);
    });
    
    // Проверяем кд каждую секунду
    setInterval(() => {
        Object.keys(ForensicState.abilities).forEach(abilityId => {
            updateForensicAbilityCooldown(abilityId);
        });
    }, 1000);
}

/**
 * Обновление отображения кд для конкретной способности
 */
function updateForensicAbilityCooldown(abilityId) {
    // Эта функция будет обновлять UI элементов кд
    // В данном интерфейсе кд отображается при использовании способностей
}

/**
 * Вспомогательные функции
 */
function getToolIcon(toolId) {
    const icons = {
        microscope: 'microscope',
        chemical_analyzer: 'flask',
        dna_scanner: 'dna',
        fingerprint_db: 'fingerprint'
    };
    return icons[toolId] || 'toolbox';
}

function getSampleIcon(sampleType) {
    const icons = {
        physical: 'fingerprint',
        document: 'file-alt',
        witness: 'user',
        digital: 'laptop'
    };
    return icons[sampleType] || 'vial';
}

function getSampleImage(sample) {
    // Возвращает URL изображения в зависимости от типа образца
    const imageMap = {
        'Отпечатки на витрине': 'https://via.placeholder.com/400x300/3498db/ffffff?text=Отпечатки+пальцев',
        'Обрывок ткани': 'https://via.placeholder.com/400x300/2ecc71/ffffff?text=Ткань+под+микроскопом',
        'Химический состав пыли': 'https://via.placeholder.com/400x300/e74c3c/ffffff?text=Химический+анализ',
        'default': 'https://via.placeholder.com/400x300/95a5a6/ffffff?text=Образец+под+микроскопом'
    };
    
    return imageMap[sample.name] || imageMap.default;
}

function analyzeWithMicroscope(sample) {
    // Генерирует результат анализа в зависимости от образца
    const analyses = {
        'Отпечатки на витрине': 'Обнаружены четкие отпечатки пальцев, вероятно принадлежащие взрослому мужчине. Частицы кожи указывают на недавний контакт.',
        'Обрывок ткани': 'Шерстяная ткань высокого качества. Волокна соответствуют материалу костюма. Найдены микрочастицы грязи специфического состава.',
        'Химический состав пыли': 'Пыль содержит частицы специфического клея, используемого только в реставрационной мастерской музея.',
        'default': 'Образец требует дальнейшего анализа. Рекомендуется провести дополнительные тесты.'
    };
    
    return analyses[sample.name] || analyses.default;
}

function simulateChemicalAnalysis(sample) {
    const results = [
        'Обнаружены следы органических соединений животного происхождения',
        'Выявлены частицы синтетических волокон необычного состава',
        'Найдены следы химических реагентов, используемых при реставрации',
        'Обнаружены микрочастицы металла, соответствующие составу витрины',
        'Выявлены следы пота и кожного сала'
    ];
    
    return results[Math.floor(Math.random() * results.length)];
}

function simulateFingerprintMatch() {
    const suspects = ['Доктор Артур Вэнс', 'Виктор Кроули'];
    const matches = [];
    
    // 70% шанс найти совпадение
    if (Math.random() < 0.7) {
        matches.push(suspects[Math.floor(Math.random() * suspects.length)]);
    }
    
    return matches;
}

function showSampleSelectionDialog(analysisType) {
    const dialog = document.createElement('div');
    dialog.className = 'sample-selection-dialog';
    dialog.style.cssText = `
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
    
    dialog.innerHTML = `
        <div class="dialog-content" style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
        ">
            <div class="dialog-header">
                <h3>Выберите образец для ${analysisType === 'chemical' ? 'химического анализа' : 'ДНК-анализа'}</h3>
                <button class="close-dialog" onclick="this.closest('.sample-selection-dialog').remove()">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="available-samples">
                    ${ForensicState.samples.map((sample, index) => `
                        <div class="sample-option" onclick="selectSampleForAnalysis(${index}, '${analysisType}')">
                            <i class="fas fa-${getSampleIcon(sample.type)}"></i>
                            <span>${sample.name || `Образец #${index + 1}`}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" onclick="this.closest('.sample-selection-dialog').remove()">
                    Отмена
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

function selectSampleForAnalysis(sampleIndex, analysisType) {
    const sample = ForensicState.samples[sampleIndex];
    
    // Закрываем диалог
    const dialog = document.querySelector('.sample-selection-dialog');
    if (dialog) dialog.remove();
    
    // Выполняем анализ
    if (analysisType === 'chemical') {
        performChemicalTest(sampleIndex);
    } else if (analysisType === 'dna') {
        showForensicNotification(`ДНК-анализ образца "${sample.name}" выполнен`, 'success');
    }
}

function shareReport(reportIndex) {
    if (reportIndex < 0 || reportIndex >= ForensicState.analysisResults.length) return;
    
    const report = ForensicState.analysisResults[reportIndex];
    
    if (typeof SocketClient !== 'undefined' && SocketClient.safeEmit) {
        const message = `[Криминалистический отчет] ${report.tool}: ${report.result} (Точность: ${report.confidence}%)`;
        SocketClient.safeEmit('game:message', { message }, (error) => {
            if (error) {
                showForensicNotification('Ошибка отправки отчета', 'error');
            } else {
                showForensicNotification('Отчет отправлен в чат', 'success');
            }
        });
    }
}

function showForensicNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(`[Криминалист] ${message}`, type);
    } else {
        console.log(`[Криминалист ${type}]: ${message}`);
        alert(`[Криминалист] ${message}`);
    }
}

// Экспортируем функции для использования в HTML
window.initForensicInterface = initForensicInterface;
window.loadSampleInMicroscope = loadSampleInMicroscope;
window.hideSampleDetails = hideSampleDetails;
window.performChemicalTest = performChemicalTest;
window.selectSampleForAnalysis = selectSampleForAnalysis;
window.shareReport = shareReport;

// Добавляем стили для интерфейса криминалиста
const forensicStyles = document.createElement('style');
forensicStyles.textContent = `
    .forensic-interface {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
    }
    
    .microscope-view {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        padding: 20px;
        border: 2px solid rgba(46, 204, 113, 0.3);
    }
    
    .microscope-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .microscope-status {
        padding: 5px 10px;
        background: rgba(46, 204, 113, 0.2);
        border-radius: 4px;
        color: #2ecc71;
        font-size: 0.9rem;
        font-weight: 600;
    }
    
    .microscope-controls {
        display: flex;
        gap: 10px;
    }
    
    .control-button {
        width: 40px;
        height: 40px;
        background: rgba(46, 204, 113, 0.2);
        border: 1px solid #2ecc71;
        border-radius: 6px;
        color: #2ecc71;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        transition: all 0.3s ease;
    }
    
    .control-button:hover {
        background: rgba(46, 204, 113, 0.3);
        transform: translateY(-2px);
    }
    
    .microscope-display {
        height: 250px;
        background: linear-gradient(135deg, #000428, #004e92);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
        overflow: hidden;
        position: relative;
    }
    
    .microscope-placeholder {
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
    }
    
    .microscope-placeholder i {
        font-size: 3rem;
        margin-bottom: 10px;
        display: block;
    }
    
    .microscope-image {
        max-width: 100%;
        max-height: 100%;
        transition: transform 0.3s ease, filter 0.3s ease;
    }
    
    .microscope-settings {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 15px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
    }
    
    .setting {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .setting label {
        font-size: 0.8rem;
        color: #95a5a6;
    }
    
    .setting span {
        font-weight: 600;
        color: white;
    }
    
    .setting input[type="range"] {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
    }
    
    .setting input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #2ecc71;
        border-radius: 50%;
        cursor: pointer;
    }
    
    .microscope-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    
    .lab-tools {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
    }
    
    .tool-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(46, 204, 113, 0.2);
    }
    
    .tool-card:hover {
        transform: translateY(-2px);
        border-color: #2ecc71;
        background: rgba(46, 204, 113, 0.1);
    }
    
    .tool-icon {
        font-size: 2rem;
        color: #2ecc71;
        margin-bottom: 10px;
    }
    
    .tool-name {
        font-weight: 600;
        margin-bottom: 5px;
        color: white;
    }
    
    .tool-desc {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 10px;
        line-height: 1.3;
    }
    
    .tool-status {
        font-size: 0.7rem;
        padding: 3px 8px;
        border-radius: 4px;
        display: inline-block;
    }
    
    .tool-status.available {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
    }
    
    .tool-status.busy {
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
    }
    
    .samples-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        transition: grid-template-columns 0.3s ease;
    }
    
    .samples-list {
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 10px;
    }
    
    .sample-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        border-left: 3px solid #2ecc71;
    }
    
    .sample-item:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .sample-item:last-child {
        margin-bottom: 0;
    }
    
    .sample-icon {
        width: 40px;
        height: 40px;
        background: rgba(46, 204, 113, 0.2);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #2ecc71;
        font-size: 1.2rem;
    }
    
    .sample-info {
        flex: 1;
    }
    
    .sample-name {
        font-weight: 600;
        margin-bottom: 3px;
        color: white;
    }
    
    .sample-type {
        font-size: 0.8rem;
        color: #95a5a6;
    }
    
    .no-samples, .no-reports {
        text-align: center;
        padding: 30px;
        color: #95a5a6;
    }
    
    .no-samples i, .no-reports i {
        font-size: 2rem;
        margin-bottom: 10px;
        opacity: 0.5;
        display: block;
    }
    
    .sample-details-content {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(46, 204, 113, 0.3);
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
        color: #2ecc71;
    }
    
    .close-details {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .detail-row {
        display: flex;
        margin-bottom: 10px;
    }
    
    .detail-label {
        width: 120px;
        font-weight: 600;
        color: #95a5a6;
        font-size: 0.9rem;
    }
    
    .detail-value {
        flex: 1;
        color: white;
    }
    
    .detail-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    
    .forensic-reports {
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 10px;
    }
    
    .report-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
        border-left: 3px solid #2ecc71;
    }
    
    .report-item:last-child {
        margin-bottom: 0;
    }
    
    .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .report-title {
        font-weight: 600;
        color: #2ecc71;
    }
    
    .report-confidence {
        font-size: 0.7rem;
        background: rgba(46, 204, 113, 0.2);
        padding: 2px 8px;
        border-radius: 4px;
        color: #2ecc71;
    }
    
    .report-sample {
        font-size: 0.8rem;
        color: #95a5a6;
        margin-bottom: 5px;
    }
    
    .report-data {
        font-size: 0.9rem;
        color: white;
        line-height: 1.4;
        margin-bottom: 8px;
        font-family: 'Courier New', monospace;
    }
    
    .sample-selection-dialog .dialog-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px;
        padding: 20px;
    }
    
    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .dialog-header h3 {
        margin: 0;
        color: #2ecc71;
    }
    
    .close-dialog {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    }
    
    .available-samples {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .sample-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        border: 1px solid transparent;
    }
    
    .sample-option:hover {
        background: rgba(46, 204, 113, 0.1);
        border-color: #2ecc71;
    }
    
    .sample-option i {
        color: #2ecc71;
        font-size: 1.2rem;
        width: 24px;
    }
    
    .dialog-footer {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: flex-end;
    }
`;
document.head.appendChild(forensicStyles);