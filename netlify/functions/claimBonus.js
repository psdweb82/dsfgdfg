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

// Bonus amounts
const DAILY_BONUS = 50;
const WEEKLY_BONUS = 300;

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
    const { bonusType } = JSON.parse(event.body);

    if (!['daily', 'weekly'].includes(bonusType)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный тип бонуса' }) };
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === payload.sub);

    if (userIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const user = db.users[userIndex];
    const now = new Date();

    if (bonusType === 'daily') {
      if (user.lastDailyBonus) {
        const lastClaim = new Date(user.lastDailyBonus);
        const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const hoursLeft = Math.ceil(24 - hoursSince);
          return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ error: `Ежедневный бонус доступен через ${hoursLeft} ч.` }) 
          };
        }
      }
      user.coins += DAILY_BONUS;
      user.lastDailyBonus = now.toISOString();

      db.users[userIndex] = user;
      writeDB(db);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          bonusType: 'daily',
          amount: DAILY_BONUS,
          newBalance: user.coins
        })
      };
    }

    if (bonusType === 'weekly') {
      if (user.lastWeeklyBonus) {
        const lastClaim = new Date(user.lastWeeklyBonus);
        const daysSince = (now - lastClaim) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          const daysLeft = Math.ceil(7 - daysSince);
          return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ error: `Еженедельный бонус доступен через ${daysLeft} дн.` }) 
          };
        }
      }
      user.coins += WEEKLY_BONUS;
      user.lastWeeklyBonus = now.toISOString();

      db.users[userIndex] = user;
      writeDB(db);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          bonusType: 'weekly',
          amount: WEEKLY_BONUS,
          newBalance: user.coins
        })
      };
    }

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
