// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ==================== ПРОВЕРКА ДОСТУПА ====================

function showAccessDenied(message) {
    document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;background:var(--tg-theme-bg-color,#f5f5f5);color:var(--tg-theme-text-color,#000);font-family:sans-serif">
            <div style="font-size:64px;margin-bottom:20px">🔒</div>
            <h2 style="margin:0 0 12px;font-size:20px">Доступ ограничен</h2>
            <p style="margin:0 0 24px;color:#666;white-space:pre-line">${message}</p>
            <button onclick="Telegram.WebApp.close()" style="padding:12px 24px;background:var(--tg-theme-button-color,#3390ec);color:white;border:none;border-radius:10px;font-size:16px;cursor:pointer">Закрыть</button>
        </div>
    `;
    try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error'); } catch(e) {}
}

// ==================== API КОНФИГУРАЦИЯ ====================

const API_BASE_URL = 'https://logisticbtw.onrender.com/api';

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'API Error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showAlert(`❌ ${error.message}`);
        throw error;
    }
}

// ==================== ВАЛИДАЦИЯ ====================

function showFormErrors(formId, errors, fieldErrors = {}) {
    const errorContainer = document.getElementById(formId + 'Errors');
    if (!errorContainer) return;
    
    errorContainer.innerHTML = '';
    errorContainer.classList.remove('active');
    
    document.querySelectorAll(`#${formId} .input-error`).forEach(el => {
        el.classList.remove('input-error');
    });
    
    if (errors.length === 0) return;
    
    errorContainer.innerHTML = errors.map(err => `<div class="error-item">⚠️ ${err}</div>`).join('');
    errorContainer.classList.add('active');
    
    Object.keys(fieldErrors).forEach(fieldId => {
        if (fieldErrors[fieldId]) {
            const field = document.getElementById(fieldId);
            if (field) field.classList.add('input-error');
        }
    });
    
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    } catch(e) {}
}

function clearFormErrors(formId) {
    const errorContainer = document.getElementById(formId + 'Errors');
    if (errorContainer) {
        errorContainer.innerHTML = '';
        errorContainer.classList.remove('active');
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('input-error');
    }
    
    const modal = field.closest('.modal');
    if (modal) {
        const errorContainer = modal.querySelector('.form-errors');
        if (errorContainer) {
            errorContainer.innerHTML = '';
            errorContainer.classList.remove('active');
        }
    }
}

function validateNumber(value, fieldName, options = {}) {
    const { min = 0, max = 1000000, allowZero = true } = options;
    const num = parseInt(value) || 0;
    const errors = [];
    
    if (!allowZero && num === 0) errors.push(`${fieldName} не может быть 0`);
    if (num < min) errors.push(`${fieldName} не может быть меньше ${min}`);
    if (num > max) errors.push(`${fieldName} не может быть больше ${max.toLocaleString('ru-RU')}`);
    
    return { isValid: errors.length === 0, errors: errors, value: num };
}

function validateText(value, fieldName, options = {}) {
    const { minLength = 1, maxLength = 100, required = true } = options;
    const trimmed = value ? value.trim() : '';
    const errors = [];
    
    if (required && !trimmed) {
        errors.push(`${fieldName} обязательно`);
        return { isValid: false, errors, value: '' };
    }
    
    if (trimmed && trimmed.length < minLength) errors.push(`${fieldName} должен быть не менее ${minLength} символов`);
    if (trimmed && trimmed.length > maxLength) errors.push(`${fieldName} не может быть длиннее ${maxLength} символов`);
    
    return { isValid: errors.length === 0, errors: errors, value: trimmed };
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRubles(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(amount);
}

function getMonthKey(dateStr) {
    if (!dateStr) return null;
    return dateStr.substring(0, 7);
}

function calculateReservedQty(product) {
    return product.reserved_qty || 0;
}

function showAlert(message) {
    try {
        if (tg && tg.showAlert) {
            tg.showAlert(message);
        } else {
            alert(message);
        }
    } catch (e) {
        console.error('showAlert error:', e);
        alert(message);
    }
}

// ==================== ТОВАРЫ ====================

async function loadProducts() {
    try {
        return await apiRequest('/products');
    } catch (e) {
        console.error('Error loading products:', e);
        return [];
    }
}

async function saveProductAPI(productData, productId = null) {
    if (productId) {
        return await apiRequest(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    } else {
        return await apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }
}

async function deleteProductAPI(productId) {
    return await apiRequest(`/products/${productId}`, {
        method: 'DELETE'
    });
}

async function renderProducts() {
    const products = await loadProducts();
    const container = document.getElementById('productsList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <div>Нет товаров</div>
                <small>Нажмите "Добавить" чтобы создать первый</small>
            </div>
        `;
        updateStats(products);
        return;
    }

    container.innerHTML = products.map(product => {
        const reservedQty = calculateReservedQty(product);
        const free = (product.total_qty || 0) - reservedQty;
        const reservedCount = 0; // Будет загружаться отдельно
        
        return `
            <div class="product-card">
                <div class="product-header">
                    <div style="flex: 1;">
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        <div class="product-id">ID: ${product.id?.substr(0, 8) || ''}</div>
                    </div>
                </div>
                <div class="product-stats">
                    <div class="stat-item">
                        <div class="stat-label">📦 Всего</div>
                        <div class="stat-value">${product.total_qty || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">🔒 В брони</div>
                        <div class="stat-value reserved-qty">${reservedQty}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">🚚 В пути</div>
                        <div class="stat-value">${product.transit_qty || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">✅ Свободно</div>
                        <div class="stat-value free-qty">${free}</div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-warning" onclick="showReservations('${product.id}')">🔒 Бронь</button>
                    <button class="btn btn-primary" onclick="editProduct('${product.id}')">✏️</button>
                    <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    updateStats(products);
}

function updateStats(products) {
    const el = document.getElementById('totalProducts');
    if (el) el.textContent = products ? products.length : 0;
}

async function showAddProduct() {
    clearFormErrors('productForm');
    document.getElementById('formTitle').textContent = 'Добавить товар';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('totalQty').value = 0;
    document.getElementById('transitQty').value = 0;
    document.getElementById('productForm').classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('productName');
        if (input) input.focus();
    }, 300);
}

async function editProduct(id) {
    clearFormErrors('productForm');
    const products = await loadProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
        showAlert('Товар не найден');
        return;
    }
    
    document.getElementById('formTitle').textContent = 'Изменить товар';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('totalQty').value = product.total_qty || 0;
    document.getElementById('transitQty').value = product.transit_qty || 0;
    document.getElementById('productForm').classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('productName');
        if (input) input.focus();
    }, 300);
}

async function saveProduct() {
    clearFormErrors('productForm');
    
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const totalQty = document.getElementById('totalQty').value;
    const transitQty = document.getElementById('transitQty').value;
    
    const nameValidation = validateText(name, 'Название', { minLength: 2, maxLength: 100 });
    const totalValidation = validateNumber(totalQty, 'Всего на складе', { min: 0, max: 1000000, allowZero: true });
    const transitValidation = validateNumber(transitQty, 'В пути', { min: 0, max: 1000000, allowZero: true });
    
    const allErrors = [...nameValidation.errors, ...totalValidation.errors, ...transitValidation.errors];
    
    if (allErrors.length > 0) {
        showFormErrors('productForm', allErrors, {
            'productName': !nameValidation.isValid,
            'totalQty': !totalValidation.isValid,
            'transitQty': !transitValidation.isValid
        });
        return;
    }

    try {
        await saveProductAPI({
            name: nameValidation.value,
            total_qty: totalValidation.value,
            transit_qty: transitValidation.value
        }, id || null);
        
        closeForm();
        await renderProducts();
        
        try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        showAlert('✅ Сохранено!');
    } catch (e) {
        // Ошибка уже показана в apiRequest
    }
}

async function deleteProduct(id) {
    if (!confirm('Удалить этот товар?')) return;
    
    try {
        await deleteProductAPI(id);
        await renderProducts();
        showAlert('🗑️ Удалено');
    } catch (e) {
        // Ошибка уже показана
    }
}

function closeForm() {
    clearFormErrors('productForm');
    document.getElementById('productForm').classList.remove('active');
    document.activeElement.blur();
}

// ==================== БРОНИРОВАНИЯ ====================

let currentProductId = null;

async function loadReservations(productId) {
    return await apiRequest(`/products/${productId}/reservations`);
}

async function saveReservationAPI(reservationData) {
    return await apiRequest('/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData)
    });
}

async function deleteReservationAPI(reservationId) {
    return await apiRequest(`/reservations/${reservationId}`, {
        method: 'DELETE'
    });
}

async function showReservations(productId) {
    const products = await loadProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showAlert('Товар не найден');
        return;
    }
    
    currentProductId = productId;
    document.getElementById('reservationProductId').value = productId;
    document.getElementById('reservationProductName').textContent = product.name;
    document.getElementById('reservationTotalQty').textContent = calculateReservedQty(product);
    document.getElementById('reservationTitle').textContent = '🔒 Бронирования';
    
    await renderReservations(product);
    document.getElementById('reservationsModal').classList.add('active');
}

async function renderReservations(product) {
    const container = document.getElementById('reservationsList');
    if (!container) return;
    
    try {
        const reservations = await loadReservations(product.id);
        
        if (reservations.length === 0) {
            container.innerHTML = `
                <div class="empty-reservations">
                    <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
                    <div>Нет бронирований</div>
                    <small>Нажмите "Добавить бронь"</small>
                </div>
            `;
            return;
        }
        
        let totalReserved = 0;
        
        container.innerHTML = reservations.map((res, index) => {
            totalReserved += res.qty || 0;
            const linkDisplay = res.link ? `<a href="${escapeHtml(res.link)}" target="_blank" class="reservation-link">📱 ${escapeHtml(res.link)}</a>` : '<span style="color: #999;">Нет ссылки</span>';
            const commentDisplay = res.comment ? `<div class="reservation-comment">💬 ${escapeHtml(res.comment)}</div>` : '';
            
            return `
                <div class="reservation-item">
                    <div class="reservation-number">${index + 1}</div>
                    <div class="reservation-header">
                        <div class="reservation-client">${escapeHtml(res.client_name)}</div>
                        <div class="reservation-qty">${res.qty} шт.</div>
                    </div>
                    <div class="reservation-details">
                        <p>📅 ${res.date || 'Дата не указана'}</p>
                        <p>${linkDisplay}</p>
                        ${commentDisplay}
                    </div>
                    <div class="reservation-actions">
                        <button class="btn btn-primary" onclick="editReservation('${res.id}')">✏️ Изменить</button>
                        <button class="btn btn-danger" onclick="deleteReservation('${res.id}')">🗑️ Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
        
        const totalDiv = document.createElement('div');
        totalDiv.className = 'reservation-total';
        totalDiv.textContent = `📊 Итого: ${totalReserved} шт. в брони`;
        container.appendChild(totalDiv);
    } catch (e) {
        container.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

async function showAddReservation() {
    clearFormErrors('reservationForm');
    document.getElementById('reservationFormTitle').textContent = 'Добавить бронь';
    document.getElementById('reservationId').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientQty').value = 1;
    document.getElementById('reservationDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('clientLink').value = '';
    document.getElementById('clientComment').value = '';
    document.getElementById('reservationForm').classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('clientName');
        if (input) input.focus();
    }, 300);
}

async function editReservation(reservationId) {
    clearFormErrors('reservationForm');
    
    const reservations = await loadReservations(currentProductId);
    const reservation = reservations.find(r => r.id === reservationId);
    
    if (!reservation) {
        showAlert('Бронирование не найдено');
        return;
    }
    
    document.getElementById('reservationFormTitle').textContent = 'Изменить бронь';
    document.getElementById('reservationId').value = reservation.id;
    document.getElementById('clientName').value = reservation.client_name;
    document.getElementById('clientQty').value = reservation.qty;
    document.getElementById('reservationDate').value = reservation.date || '';
    document.getElementById('clientLink').value = reservation.link || '';
    document.getElementById('clientComment').value = reservation.comment || '';
    document.getElementById('reservationForm').classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('clientName');
        if (input) input.focus();
    }, 300);
}

async function saveReservation() {
    clearFormErrors('reservationForm');
    
    const reservationId = document.getElementById('reservationId').value;
    const clientName = document.getElementById('clientName').value.trim();
    const clientQty = document.getElementById('clientQty').value;
    const reservationDate = document.getElementById('reservationDate').value;
    const clientLink = document.getElementById('clientLink').value.trim();
    const clientComment = document.getElementById('clientComment').value.trim();
    
    const qtyValidation = validateNumber(clientQty, 'Количество', { min: 1, max: 10000, allowZero: false });
    const allErrors = [...qtyValidation.errors];
    
    if (!clientName) allErrors.unshift('Введите имя клиента');
    
    if (allErrors.length > 0) {
        showFormErrors('reservationForm', allErrors, {
            'clientName': !clientName,
            'clientQty': !qtyValidation.isValid
        });
        return;
    }
    
    if (!currentProductId) {
        allErrors.push('❌ Ошибка: товар не выбран!');
        showFormErrors('reservationForm', allErrors, {});
        return;
    }
    
    try {
        await saveReservationAPI({
            product_id: currentProductId,
            client_name: clientName,
            qty: qtyValidation.value,
            date: reservationDate,
            link: clientLink,
            comment: clientComment
        });
        
        closeReservationForm();
        await renderProducts();
        
        const products = await loadProducts();
        const product = products.find(p => p.id === currentProductId);
        if (product) {
            await renderReservations(product);
        }
        
        try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        showAlert('✅ Сохранено!');
    } catch (e) {
        // Ошибка уже показана
    }
}

async function deleteReservation(reservationId) {
    if (!confirm('Удалить это бронирование?')) return;
    
    try {
        await deleteReservationAPI(reservationId);
        await renderProducts();
        
        const products = await loadProducts();
        const product = products.find(p => p.id === currentProductId);
        if (product) {
            await renderReservations(product);
        }
        
        showAlert('🗑️ Удалено');
    } catch (e) {
        // Ошибка уже показана
    }
}

function closeReservationsModal() {
    clearFormErrors('reservationsModal');
    document.getElementById('reservationsModal').classList.remove('active');
    currentProductId = null;
    document.activeElement.blur();
}

function closeReservationForm() {
    clearFormErrors('reservationForm');
    document.getElementById('reservationForm').classList.remove('active');
    document.activeElement.blur();
}

// ==================== ПРОДАЖИ ====================

async function loadSales(month = null) {
    const params = month ? `?month=${month}` : '';
    return await apiRequest(`/sales${params}`);
}

async function saveSaleAPI(saleData) {
    return await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
    });
}

async function deleteSaleAPI(saleId) {
    return await apiRequest(`/sales/${saleId}`, {
        method: 'DELETE'
    });
}

async function showAddSale() {
    clearFormErrors('saleForm');
    document.getElementById('saleFormTitle').textContent = '💸 Добавить продажу';
    document.getElementById('saleId').value = '';
    document.getElementById('saleQty').value = 1;
    document.getElementById('salePrice').value = 0;
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('saleCustomer').value = '';
    document.getElementById('saleComment').value = '';
    await populateProductSelect('saleProduct');
    document.getElementById('saleForm').classList.add('active');
    calculateSaleTotal();
    setTimeout(() => {
        document.getElementById('saleProduct').focus();
    }, 300);
}

async function populateProductSelect(selectId, excludeId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const products = await loadProducts();
    select.innerHTML = '<option value="">Выберите товар...</option>';
    
    products.forEach(product => {
        if (product.id === excludeId) return;
        const free = (product.total_qty || 0) - (product.reserved_qty || 0);
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (свободно: ${free})`;
        option.dataset.free = free;
        option.dataset.total = product.total_qty || 0;
        select.appendChild(option);
    });
}

function updateSalePriceHint() {
    const select = document.getElementById('saleProduct');
    const hint = document.getElementById('saleProductHint');
    const selected = select.options[select.selectedIndex];
    if (!selected.value) { hint.textContent = ''; return; }
    const free = parseInt(selected.dataset.free) || 0;
    const total = parseInt(selected.dataset.total) || 0;
    hint.innerHTML = `<strong>Доступно:</strong> ${free} шт.<br><strong>Всего:</strong> ${total} шт.`;
}

function calculateSaleTotal() {
    const qty = parseInt(document.getElementById('saleQty').value) || 0;
    const price = parseFloat(document.getElementById('salePrice').value) || 0;
    document.getElementById('saleTotal').textContent = formatRubles(qty * price);
}

async function saveSale() {
    clearFormErrors('saleForm');
    
    const saleId = document.getElementById('saleId').value;
    const productId = document.getElementById('saleProduct').value;
    const qty = parseInt(document.getElementById('saleQty').value) || 0;
    const price = parseFloat(document.getElementById('salePrice').value) || 0;
    const saleDate = document.getElementById('saleDate').value;
    const customer = document.getElementById('saleCustomer').value.trim();
    const comment = document.getElementById('saleComment').value.trim();
    
    const allErrors = [];
    if (!productId) allErrors.push('Выберите товар');
    if (qty < 1) allErrors.push('Количество должно быть от 1');
    if (price < 0) allErrors.push('Цена не может быть отрицательной');
    
    if (productId) {
        const products = await loadProducts();
        const product = products.find(p => p.id === productId);
        if (product) {
            const free = (product.total_qty || 0) - (product.reserved_qty || 0);
            if (qty > free) {
                allErrors.push(`⚠️ Недостаточно товара! Свободно: ${free} шт.`);
            }
        }
    }
    
    if (allErrors.length > 0) {
        showFormErrors('saleForm', allErrors, { 'saleProduct': !productId, 'saleQty': qty < 1 });
        return;
    }
    
    try {
        await saveSaleAPI({
            product_id: productId,
            qty: qty,
            price: price,
            date: saleDate,
            customer: customer,
            comment: comment
        });
        
        closeSaleForm();
        await renderSales();
        await renderProducts();
        
        try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        showAlert('✅ Продажа сохранена!');
    } catch (e) {
        // Ошибка уже показана
    }
}

async function renderSales() {
    const container = document.getElementById('salesList');
    if (!container) return;
    
    try {
        const sales = await loadSales();
        const products = await loadProducts();
        
        if (sales.length === 0) {
            container.innerHTML = `<div class="empty-state">📭 Нет продаж</div>`;
            return;
        }
        
        const sorted = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sorted.map(sale => {
            const product = products.find(p => p.id === sale.product_id);
            return `
                <div class="finance-item">
                    <div class="finance-header">
                        <div class="finance-title">${escapeHtml(product ? product.name : '❌ Удалённый товар')}</div>
                        <div class="finance-amount income">+${formatRubles(sale.total)}</div>
                    </div>
                    <div class="finance-details">
                        <p>🔢 ${sale.qty} шт. × ${formatRubles(sale.price)}</p>
                        <p>📅 ${sale.date || 'Дата не указана'}</p>
                        ${sale.customer ? `<p>👤 ${escapeHtml(sale.customer)}</p>` : ''}
                    </div>
                    <div class="finance-actions">
                        <button class="btn btn-primary" onclick="editSale('${sale.id}')">✏️</button>
                        <button class="btn btn-danger" onclick="deleteSale('${sale.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

async function editSale(saleId) {
    clearFormErrors('saleForm');
    
    const sales = await loadSales();
    const sale = sales.find(s => s.id === saleId);
    
    if (!sale) {
        showAlert('Продажа не найдена');
        return;
    }
    
    document.getElementById('saleFormTitle').textContent = '✏️ Изменить продажу';
    document.getElementById('saleId').value = sale.id;
    document.getElementById('saleProduct').value = sale.product_id;
    document.getElementById('saleQty').value = sale.qty;
    document.getElementById('salePrice').value = sale.price;
    document.getElementById('saleDate').value = sale.date;
    document.getElementById('saleCustomer').value = sale.customer || '';
    document.getElementById('saleComment').value = sale.comment || '';
    
    await populateProductSelect('saleProduct', sale.product_id);
    updateSalePriceHint();
    calculateSaleTotal();
    document.getElementById('saleForm').classList.add('active');
}

async function deleteSale(saleId) {
    if (!confirm('Удалить эту продажу?')) return;
    
    try {
        await deleteSaleAPI(saleId);
        await renderSales();
        await renderProducts();
        showAlert('🗑️ Удалено');
    } catch (e) {
        // Ошибка уже показана
    }
}

function closeSaleForm() {
    clearFormErrors('saleForm');
    document.getElementById('saleForm').classList.remove('active');
    document.activeElement.blur();
}

// ==================== РАСХОДЫ ====================

async function loadExpenses(month = null) {
    const params = month ? `?month=${month}` : '';
    return await apiRequest(`/expenses${params}`);
}

async function saveExpenseAPI(expenseData) {
    return await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
    });
}

async function deleteExpenseAPI(expenseId) {
    return await apiRequest(`/expenses/${expenseId}`, {
        method: 'DELETE'
    });
}

async function showAddExpense() {
    clearFormErrors('expenseForm');
    document.getElementById('expenseFormTitle').textContent = '📉 Добавить расход';
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseAmount').value = 0;
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseCategory').value = 'other';
    await populateProductSelect('expenseProduct');
    document.getElementById('expenseForm').classList.add('active');
    setTimeout(() => {
        document.getElementById('expenseAmount').focus();
    }, 300);
}

async function saveExpense() {
    clearFormErrors('expenseForm');
    
    const expenseId = document.getElementById('expenseId').value;
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const expenseDate = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const productId = document.getElementById('expenseProduct').value || null;
    
    const allErrors = [];
    if (amount <= 0) allErrors.push('Сумма должна быть больше 0');
    if (!description) allErrors.push('Введите описание');
    
    if (allErrors.length > 0) {
        showFormErrors('expenseForm', allErrors, { 'expenseAmount': amount <= 0, 'expenseDescription': !description });
        return;
    }
    
    const categoryLabels = {
        logistics: '🚚 Логистика',
        storage: '📦 Хранение',
        marketing: '📢 Реклама',
        salary: '💼 Зарплаты',
        taxes: '🏛️ Налоги',
        other: '📦 Прочее'
    };
    
    try {
        await saveExpenseAPI({
            category: category,
            category_label: categoryLabels[category],
            amount: amount,
            date: expenseDate,
            description: description,
            product_id: productId
        });
        
        closeExpenseForm();
        await renderExpenses();
        
        try { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        showAlert('✅ Расход сохранён!');
    } catch (e) {
        // Ошибка уже показана
    }
}

async function renderExpenses() {
    const container = document.getElementById('expensesList');
    if (!container) return;
    
    try {
        const expenses = await loadExpenses();
        const products = await loadProducts();
        
        if (expenses.length === 0) {
            container.innerHTML = `<div class="empty-state">📭 Нет расходов</div>`;
            return;
        }
        
        const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sorted.map(expense => {
            const product = expense.product_id ? products.find(p => p.id === expense.product_id) : null;
            return `
                <div class="finance-item">
                    <div class="finance-header">
                        <div class="finance-title">${expense.category_label}</div>
                        <div class="finance-amount expense">-${formatRubles(expense.amount)}</div>
                    </div>
                    <div class="finance-details">
                        <p>📝 ${escapeHtml(expense.description)}</p>
                        <p>📅 ${expense.date || 'Дата не указана'}</p>
                        ${product ? `<p>📦 Привязано: ${escapeHtml(product.name)}</p>` : ''}
                    </div>
                    <div class="finance-actions">
                        <button class="btn btn-primary" onclick="editExpense('${expense.id}')">✏️</button>
                        <button class="btn btn-danger" onclick="deleteExpense('${expense.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

async function editExpense(expenseId) {
    clearFormErrors('expenseForm');
    
    const expenses = await loadExpenses();
    const expense = expenses.find(e => e.id === expenseId);
    
    if (!expense) {
        showAlert('Расход не найден');
        return;
    }
    
    document.getElementById('expenseFormTitle').textContent = '✏️ Изменить расход';
    document.getElementById('expenseId').value = expense.id;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('expenseDescription').value = expense.description;
    document.getElementById('expenseProduct').value = expense.product_id || '';
    
    await populateProductSelect('expenseProduct');
    document.getElementById('expenseForm').classList.add('active');
}

async function deleteExpense(expenseId) {
    if (!confirm('Удалить этот расход?')) return;
    
    try {
        await deleteExpenseAPI(expenseId);
        await renderExpenses();
        showAlert('🗑️ Удалено');
    } catch (e) {
        // Ошибка уже показана
    }
}

function closeExpenseForm() {
    clearFormErrors('expenseForm');
    document.getElementById('expenseForm').classList.remove('active');
    document.activeElement.blur();
}

// ==================== ОТЧЁТЫ ====================

let financeChart = null;

async function loadFinancialReport(month = null) {
    const params = month ? `?month=${month}` : '';
    return await apiRequest(`/reports/financial${params}`);
}

async function renderFinancialReport() {
    const monthFilter = document.getElementById('reportMonth').value;
    
    try {
        const report = await loadFinancialReport(monthFilter === 'all' ? null : monthFilter);
        const products = await loadProducts();
        
        document.getElementById('reportIncome').textContent = formatRubles(report.total_income);
        document.getElementById('reportExpenses').textContent = formatRubles(report.total_expenses);
        document.getElementById('reportProfit').textContent = formatRubles(report.profit);
        document.getElementById('reportProfit').style.color = report.profit >= 0 ? '#4CAF50' : '#f44336';
        document.getElementById('reportRoi').textContent = `${report.roi}%`;
        
        await renderReportDetails(monthFilter);
        await renderFinanceChart(monthFilter);
    } catch (e) {
        console.error('Error loading report:', e);
    }
}

async function renderReportDetails(monthFilter) {
    const container = document.getElementById('reportDetails');
    if (!container) return;
    
    try {
        const sales = await loadSales(monthFilter === 'all' ? null : monthFilter);
        const expenses = await loadExpenses(monthFilter === 'all' ? null : monthFilter);
        const products = await loadProducts();
        
        let html = '<h5>💸 Продажи</h5>';
        if (sales.length === 0) {
            html += '<div class="report-summary-item">Нет данных</div>';
        } else {
            sales.forEach(sale => {
                const product = products.find(p => p.id === sale.product_id);
                html += `<div class="report-summary-item"><span>${escapeHtml(product?.name || '❌')} × ${sale.qty}</span><span style="color: #4CAF50">+${formatRubles(sale.total)}</span></div>`;
            });
        }
        
        html += '<h5 style="margin-top: 16px">📉 Расходы</h5>';
        if (expenses.length === 0) {
            html += '<div class="report-summary-item">Нет данных</div>';
        } else {
            expenses.forEach(expense => {
                html += `<div class="report-summary-item"><span>${expense.category_label}: ${escapeHtml(expense.description)}</span><span style="color: #f44336">-${formatRubles(expense.amount)}</span></div>`;
            });
        }
        
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

async function renderFinanceChart(monthFilter) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;
    
    try {
        const sales = await loadSales(monthFilter === 'all' ? null : monthFilter);
        const expenses = await loadExpenses(monthFilter === 'all' ? null : monthFilter);
        
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        
        const allDates = [...new Set([...sales.map(s => s.date), ...expenses.map(e => e.date)].filter(d => d))].sort();
        
        allDates.forEach(date => {
            labels.push(date);
            incomeData.push(sales.filter(s => s.date === date).reduce((sum, s) => sum + s.total, 0));
            expenseData.push(expenses.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0));
        });
        
        if (financeChart) financeChart.destroy();
        
        financeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: '💸 Доходы', data: incomeData, backgroundColor: 'rgba(76, 175, 80, 0.7)', borderColor: '#4CAF50', borderWidth: 1 },
                    { label: '📉 Расходы', data: expenseData, backgroundColor: 'rgba(244, 67, 54, 0.7)', borderColor: '#f44336', borderWidth: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: false, ticks: { maxRotation: 45, minRotation: 45 } },
                    y: { beginAtZero: true, ticks: { callback: function(value) { return value.toLocaleString('ru-RU') + ' ₽'; } } }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.parsed.y.toLocaleString('ru-RU')} ₽`; } } }
                }
            }
        });
    } catch (e) {
        console.error('Error rendering chart:', e);
    }
}

async function populateMonthSelect() {
    const select = document.getElementById('reportMonth');
    if (!select) return;
    
    try {
        const sales = await loadSales();
        const expenses = await loadExpenses();
        
        const months = new Set();
        sales.forEach(s => { if (s.date) months.add(getMonthKey(s.date)); });
        expenses.forEach(e => { if (e.date) months.add(getMonthKey(e.date)); });
        
        const sortedMonths = [...months].sort().reverse();
        sortedMonths.forEach(month => {
            const [year, monthNum] = month.split('-');
            const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${monthNames[parseInt(monthNum)-1]} ${year}`;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Error populating months:', e);
    }
}

// ==================== ЭКСПОРТ В CSV ====================

async function exportToGoogleSheets() {
    try {
        const products = await loadProducts();
        const sales = await loadSales();
        const expenses = await loadExpenses();
        
        if (products.length === 0 && sales.length === 0 && expenses.length === 0) {
            showAlert('📭 Нет данных для экспорта');
            return;
        }
        
        exportProductsCSV(products);
        await exportReservationsCSV(products);
        exportSalesCSV(sales, products);
        exportExpensesCSV(expenses, products);
        
        showAlert('📥 4 файла скачаны!\n\nОткройте Google Sheets → Файл → Импорт → Загрузить файлы');
    } catch (e) {
        showAlert('❌ Ошибка экспорта');
    }
}

function exportProductsCSV(products) {
    const headers = ['ID', 'Название', 'Всего', 'Забронировано', 'В пути', 'Свободно', 'Дата создания'];
    const rows = products.map(p => {
        const reserved = p.reserved_qty || 0;
        const free = (p.total_qty || 0) - reserved;
        return [p.id, `"${(p.name || '').replace(/"/g, '""')}"`, p.total_qty || 0, reserved, p.transit_qty || 0, free, p.created_at ? p.created_at.split('T')[0] : ''];
    });
    downloadCSV('Products.csv', headers, rows);
}

async function exportReservationsCSV(products) {
    const headers = ['ID брони', 'Товар', 'Клиент', 'Количество', 'Дата', 'Ссылка', 'Комментарий'];
    const rows = [];
    
    for (const p of products) {
        try {
            const reservations = await loadReservations(p.id);
            reservations.forEach(r => {
                rows.push([r.id, `"${(p.name || '').replace(/"/g, '""')}"`, `"${(r.client_name || '').replace(/"/g, '""')}"`, r.qty || 0, r.date || '', r.link || '', `"${(r.comment || '').replace(/"/g, '""')}"`]);
            });
        } catch (e) {
            console.error('Error loading reservations for product:', p.id);
        }
    }
    
    downloadCSV('Reservations.csv', headers, rows);
}

function exportSalesCSV(sales, products) {
    const headers = ['ID продажи', 'Товар', 'Количество', 'Цена (₽)', 'Сумма (₽)', 'Дата', 'Покупатель', 'Комментарий'];
    const productsDict = {};
    products.forEach(p => { productsDict[p.id] = p.name; });
    const rows = sales.map(s => {
        const productName = productsDict[s.product_id] || '❌ Удалён';
        return [s.id, `"${productName.replace(/"/g, '""')}"`, s.qty || 0, s.price || 0, s.total || 0, s.date || '', `"${(s.customer || '').replace(/"/g, '""')}"`, `"${(s.comment || '').replace(/"/g, '""')}"`];
    });
    downloadCSV('Sales.csv', headers, rows);
}

function exportExpensesCSV(expenses, products) {
    const headers = ['ID расхода', 'Категория', 'Сумма (₽)', 'Дата', 'Описание', 'Товар', 'Дата создания'];
    const productsDict = {};
    products.forEach(p => { productsDict[p.id] = p.name; });
    const rows = expenses.map(e => {
        const productName = e.product_id ? (productsDict[e.product_id] || '❌ Удалён') : '—';
        return [e.id, `"${(e.category_label || '').replace(/"/g, '""')}"`, e.amount || 0, e.date || '', `"${(e.description || '').replace(/"/g, '""')}"`, `"${productName.replace(/"/g, '""')}"`, e.created_at ? e.created_at.split('T')[0] : ''];
    });
    downloadCSV('Expenses.csv', headers, rows);
}

function downloadCSV(filename, headers, rows) {
    const BOM = '\uFEFF';
    let csvContent = BOM + headers.join(';') + '\n' + rows.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==================== НАВИГАЦИЯ ====================

document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const tabName = tab.dataset.tab;
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        if (tabName === 'sales') await renderSales();
        if (tabName === 'expenses') await renderExpenses();
        if (tabName === 'reports') await renderFinancialReport();
    });
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', async () => {
    
    console.log('=== App initialized ===');
    await renderProducts();
    
    const actionsDiv = document.querySelector('.actions');
    if (actionsDiv) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-secondary';
        exportBtn.textContent = '📥 Экспорт в Sheets';
        exportBtn.onclick = exportToGoogleSheets;
        actionsDiv.appendChild(exportBtn);
    }
    
    await populateMonthSelect();
});

document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

window.showAddProduct = showAddProduct;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.closeForm = closeForm;
window.showReservations = showReservations;
window.showAddReservation = showAddReservation;
window.editReservation = editReservation;
window.saveReservation = saveReservation;
window.deleteReservation = deleteReservation;
window.closeReservationsModal = closeReservationsModal;
window.closeReservationForm = closeReservationForm;
window.refreshData = renderProducts;
window.clearFieldError = clearFieldError;
window.showAddSale = showAddSale;
window.saveSale = saveSale;
window.editSale = editSale;
window.deleteSale = deleteSale;
window.closeSaleForm = closeSaleForm;
window.renderSales = renderSales;
window.showAddExpense = showAddExpense;
window.saveExpense = saveExpense;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.closeExpenseForm = closeExpenseForm;
window.renderExpenses = renderExpenses;
window.renderFinancialReport = renderFinancialReport;
window.exportToGoogleSheets = exportToGoogleSheets;