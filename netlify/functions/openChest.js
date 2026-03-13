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

// Chest rewards
const CHEST_REWARDS = {
  common: { min: 10, max: 50 },
  rare: { min: 50, max: 150 },
  epic: { min: 150, max: 500 }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const payload = verifyToken(event);
  if (!payload) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Требуется авторизация' }) };
  }

  try {
    const { chestId } = JSON.parse(event.body);

    if (!chestId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID сундука не указан' }) };
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === payload.sub);

    if (userIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const user = db.users[userIndex];
    user.chests = user.chests || [];

    const chestIndex = user.chests.findIndex(c => c.id === chestId);
    if (chestIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Сундук не найден' }) };
    }

    const chest = user.chests[chestIndex];
    const reward = CHEST_REWARDS[chest.type] || CHEST_REWARDS.common;
    const coinsWon = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;

    user.coins += coinsWon;
    user.chests.splice(chestIndex, 1);

    db.users[userIndex] = user;
    writeDB(db);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        chestType: chest.type,
        coinsWon,
        newBalance: user.coins
      })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
