// netlify/functions/register.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'sukunaW_secret_key_2026';
// Путь к users.json относительно текущей функции
const DB_PATH = path.join(__dirname, '..', '..', 'database', 'users.json');

// Helper для чтения базы
const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения базы:', error);
    return { users: [] };
  }
};

// Helper для записи в базу
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Ошибка записи базы:', error);
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Метод не разрешён' })
    };
  }

  try {
    // Если event.body уже объект (Express), оставляем как есть
    let bodyData = event.body;
    if (typeof bodyData === 'string') {
      bodyData = JSON.parse(bodyData);
    }

    const { username, password } = bodyData;

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Введите имя пользователя и пароль' })
      };
    }

    if (username.length < 3 || username.length > 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Имя пользователя должно быть от 3 до 20 символов' })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Пароль должен быть не менее 6 символов' })
      };
    }

    const db = readDB();

    // Проверка на существующего пользователя
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Это имя пользователя уже занято' })
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = {
      id: userId,
      username,
      passwordHash,
      coins: 0,
      level: 1,
      xp: 0,
      roles: [],
      roleGradients: [],
      clan: null,
      clanCategory: false,
      purchaseHistory: [],
      isAdmin: false,
      isBanned: false,
      lastGameTime: null,
      lastDailyBonus: null,
      lastWeeklyBonus: null,
      chests: [],
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign(
      { sub: userId, username, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userResponse } = newUser;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token, user: userResponse })
    };

  } catch (error) {
    console.error('Ошибка register.js:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ошибка сервера' })
    };
  }
};
