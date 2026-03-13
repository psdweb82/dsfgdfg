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
    const { toUsername, amount } = JSON.parse(event.body);

    if (!toUsername || amount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Некорректные данные' }) };
    }

    const db = readDB();
    const senderIndex = db.users.findIndex(u => u.id === payload.sub);
    const recipientIndex = db.users.findIndex(u => u.username.toLowerCase() === toUsername.toLowerCase());

    if (senderIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    if (recipientIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Получатель не найден' }) };
    }

    const sender = db.users[senderIndex];
    const recipient = db.users[recipientIndex];

    if (sender.id === recipient.id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Нельзя отправить монеты себе' }) };
    }

    if (sender.coins < amount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Недостаточно монет' }) };
    }

    sender.coins -= amount;
    recipient.coins += amount;

    db.users[senderIndex] = sender;
    db.users[recipientIndex] = recipient;
    writeDB(db);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transferred: amount,
        to: recipient.username,
        newBalance: sender.coins
      })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
