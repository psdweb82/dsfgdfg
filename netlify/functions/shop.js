const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'sukunaW_secret_key_2026';
const DB_PATH = path.join(__dirname, '../../database/users.json');

const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const verifyToken = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
};

const SHOP_ITEMS = {
  custom_role: { price: 1000, name: 'Кастомная роль' },
  custom_gradient: { price: 2000, name: 'Градиент для роли' },
  create_clan: { price: 3000, name: 'Создание клана' },
  clan_category: { price: 4000, name: 'Категория клана' }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET - return shop items
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify(SHOP_ITEMS) };
  }

  // POST - purchase item
  const payload = verifyToken(event);
  if (!payload) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Требуется авторизация' }) };
  }

  try {
    const { itemType, itemName } = JSON.parse(event.body);

    if (!SHOP_ITEMS[itemType]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный тип товара' }) };
    }

    const item = SHOP_ITEMS[itemType];
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === payload.sub);

    if (userIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const user = db.users[userIndex];

    if (user.coins < item.price) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Недостаточно монет' }) };
    }

    // Handle specific purchases
    if (itemType === 'custom_role') {
      if (!itemName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Введите название роли' }) };
      user.roles = user.roles || [];
      user.roles.push(itemName);
    } else if (itemType === 'custom_gradient') {
      if (!itemName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Введите название градиента' }) };
      user.roleGradients = user.roleGradients || [];
      user.roleGradients.push(itemName);
    } else if (itemType === 'create_clan') {
      if (user.clan) return { statusCode: 400, headers, body: JSON.stringify({ error: 'У вас уже есть клан' }) };
      if (!itemName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Введите название клана' }) };
      user.clan = itemName;
    } else if (itemType === 'clan_category') {
      if (!user.clan) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Сначала создайте клан' }) };
      if (user.clanCategory) return { statusCode: 400, headers, body: JSON.stringify({ error: 'У вас уже есть категория' }) };
      user.clanCategory = true;
    }

    user.coins -= item.price;

    const now = new Date();
    const purchase = {
      item: item.name,
      itemName: itemName || null,
      price: item.price,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5)
    };
    user.purchaseHistory = user.purchaseHistory || [];
    user.purchaseHistory.push(purchase);

    db.users[userIndex] = user;
    writeDB(db);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, purchase, newBalance: user.coins })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
