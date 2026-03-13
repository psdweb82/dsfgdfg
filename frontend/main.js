// ==================== CONFIGURATION ====================
const API_BASE = '/api';

// ==================== STATE ====================
let currentUser = null;
let token = localStorage.getItem('token');
let currentPage = 'login';
let isCreator = false;
let allUsers = [];

// Game state
let gameRunning = false;
let gameLoop = null;
let player = { x: 300, y: 350, size: 15 };
let enemies = [];
let score = 0;
let gameStartTime = 0;
let keys = { up: false, down: false, left: false, right: false };

// ==================== API HELPERS ====================
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}/${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }
  
  return data;
}

// ==================== AUTH ====================
async function login(username, password) {
  const data = await apiCall('login', 'POST', { username, password });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  return data;
}

async function register(username, password) {
  const data = await apiCall('register', 'POST', { username, password });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  return data;
}

async function loadUser() {
  if (!token) return null;
  try {
    currentUser = await apiCall('getUser');
    return currentUser;
  } catch (e) {
    logout();
    return null;
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  navigate('login');
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ==================== NAVIGATION ====================
function navigate(page) {
  currentPage = page;
  render();
  
  // Stop game if leaving game page
  if (page !== 'game' && gameRunning) {
    stopGame();
  }
}

// ==================== RENDER FUNCTIONS ====================
function render() {
  const app = document.getElementById('app');
  
  if (!currentUser && !['login', 'register'].includes(currentPage)) {
    currentPage = 'login';
  }
  
  switch (currentPage) {
    case 'login':
      app.innerHTML = renderLogin();
      break;
    case 'register':
      app.innerHTML = renderRegister();
      break;
    case 'dashboard':
      app.innerHTML = renderDashboard();
      initBonusTimers();
      break;
    case 'game':
      app.innerHTML = renderGame();
      initGameCanvas();
      break;
    case 'shop':
      app.innerHTML = renderShop();
      break;
    case 'transfer':
      app.innerHTML = renderTransfer();
      break;
    case 'profile':
      app.innerHTML = renderProfile();
      break;
    case 'admin':
      app.innerHTML = renderAdmin();
      loadAdminUsers();
      break;
  }
}

function renderNavbar() {
  const adminLink = currentUser?.isAdmin ? 
    `<a href="#" class="nav-link ${currentPage === 'admin' ? 'active' : ''}" onclick="navigate('admin'); return false;">🛡️ Админ</a>` : '';
  
  return `
    <nav class="navbar">
      <a href="#" class="nav-logo" onclick="navigate('dashboard'); return false;">⛧ sukunaW</a>
      <div class="nav-links">
        <a href="#" class="nav-link ${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard'); return false;">Главная</a>
        <a href="#" class="nav-link ${currentPage === 'game' ? 'active' : ''}" onclick="navigate('game'); return false;">🎮 Играть</a>
        <a href="#" class="nav-link ${currentPage === 'shop' ? 'active' : ''}" onclick="navigate('shop'); return false;">🛒 Магазин</a>
        <a href="#" class="nav-link ${currentPage === 'transfer' ? 'active' : ''}" onclick="navigate('transfer'); return false;">💸 Перевод</a>
        <a href="#" class="nav-link ${currentPage === 'profile' ? 'active' : ''}" onclick="navigate('profile'); return false;">👤 Профиль</a>
        ${adminLink}
      </div>
      <div class="nav-user">
        <div class="nav-level">УР <span>${currentUser?.level || 1}</span></div>
        <div class="nav-coins">
          <span class="coin-icon">◈</span>
          <span class="font-orbitron">${currentUser?.coins || 0}</span>
        </div>
        ${currentUser?.isAdmin ? '<span class="admin-badge">АДМИН</span>' : ''}
        <button class="logout-btn" onclick="logout()" title="Выйти">⏻</button>
      </div>
    </nav>
    
    <div class="mobile-nav">
      <div class="mobile-nav-links">
        <a href="#" class="mobile-nav-link ${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard'); return false;">
          <span>🏠</span>
          <span>Главная</span>
        </a>
        <a href="#" class="mobile-nav-link ${currentPage === 'game' ? 'active' : ''}" onclick="navigate('game'); return false;">
          <span>🎮</span>
          <span>Играть</span>
        </a>
        <a href="#" class="mobile-nav-link ${currentPage === 'shop' ? 'active' : ''}" onclick="navigate('shop'); return false;">
          <span>🛒</span>
          <span>Магазин</span>
        </a>
        <a href="#" class="mobile-nav-link ${currentPage === 'transfer' ? 'active' : ''}" onclick="navigate('transfer'); return false;">
          <span>💸</span>
          <span>Перевод</span>
        </a>
        <a href="#" class="mobile-nav-link ${currentPage === 'profile' ? 'active' : ''}" onclick="navigate('profile'); return false;">
          <span>👤</span>
          <span>Профиль</span>
        </a>
      </div>
    </div>
  `;
}

function renderLogin() {
  return `
    <div class="auth-container">
      <div class="auth-branding">
        <div class="auth-logo">⛧</div>
        <div class="auth-title">SUKUNA</div>
        <div class="auth-subtitle">ИГРОВАЯ ПЛАТФОРМА</div>
      </div>
      <div class="auth-form-container">
        <div class="auth-form animate-fade-in">
          <h2>ВХОД В СИСТЕМУ</h2>
          <p>Введите данные для продолжения</p>
          <form onsubmit="handleLogin(event)">
            <div class="form-group">
              <label class="label-text">Имя пользователя</label>
              <input type="text" class="input-field" id="loginUsername" placeholder="Введите имя" required>
            </div>
            <div class="form-group">
              <label class="label-text">Пароль</label>
              <input type="password" class="input-field" id="loginPassword" placeholder="Введите пароль" required>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" style="width: 100%;">ВОЙТИ</button>
            </div>
          </form>
          <div class="auth-switch">
            Нет аккаунта? <a href="#" onclick="navigate('register'); return false;">Создать</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRegister() {
  return `
    <div class="auth-container">
      <div class="auth-branding">
        <div class="auth-logo">⛧</div>
        <div class="auth-title">SUKUNA</div>
        <div class="auth-subtitle">ПРИСОЕДИНЯЙСЯ К НАМ</div>
      </div>
      <div class="auth-form-container">
        <div class="auth-form animate-fade-in">
          <h2>РЕГИСТРАЦИЯ</h2>
          <p>Создайте аккаунт для начала</p>
          <form onsubmit="handleRegister(event)">
            <div class="form-group">
              <label class="label-text">Имя пользователя</label>
              <input type="text" class="input-field" id="regUsername" placeholder="От 3 до 20 символов" required minlength="3" maxlength="20">
            </div>
            <div class="form-group">
              <label class="label-text">Пароль</label>
              <input type="password" class="input-field" id="regPassword" placeholder="Минимум 6 символов" required minlength="6">
            </div>
            <div class="form-group">
              <label class="label-text">Повторите пароль</label>
              <input type="password" class="input-field" id="regPasswordConfirm" placeholder="Повторите пароль" required>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" style="width: 100%;">СОЗДАТЬ АККАУНТ</button>
            </div>
          </form>
          <div class="auth-switch">
            Уже есть аккаунт? <a href="#" onclick="navigate('login'); return false;">Войти</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const xpProgress = getXpProgress();
  const chests = currentUser?.chests || [];
  
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <h1 class="font-orbitron mb-16 text-glow" style="font-size: 2rem; letter-spacing: 0.1em;">
          Добро пожаловать, ${currentUser?.username}
        </h1>
        <p class="text-muted mb-32">Ваш командный центр</p>
        
        <!-- Stats -->
        <div class="stats-grid">
          <div class="card stat-card animate-fade-in">
            <div class="stat-icon text-gold">◈</div>
            <div class="stat-label">Монеты</div>
            <div class="stat-value gold">${currentUser?.coins || 0}</div>
          </div>
          <div class="card stat-card animate-fade-in" style="animation-delay: 0.1s;">
            <div class="stat-icon">📊</div>
            <div class="stat-label">Уровень</div>
            <div class="stat-value">${currentUser?.level || 1}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${xpProgress.percentage}%;"></div>
            </div>
            <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">${xpProgress.current} / ${xpProgress.needed} XP</p>
          </div>
          <div class="card stat-card animate-fade-in" style="animation-delay: 0.15s;">
            <div class="stat-icon">🎖️</div>
            <div class="stat-label">Роли</div>
            <div class="stat-value">${currentUser?.roles?.length || 0}</div>
          </div>
          <div class="card stat-card animate-fade-in" style="animation-delay: 0.2s;">
            <div class="stat-icon">👥</div>
            <div class="stat-label">Клан</div>
            <div class="stat-value" style="font-size: 1.2rem;">${currentUser?.clan || 'Нет'}</div>
          </div>
        </div>
        
        <!-- Bonuses -->
        <div class="bonus-section">
          <h2 class="section-title">🎁 БОНУСЫ</h2>
          <div class="bonus-cards">
            <div class="card bonus-card animate-fade-in">
              <div class="bonus-icon">☀️</div>
              <div class="bonus-title">ЕЖЕДНЕВНЫЙ</div>
              <div class="bonus-amount">+50 ◈</div>
              <div class="bonus-timer" id="dailyTimer">Загрузка...</div>
              <button class="btn-secondary" id="dailyBtn" onclick="claimBonus('daily')">ЗАБРАТЬ</button>
            </div>
            <div class="card bonus-card animate-fade-in" style="animation-delay: 0.1s;">
              <div class="bonus-icon">🌟</div>
              <div class="bonus-title">ЕЖЕНЕДЕЛЬНЫЙ</div>
              <div class="bonus-amount">+300 ◈</div>
              <div class="bonus-timer" id="weeklyTimer">Загрузка...</div>
              <button class="btn-secondary" id="weeklyBtn" onclick="claimBonus('weekly')">ЗАБРАТЬ</button>
            </div>
          </div>
        </div>
        
        ${chests.length > 0 ? `
        <!-- Chests -->
        <div class="chests-section">
          <h2 class="section-title">📦 СУНДУКИ (${chests.length})</h2>
          <div class="chests-grid">
            ${chests.map(chest => `
              <div class="card chest-card" onclick="openChest('${chest.id}', '${chest.type}')">
                <div class="chest-icon">${getChestIcon(chest.type)}</div>
                <div class="chest-type ${chest.type}">${getChestName(chest.type)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Quick Actions -->
        <h2 class="section-title">⚡ БЫСТРЫЕ ДЕЙСТВИЯ</h2>
        <div class="quick-actions">
          <a href="#" class="card action-card" onclick="navigate('game'); return false;">
            <div class="action-icon">🎮</div>
            <div class="action-title">ИГРАТЬ</div>
            <div class="action-desc">Фармить монеты в Dodge</div>
          </a>
          <a href="#" class="card action-card" onclick="navigate('shop'); return false;">
            <div class="action-icon">🛒</div>
            <div class="action-title">МАГАЗИН</div>
            <div class="action-desc">Покупать роли и предметы</div>
          </a>
          <a href="#" class="card action-card" onclick="navigate('transfer'); return false;">
            <div class="action-icon">💸</div>
            <div class="action-title">ПЕРЕВОД</div>
            <div class="action-desc">Отправить монеты</div>
          </a>
          <a href="#" class="card action-card" onclick="navigate('profile'); return false;">
            <div class="action-icon">👤</div>
            <div class="action-title">ПРОФИЛЬ</div>
            <div class="action-desc">Ваша статистика</div>
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderGame() {
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <div class="game-container">
          <h1 class="font-orbitron mb-16" style="font-size: 1.75rem; letter-spacing: 0.1em;">🎮 DODGE АРЕНА</h1>
          <p class="text-muted mb-24">Уклоняйся от врагов и зарабатывай монеты</p>
          
          <div class="game-stats">
            <div class="card game-stat">
              <div class="stat-label">СЧЁТ</div>
              <div class="stat-value" id="currentScore">0</div>
            </div>
            <div class="card game-stat">
              <div class="stat-label">РЕКОРД</div>
              <div class="stat-value" id="highScore">0</div>
            </div>
            <div class="card game-stat">
              <div class="stat-label">МОНЕТЫ</div>
              <div class="stat-value gold" id="yourCoins">${currentUser?.coins || 0}</div>
            </div>
          </div>
          
          <div class="card game-canvas-wrapper">
            <canvas id="gameCanvas" width="600" height="400" tabindex="0"></canvas>
            <div class="game-overlay" id="gameOverlay">
              <h2 class="font-orbitron mb-16" id="overlayTitle">DODGE</h2>
              <p class="text-muted mb-24" id="overlayDesc">Уклоняйся от красных врагов</p>
              <div id="gameResult" class="hidden mb-24">
                <p class="text-gold font-orbitron" style="font-size: 1.5rem;">+<span id="coinsEarned">0</span> монет</p>
                <p class="text-muted">+<span id="xpEarned">0</span> XP</p>
                <p id="chestDropInfo" class="hidden" style="color: #A855F7; margin-top: 8px;">📦 Выпал сундук!</p>
              </div>
              <div class="game-controls">
                <button class="btn-primary" id="startBtn" onclick="startGame()">НАЧАТЬ ИГРУ</button>
              </div>
            </div>
          </div>
          
          <div class="card" style="margin-top: 24px;">
            <h3 class="font-orbitron mb-16" style="font-size: 0.9rem; letter-spacing: 0.1em;">🎯 УПРАВЛЕНИЕ</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; color: var(--text-muted); font-size: 0.9rem;">
              <div><strong>ПК:</strong> WASD или стрелки</div>
              <div><strong>Мобильный:</strong> Касание и перетаскивание</div>
            </div>
          </div>
          
          <div class="card" style="margin-top: 16px;">
            <h3 class="font-orbitron mb-16" style="font-size: 0.9rem; letter-spacing: 0.1em;">📋 ПРАВИЛА</h3>
            <ul style="color: var(--text-muted); font-size: 0.9rem; list-style: none;">
              <li style="margin-bottom: 8px;">• Управляй белым треугольником</li>
              <li style="margin-bottom: 8px;">• Уклоняйся от красных квадратов</li>
              <li style="margin-bottom: 8px;">• Каждый уворот = 1 очко</li>
              <li style="margin-bottom: 8px;">• Монеты = Очки ÷ 10 (макс 15)</li>
              <li>• Шанс выпадения сундука при счёте > 30</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderShop() {
  const items = [
    { key: 'custom_role', icon: '🎖️', name: 'Кастомная роль', desc: 'Создай свою уникальную роль', price: 1000, needsName: true },
    { key: 'custom_gradient', icon: '🎨', name: 'Градиент роли', desc: 'Добавь градиент к своей роли', price: 2000, needsName: true },
    { key: 'create_clan', icon: '👥', name: 'Создание клана', desc: 'Основай свой собственный клан', price: 3000, needsName: true, disabled: !!currentUser?.clan },
    { key: 'clan_category', icon: '📁', name: 'Категория клана', desc: 'Добавь категорию для клана', price: 4000, needsName: false, disabled: !currentUser?.clan || currentUser?.clanCategory }
  ];
  
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <h1 class="font-orbitron mb-16" style="font-size: 1.75rem; letter-spacing: 0.1em;">🛒 МАГАЗИН</h1>
        <p class="text-muted mb-16">Трать монеты на эксклюзивные предметы</p>
        <div class="nav-coins mb-32" style="display: inline-flex;">
          <span class="coin-icon">◈</span>
          <span class="font-orbitron">${currentUser?.coins || 0}</span>
          <span class="text-muted" style="margin-left: 8px;">доступно</span>
        </div>
        
        <div class="shop-grid">
          ${items.map(item => `
            <div class="card shop-item ${item.disabled ? 'disabled' : ''}" style="${item.disabled ? 'opacity: 0.5;' : ''}">
              <div class="shop-price">
                <span class="coin-icon">◈</span>
                <span>${item.price}</span>
              </div>
              <div class="shop-icon">${item.icon}</div>
              <div class="shop-name">${item.name}</div>
              <div class="shop-desc">${item.desc}</div>
              ${item.disabled ? 
                `<div class="text-muted" style="font-size: 0.85rem;">✕ ${item.key === 'create_clan' ? 'Уже есть клан' : 'Уже куплено'}</div>` :
                `<button class="btn-secondary" style="width: 100%;" 
                  ${(currentUser?.coins || 0) < item.price ? 'disabled' : ''}
                  onclick="purchaseItem('${item.key}', ${item.needsName}, '${item.name}')">
                  ${(currentUser?.coins || 0) < item.price ? 'НЕДОСТАТОЧНО МОНЕТ' : 'КУПИТЬ'}
                </button>`
              }
            </div>
          `).join('')}
        </div>
        
        <h2 class="section-title" style="margin-top: 48px;">📦 ВАШ ИНВЕНТАРЬ</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          <div class="card">
            <h3 class="font-orbitron mb-16" style="font-size: 0.85rem;">🎖️ РОЛИ (${currentUser?.roles?.length || 0})</h3>
            ${currentUser?.roles?.length > 0 ? 
              `<div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${currentUser.roles.map(r => `<span style="padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">${r}</span>`).join('')}
              </div>` :
              `<p class="text-muted">Пока нет ролей</p>`
            }
          </div>
          <div class="card">
            <h3 class="font-orbitron mb-16" style="font-size: 0.85rem;">🎨 ГРАДИЕНТЫ (${currentUser?.roleGradients?.length || 0})</h3>
            ${currentUser?.roleGradients?.length > 0 ? 
              `<div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${currentUser.roleGradients.map(g => `<span style="padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">${g}</span>`).join('')}
              </div>` :
              `<p class="text-muted">Пока нет градиентов</p>`
            }
          </div>
          <div class="card">
            <h3 class="font-orbitron mb-16" style="font-size: 0.85rem;">👥 КЛАН</h3>
            ${currentUser?.clan ? 
              `<p style="font-size: 1.1rem; margin-bottom: 8px;">${currentUser.clan}</p>
               <p class="text-muted">${currentUser.clanCategory ? '✓ Категория активна' : 'Без категории'}</p>` :
              `<p class="text-muted">Пока нет клана</p>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTransfer() {
  const maxAmount = currentUser?.coins || 0;
  
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <div class="transfer-container">
          <h1 class="font-orbitron mb-16" style="font-size: 1.75rem; letter-spacing: 0.1em;">💸 ПЕРЕВОД</h1>
          <p class="text-muted mb-32">Отправляй монеты другим игрокам</p>
          
          <div class="card transfer-balance">
            <div class="balance-info">
              <div class="label-text">Ваш баланс</div>
              <div class="balance-amount">
                <span class="text-gold">◈</span>
                ${currentUser?.coins || 0}
              </div>
            </div>
            <div class="balance-icon">◈</div>
          </div>
          
          <div class="card">
            <h2 class="font-orbitron mb-24" style="font-size: 1rem; letter-spacing: 0.1em;">ОТПРАВИТЬ МОНЕТЫ</h2>
            <form onsubmit="handleTransfer(event)">
              <div class="form-group">
                <label class="label-text">Получатель</label>
                <input type="text" class="input-field" id="transferRecipient" placeholder="Имя пользователя" required>
              </div>
              <div class="form-group">
                <label class="label-text">Сумма</label>
                <div class="input-with-icon">
                  <span class="input-icon">◈</span>
                  <input type="number" class="input-field" id="transferAmount" placeholder="0" min="1" max="${maxAmount}" required>
                </div>
                <p class="text-muted" style="font-size: 0.85rem; margin-top: 8px;">Максимум: ${maxAmount} монет</p>
              </div>
              <div class="quick-amounts">
                ${[100, 500, 1000].filter(v => v <= maxAmount).map(v => 
                  `<button type="button" class="quick-amount-btn" onclick="document.getElementById('transferAmount').value=${v}">◈ ${v}</button>`
                ).join('')}
                ${maxAmount > 0 ? `<button type="button" class="quick-amount-btn" onclick="document.getElementById('transferAmount').value=${Math.floor(maxAmount/2)}">◈ ${Math.floor(maxAmount/2)}</button>` : ''}
              </div>
              <div class="form-actions">
                <button type="submit" class="btn-primary" style="width: 100%;">ОТПРАВИТЬ</button>
              </div>
            </form>
          </div>
          
          <div class="card" style="margin-top: 24px;">
            <h3 class="font-orbitron mb-16" style="font-size: 0.85rem;">📋 ИНФОРМАЦИЯ</h3>
            <ul style="color: var(--text-muted); font-size: 0.9rem; list-style: none;">
              <li style="margin-bottom: 8px;">• Переводы мгновенные и необратимые</li>
              <li style="margin-bottom: 8px;">• Проверьте имя получателя</li>
              <li>• Минимальный перевод: 1 монета</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfile() {
  const xpProgress = getXpProgress();
  const purchases = currentUser?.purchaseHistory || [];
  
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <h1 class="font-orbitron mb-32" style="font-size: 1.75rem; letter-spacing: 0.1em;">👤 ПРОФИЛЬ</h1>
        
        <div class="card mb-32">
          <div class="profile-header">
            <div class="profile-avatar">👤</div>
            <div class="profile-info">
              <div class="profile-username">
                ${currentUser?.username}
                ${currentUser?.isAdmin ? '<span class="admin-badge" style="margin-left: 12px;">АДМИН</span>' : ''}
              </div>
              <div class="profile-stats">
                <div class="profile-stat">
                  <div class="stat-label">Уровень</div>
                  <div class="stat-value">${currentUser?.level || 1}</div>
                </div>
                <div class="profile-stat">
                  <div class="stat-label">Всего XP</div>
                  <div class="stat-value">${currentUser?.xp || 0}</div>
                </div>
                <div class="profile-stat">
                  <div class="stat-label">Монеты</div>
                  <div class="stat-value gold">${currentUser?.coins || 0}</div>
                </div>
                <div class="profile-stat">
                  <div class="stat-label">Покупки</div>
                  <div class="stat-value">${purchases.length}</div>
                </div>
              </div>
              <div style="margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="label-text">Прогресс до уровня ${Math.min((currentUser?.level || 1) + 1, 100)}</span>
                  <span class="text-muted" style="font-size: 0.75rem;">${xpProgress.current} / ${xpProgress.needed} XP</span>
                </div>
                <div class="progress-bar" style="height: 8px;">
                  <div class="progress-fill" style="width: ${xpProgress.percentage}%;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <h2 class="section-title">📜 ИСТОРИЯ ПОКУПОК</h2>
        <div class="card">
          ${purchases.length > 0 ? `
            <div class="purchase-history">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Предмет</th>
                    <th>Название</th>
                    <th>Цена</th>
                    <th>Дата</th>
                    <th>Время</th>
                  </tr>
                </thead>
                <tbody>
                  ${[...purchases].reverse().map(p => `
                    <tr>
                      <td>${p.item}</td>
                      <td class="text-muted">${p.itemName || '-'}</td>
                      <td class="text-gold">◈ ${p.price}</td>
                      <td class="text-muted">${p.date}</td>
                      <td class="text-muted">${p.time}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center" style="padding: 48px;">
              <div style="font-size: 3rem; margin-bottom: 16px;">🛒</div>
              <p class="text-muted">Пока нет покупок</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderAdmin() {
  if (!currentUser?.isAdmin) {
    navigate('dashboard');
    return '';
  }
  
  return `
    ${renderNavbar()}
    <div class="main-content">
      <div class="page-container">
        <div class="admin-header">
          <div class="admin-icon">🛡️</div>
          <div>
            <h1 class="font-orbitron" style="font-size: 1.75rem; letter-spacing: 0.1em;">ПАНЕЛЬ АДМИНИСТРАТОРА</h1>
            <p class="text-muted">Управление пользователями и монетами</p>
          </div>
        </div>
        
        <div class="card mb-32">
          <h2 class="font-orbitron mb-24" style="font-size: 1rem; letter-spacing: 0.1em;">➕ ДОБАВИТЬ МОНЕТЫ</h2>
          <form onsubmit="handleAdminAddCoins(event)">
            <div class="admin-form-grid">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="label-text">Имя пользователя</label>
                <input type="text" class="input-field" id="adminTargetUser" placeholder="Введите имя" required>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="label-text">Сумма</label>
                <div class="input-with-icon">
                  <span class="input-icon">◈</span>
                  <input type="number" class="input-field" id="adminCoinsAmount" placeholder="0" min="1" required>
                </div>
              </div>
              <button type="submit" class="btn-primary">ДОБАВИТЬ</button>
            </div>
          </form>
          <div class="quick-admin-btns">
            <p class="text-muted" style="width: 100%; margin-bottom: 8px; font-size: 0.85rem;">Быстро добавить себе:</p>
            ${[100, 500, 1000, 5000].map(v => 
              `<button class="quick-amount-btn" onclick="quickAddToSelf(${v})">+${v} мне</button>`
            ).join('')}
          </div>
        </div>
        
        <div id="creatorSection" class="card mb-32" style="display: none; border-color: rgba(168, 85, 247, 0.5);">
          <h2 class="font-orbitron mb-24" style="font-size: 1rem; letter-spacing: 0.1em; color: #A855F7;">👑 ПАНЕЛЬ СОЗДАТЕЛЯ</h2>
          <p class="text-muted mb-24">Только вы можете назначать и снимать администраторов</p>
          
          <div class="admin-form-grid mb-24">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="label-text">Имя пользователя</label>
              <input type="text" class="input-field" id="creatorTargetUser" placeholder="Введите имя">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="label-text">Тип сундука</label>
              <select class="input-field" id="chestTypeSelect">
                <option value="common">Обычный</option>
                <option value="rare">Редкий</option>
                <option value="epic">Эпический</option>
              </select>
            </div>
            <button class="btn-secondary" onclick="giveChestToUser(document.getElementById('creatorTargetUser').value, document.getElementById('chestTypeSelect').value)">ВЫДАТЬ СУНДУК</button>
          </div>
          
          <p class="text-muted" style="font-size: 0.85rem;">Используйте кнопки в таблице для назначения/снятия администраторов.</p>
        </div>
        
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 class="font-orbitron" style="font-size: 1rem; letter-spacing: 0.1em;">👥 ВСЕ ПОЛЬЗОВАТЕЛИ</h2>
            <button class="btn-secondary" onclick="loadAdminUsers()">🔄 ОБНОВИТЬ</button>
          </div>
          <p class="text-muted mb-16" style="font-size: 0.85rem;">Все администраторы могут банить/разбанивать пользователей (кроме создателя)</p>
          <div style="overflow-x: auto;">
            <table class="users-table" id="usersTable">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Уровень</th>
                  <th>Монеты</th>
                  <th>XP</th>
                  <th>Роли</th>
                  <th>Клан</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody id="usersTableBody">
                <tr><td colspan="7" class="text-center text-muted">Загрузка...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== EVENT HANDLERS ====================
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    await login(username, password);
    showToast('Добро пожаловать!');
    navigate('dashboard');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regPasswordConfirm').value;
  
  if (password !== confirm) {
    showToast('Пароли не совпадают', 'error');
    return;
  }
  
  try {
    await register(username, password);
    showToast('Аккаунт создан! Добро пожаловать!');
    navigate('dashboard');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleTransfer(e) {
  e.preventDefault();
  const toUsername = document.getElementById('transferRecipient').value;
  const amount = parseInt(document.getElementById('transferAmount').value);
  
  try {
    const result = await apiCall('transfer', 'POST', { toUsername, amount });
    showToast(`Переведено ${result.transferred} монет пользователю ${result.to}`);
    await loadUser();
    navigate('transfer');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleAdminAddCoins(e) {
  e.preventDefault();
  const targetUsername = document.getElementById('adminTargetUser').value;
  const amount = parseInt(document.getElementById('adminCoinsAmount').value);
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'addCoins', targetUsername, amount });
    showToast(`Добавлено ${result.addedCoins} монет пользователю ${result.toUser}`);
    await loadUser();
    loadAdminUsers();
    document.getElementById('adminTargetUser').value = '';
    document.getElementById('adminCoinsAmount').value = '';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function quickAddToSelf(amount) {
  try {
    const result = await apiCall('admin', 'POST', { action: 'addCoins', targetUsername: currentUser.username, amount });
    showToast(`Добавлено ${result.addedCoins} монет`);
    await loadUser();
    render();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Ban user - available to ALL admins
async function banUser(targetUsername) {
  if (!confirm(`Вы уверены, что хотите забанить пользователя ${targetUsername}?`)) {
    return;
  }
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'ban', targetUsername });
    showToast(result.message);
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Unban user - available to ALL admins
async function unbanUser(targetUsername) {
  if (!confirm(`Вы уверены, что хотите разбанить пользователя ${targetUsername}?`)) {
    return;
  }
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'unban', targetUsername });
    showToast(result.message);
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Set admin - ONLY for creator (pseudotamine)
async function setAdmin(targetUsername) {
  if (!confirm(`Вы уверены, что хотите назначить ${targetUsername} администратором?`)) {
    return;
  }
  
  const creatorPassword = prompt('Введите пароль создателя:');
  if (!creatorPassword) return;
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'setAdmin', targetUsername, creatorPassword });
    showToast(result.message);
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Remove admin - ONLY for creator (pseudotamine)
async function removeAdmin(targetUsername) {
  if (!confirm(`Вы уверены, что хотите снять ${targetUsername} с поста администратора?`)) {
    return;
  }
  
  const creatorPassword = prompt('Введите пароль создателя:');
  if (!creatorPassword) return;
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'removeAdmin', targetUsername, creatorPassword });
    showToast(result.message);
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Give chest - ONLY for creator (pseudotamine)
async function giveChestToUser(targetUsername, chestType) {
  const creatorPassword = prompt('Введите пароль создателя:');
  if (!creatorPassword) return;
  
  try {
    const result = await apiCall('admin', 'POST', { action: 'giveChest', targetUsername, chestType, creatorPassword });
    showToast(result.message);
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadAdminUsers() {
  try {
    const data = await apiCall('admin', 'GET');
    allUsers = data.users || [];
    isCreator = data.isCreator || false;
    
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = allUsers.map(u => {
      const isUserCreator = u.username.toLowerCase() === 'pseudotamine';
      return `
        <tr>
          <td>
            ${u.username}
            ${isUserCreator ? '<span class="creator-badge" style="margin-left: 8px;">СОЗДАТЕЛЬ</span>' : ''}
            ${u.isAdmin && !isUserCreator ? '<span class="admin-badge" style="margin-left: 8px;">АДМИН</span>' : ''}
            ${u.isBanned ? '<span class="ban-badge" style="margin-left: 8px;">ЗАБАНЕН</span>' : ''}
          </td>
          <td>${u.level}</td>
          <td class="text-gold">◈ ${u.coins}</td>
          <td class="text-muted">${u.xp}</td>
          <td class="text-muted">${u.roles?.length || 0}</td>
          <td class="text-muted">${u.clan || '-'}</td>
          <td>
            <div class="action-buttons">
              ${!isUserCreator ? `
                ${!u.isBanned ? `
                  <button class="btn-small btn-danger" onclick="banUser('${u.username}')">Бан</button>
                ` : `
                  <button class="btn-small btn-success" onclick="unbanUser('${u.username}')">Разбан</button>
                `}
                ${isCreator ? `
                  ${u.isAdmin ? 
                    `<button class="btn-small btn-warning" onclick="removeAdmin('${u.username}')">Снять админа</button>` :
                    `<button class="btn-small btn-success" onclick="setAdmin('${u.username}')">Назначить админом</button>`
                  }
                ` : ''}
              ` : '<span class="text-muted">—</span>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    // Update creator section visibility
    const creatorSection = document.getElementById('creatorSection');
    if (creatorSection) {
      creatorSection.style.display = isCreator ? 'block' : 'none';
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function purchaseItem(itemType, needsName, itemLabel) {
  let itemName = null;
  
  if (needsName) {
    itemName = prompt(`Введите название для "${itemLabel}":`);
    if (!itemName) return;
  }
  
  try {
    const result = await apiCall('shop', 'POST', { itemType, itemName });
    showToast(`Куплено: ${result.purchase.item}!`);
    await loadUser();
    navigate('shop');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function claimBonus(bonusType) {
  try {
    const result = await apiCall('claimBonus', 'POST', { bonusType });
    showToast(`+${result.amount} монет!`);
    await loadUser();
    navigate('dashboard');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==================== BONUS TIMERS ====================
function initBonusTimers() {
  updateBonusTimer('daily', currentUser?.lastDailyBonus, 24);
  updateBonusTimer('weekly', currentUser?.lastWeeklyBonus, 168);
}

function updateBonusTimer(type, lastClaim, hoursRequired) {
  const timerEl = document.getElementById(`${type}Timer`);
  const btnEl = document.getElementById(`${type}Btn`);
  if (!timerEl || !btnEl) return;
  
  if (!lastClaim) {
    timerEl.textContent = 'Доступен сейчас!';
    btnEl.disabled = false;
    return;
  }
  
  const lastTime = new Date(lastClaim);
  const now = new Date();
  const hoursSince = (now - lastTime) / (1000 * 60 * 60);
  
  if (hoursSince >= hoursRequired) {
    timerEl.textContent = 'Доступен сейчас!';
    btnEl.disabled = false;
  } else {
    const hoursLeft = Math.ceil(hoursRequired - hoursSince);
    if (hoursLeft >= 24) {
      timerEl.textContent = `Доступен через ${Math.ceil(hoursLeft / 24)} дн.`;
    } else {
      timerEl.textContent = `Доступен через ${hoursLeft} ч.`;
    }
    btnEl.disabled = true;
  }
}

// ==================== CHESTS ====================
function getChestIcon(type) {
  switch(type) {
    case 'epic': return '💎';
    case 'rare': return '🎁';
    default: return '📦';
  }
}

function getChestName(type) {
  switch(type) {
    case 'epic': return 'ЭПИЧЕСКИЙ';
    case 'rare': return 'РЕДКИЙ';
    default: return 'ОБЫЧНЫЙ';
  }
}

async function openChest(chestId, chestType) {
  const modal = document.getElementById('chestModal');
  const opening = document.getElementById('chestOpening');
  const result = document.getElementById('chestResult');
  
  modal.classList.add('active');
  opening.style.display = 'block';
  result.classList.remove('show');
  opening.textContent = getChestIcon(chestType);
  
  try {
    const data = await apiCall('openChest', 'POST', { chestId });
    
    setTimeout(() => {
      opening.style.display = 'none';
      result.classList.add('show');
      document.getElementById('rewardAmount').textContent = `+${data.coinsWon}`;
      currentUser.coins = data.newBalance;
      currentUser.chests = currentUser.chests.filter(c => c.id !== chestId);
    }, 1500);
    
  } catch (error) {
    modal.classList.remove('active');
    showToast(error.message, 'error');
  }
}

function closeChestModal() {
  document.getElementById('chestModal').classList.remove('active');
  navigate('dashboard');
}

// ==================== XP HELPERS ====================
function getXpProgress() {
  let level = 1;
  let xpForNext = 100;
  let remainingXp = currentUser?.xp || 0;
  
  while (level < (currentUser?.level || 1) && level < 100) {
    remainingXp -= xpForNext;
    level++;
    xpForNext = Math.floor(xpForNext * 1.15);
  }
  
  return {
    current: Math.max(0, remainingXp),
    needed: xpForNext,
    percentage: Math.min((remainingXp / xpForNext) * 100, 100)
  };
}

// ==================== GAME LOGIC ====================
function initGameCanvas() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  canvas.focus();
  
  // Keyboard events
  document.addEventListener('keydown', handleGameKeyDown);
  document.addEventListener('keyup', handleGameKeyUp);
  
  // Touch events
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  
  // Draw initial state
  drawGameIdle();
}

function handleGameKeyDown(e) {
  if (!gameRunning) return;
  
  switch(e.key.toLowerCase()) {
    case 'arrowup': case 'w': keys.up = true; e.preventDefault(); break;
    case 'arrowdown': case 's': keys.down = true; e.preventDefault(); break;
    case 'arrowleft': case 'a': keys.left = true; e.preventDefault(); break;
    case 'arrowright': case 'd': keys.right = true; e.preventDefault(); break;
  }
}

function handleGameKeyUp(e) {
  switch(e.key.toLowerCase()) {
    case 'arrowup': case 'w': keys.up = false; break;
    case 'arrowdown': case 's': keys.down = false; break;
    case 'arrowleft': case 'a': keys.left = false; break;
    case 'arrowright': case 'd': keys.right = false; break;
  }
}

let touchPos = { x: null, y: null };

function handleTouchStart(e) {
  if (!gameRunning) return;
  e.preventDefault();
  const touch = e.touches[0];
  const canvas = document.getElementById('gameCanvas');
  const rect = canvas.getBoundingClientRect();
  touchPos.x = (touch.clientX - rect.left) * (600 / rect.width);
  touchPos.y = (touch.clientY - rect.top) * (400 / rect.height);
}

function handleTouchMove(e) {
  if (!gameRunning) return;
  e.preventDefault();
  const touch = e.touches[0];
  const canvas = document.getElementById('gameCanvas');
  const rect = canvas.getBoundingClientRect();
  touchPos.x = (touch.clientX - rect.left) * (600 / rect.width);
  touchPos.y = (touch.clientY - rect.top) * (400 / rect.height);
}

function handleTouchEnd() {
  touchPos.x = null;
  touchPos.y = null;
}

function drawGameIdle() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 600, 400);
  
  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 600; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 400);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(600, i);
    ctx.stroke();
  }
}

function startGame() {
  gameRunning = true;
  player = { x: 300, y: 350, size: 15 };
  enemies = [];
  score = 0;
  gameStartTime = Date.now();
  keys = { up: false, down: false, left: false, right: false };
  
  document.getElementById('gameOverlay').classList.add('hidden');
  document.getElementById('gameResult').classList.add('hidden');
  document.getElementById('currentScore').textContent = '0';
  
  // Start spawning enemies
  const spawnInterval = setInterval(() => {
    if (!gameRunning) {
      clearInterval(spawnInterval);
      return;
    }
    spawnEnemy();
  }, 1500);
  
  // Game loop
  gameLoop = requestAnimationFrame(function loop() {
    if (!gameRunning) return;
    
    updateGame();
    drawGame();
    
    if (checkCollision()) {
      endGame();
    } else {
      gameLoop = requestAnimationFrame(loop);
    }
  });
}

function spawnEnemy() {
  const difficultyMultiplier = 1 + (score / 50) * 0.1;
  enemies.push({
    x: Math.random() * 540 + 30,
    y: -20,
    size: 20 + Math.random() * 15,
    speed: (2 + Math.random()) * difficultyMultiplier
  });
}

function updateGame() {
  const speed = 5;
  
  // Keyboard movement
  if (keys.up && player.y > player.size) player.y -= speed;
  if (keys.down && player.y < 400 - player.size) player.y += speed;
  if (keys.left && player.x > player.size) player.x -= speed;
  if (keys.right && player.x < 600 - player.size) player.x += speed;
  
  // Touch movement
  if (touchPos.x !== null && touchPos.y !== null) {
    const dx = touchPos.x - player.x;
    const dy = touchPos.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      player.x += (dx / dist) * speed;
      player.y += (dy / dist) * speed;
    }
  }
  
  // Update enemies
  enemies = enemies.filter(enemy => {
    enemy.y += enemy.speed;
    
    if (enemy.y > 400 + enemy.size) {
      score++;
      document.getElementById('currentScore').textContent = score;
      return false;
    }
    return true;
  });
}

function drawGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 600, 400);
  
  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 600; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 400);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(600, i);
    ctx.stroke();
  }
  
  // Enemies
  enemies.forEach(enemy => {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 10;
    ctx.fillRect(enemy.x - enemy.size/2, enemy.y - enemy.size/2, enemy.size, enemy.size);
  });
  
  // Player (triangle)
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.size);
  ctx.lineTo(player.x - player.size, player.y + player.size);
  ctx.lineTo(player.x + player.size, player.y + player.size);
  ctx.closePath();
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // HUD
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Orbitron';
  ctx.textAlign = 'left';
  ctx.fillText(`СЧЁТ: ${score}`, 20, 30);
  
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  ctx.textAlign = 'right';
  ctx.fillText(`ВРЕМЯ: ${elapsed}с`, 580, 30);
}

function checkCollision() {
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < (player.size + enemy.size) / 2) {
      return true;
    }
  }
  return false;
}

async function endGame() {
  gameRunning = false;
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  
  const timePlayedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
  
  // Update high score locally
  const highScoreEl = document.getElementById('highScore');
  const currentHigh = parseInt(highScoreEl.textContent) || 0;
  if (score > currentHigh) {
    highScoreEl.textContent = score;
  }
  
  // Show overlay
  const overlay = document.getElementById('gameOverlay');
  const title = document.getElementById('overlayTitle');
  const desc = document.getElementById('overlayDesc');
  const result = document.getElementById('gameResult');
  const startBtn = document.getElementById('startBtn');
  
  overlay.classList.remove('hidden');
  title.textContent = 'ИГРА ОКОНЧЕНА';
  desc.textContent = `Финальный счёт: ${score}`;
  startBtn.textContent = 'ИГРАТЬ СНОВА';
  
  // Submit score
  try {
    const data = await apiCall('submitGame', 'POST', { score, timePlayedSeconds });
    
    document.getElementById('coinsEarned').textContent = data.coinsEarned;
    document.getElementById('xpEarned').textContent = data.xpEarned;
    document.getElementById('yourCoins').textContent = data.totalCoins;
    
    const chestInfo = document.getElementById('chestDropInfo');
    if (data.chestDropped) {
      chestInfo.classList.remove('hidden');
      currentUser.chests = currentUser.chests || [];
      currentUser.chests.push(data.chestDropped);
    } else {
      chestInfo.classList.add('hidden');
    }
    
    result.classList.remove('hidden');
    
    currentUser.coins = data.totalCoins;
    currentUser.xp = data.totalXp;
    currentUser.level = data.level;
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function stopGame() {
  gameRunning = false;
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  document.removeEventListener('keydown', handleGameKeyDown);
  document.removeEventListener('keyup', handleGameKeyUp);
}

// ==================== INITIALIZATION ====================
async function init() {
  if (token) {
    const user = await loadUser();
    if (user) {
      currentPage = 'dashboard';
    }
  }
  render();
}

// Start app
init();
