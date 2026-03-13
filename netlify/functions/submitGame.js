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

const calculateLevel = (xp) => {
  let level = 1;
  let xpForNext = 100;
  let remainingXp = xp;
  while (remainingXp >= xpForNext && level < 100) {
    remainingXp -= xpForNext;
    level++;
    xpForNext = Math.floor(xpForNext * 1.15);
  }
  return level;
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
    const { score, timePlayedSeconds } = JSON.parse(event.body);

    // Anti-cheat validation
    const maxPossibleScore = timePlayedSeconds * 5;
    if (score > maxPossibleScore || score < 0 || timePlayedSeconds > 120) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Недопустимый результат игры' }) };
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === payload.sub);
    if (userIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const user = db.users[userIndex];
    const now = new Date();

    // Rate limiting: 10 seconds between games
    if (user.lastGameTime) {
      const lastTime = new Date(user.lastGameTime);
      if ((now - lastTime) < 10000) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Подождите перед следующей игрой' }) };
      }
    }

    // Calculate rewards
    const coinsEarned = Math.min(Math.floor(score / 10), 15);
    const xpEarned = Math.floor(score / 5) + timePlayedSeconds;

    // Random chest drop (10% chance if score > 30)
    let chestDropped = null;
    if (score > 30 && Math.random() < 0.1) {
      const chestTypes = ['common', 'rare', 'epic'];
      const weights = [0.7, 0.25, 0.05];
      const rand = Math.random();
      let cumulative = 0;
      let chestType = 'common';
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          chestType = chestTypes[i];
          break;
        }
      }
      chestDropped = {
        id: Date.now().toString(),
        type: chestType,
        droppedAt: now.toISOString()
      };
      user.chests = user.chests || [];
      user.chests.push(chestDropped);
    }

    user.coins += coinsEarned;
    user.xp += xpEarned;
    user.level = calculateLevel(user.xp);
    user.lastGameTime = now.toISOString();

    db.users[userIndex] = user;
    writeDB(db);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        coinsEarned,
        xpEarned,
        totalCoins: user.coins,
        totalXp: user.xp,
        level: user.level,
        chestDropped
      })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
