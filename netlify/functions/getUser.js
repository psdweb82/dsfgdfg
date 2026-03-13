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

const verifyToken = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const payload = verifyToken(event);
  if (!payload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Требуется авторизация' })
    };
  }

  const db = readDB();
  const user = db.users.find(u => u.id === payload.sub);

  if (!user) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Пользователь не найден' })
    };
  }

  const { passwordHash, ...userResponse } = user;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(userResponse)
  };
};
