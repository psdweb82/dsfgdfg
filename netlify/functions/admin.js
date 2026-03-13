const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'sukunaW_secret_key_2026';
const DB_PATH = path.join(__dirname, '../../database/users.json');

// Creator credentials (only this user can manage admins)
const CREATOR_USERNAME = 'pseudotamine';
const CREATOR_PASSWORD_HASH = '$2a$10$Qa8954Wjf8I2b1dE3Egsy.jaEtOtqGJHEaYtk1C7PIdiYGW/uKUrm';

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const payload = verifyToken(event);
  if (!payload) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Требуется авторизация' }) };
  }

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === payload.sub);

  if (userIndex === -1) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
  }

  const user = db.users[userIndex];

  if (!user.isAdmin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Доступ запрещён' }) };
  }

  // Check if user is the creator (pseudotamine)
  const isCreator = user.username.toLowerCase() === CREATOR_USERNAME.toLowerCase();

  // GET - return all users
  if (event.httpMethod === 'GET') {
    const usersWithoutPasswords = db.users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ users: usersWithoutPasswords, isCreator }) 
    };
  }

  // POST - admin actions
  try {
    const body = JSON.parse(event.body);
    const { action, targetUsername, amount, creatorPassword, chestType } = body;

    // Action: Add coins (available to all admins)
    if (action === 'addCoins' || (!action && targetUsername && amount)) {
      const targetIndex = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());

      if (targetIndex === -1) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
      }

      if (amount <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Некорректная сумма' }) };
      }

      db.users[targetIndex].coins += amount;
      writeDB(db);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          action: 'addCoins',
          addedCoins: amount,
          toUser: db.users[targetIndex].username,
          newBalance: db.users[targetIndex].coins
        })
      };
    }

    // Find target user
    const targetIndex = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());

    if (targetIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const target = db.users[targetIndex];

    // BAN/UNBAN - available to ALL admins (but cannot ban creator)
    if (action === 'ban' || action === 'unban') {
      // Check if trying to ban the creator
      if (target.username.toLowerCase() === CREATOR_USERNAME.toLowerCase()) {
        return { 
          statusCode: 403, 
          headers, 
          body: JSON.stringify({ error: 'Не пытайтесь забанить создателя!' }) 
        };
      }

      if (action === 'ban') {
        if (target.isBanned) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Пользователь уже заблокирован' }) };
        }
        db.users[targetIndex].isBanned = true;
        writeDB(db);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            action: 'ban',
            targetUser: target.username,
            message: `${target.username} заблокирован`
          })
        };
      }

      if (action === 'unban') {
        if (!target.isBanned) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Пользователь не заблокирован' }) };
        }
        db.users[targetIndex].isBanned = false;
        writeDB(db);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            action: 'unban',
            targetUser: target.username,
            message: `${target.username} разблокирован`
          })
        };
      }
    }

    // SET/REMOVE ADMIN and GIVE CHEST - only for CREATOR with password verification
    if (['setAdmin', 'removeAdmin', 'giveChest'].includes(action)) {
      if (!isCreator) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Только создатель может выполнять это действие' }) };
      }

      // Verify creator password
      const validPassword = await bcrypt.compare(creatorPassword || '', CREATOR_PASSWORD_HASH);
      if (!validPassword) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Неверный пароль создателя' }) };
      }

      // Can't modify creator's admin status
      if (target.username.toLowerCase() === CREATOR_USERNAME.toLowerCase() && action !== 'giveChest') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Нельзя изменить статус создателя' }) };
      }

      switch (action) {
        case 'setAdmin':
          if (target.isAdmin) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Пользователь уже администратор' }) };
          }
          if (target.isBanned) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Нельзя назначить забаненного пользователя администратором' }) };
          }
          db.users[targetIndex].isAdmin = true;
          writeDB(db);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'setAdmin',
              targetUser: target.username,
              message: `${target.username} назначен администратором`
            })
          };

        case 'removeAdmin':
          if (!target.isAdmin) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Пользователь не является администратором' }) };
          }
          db.users[targetIndex].isAdmin = false;
          writeDB(db);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'removeAdmin',
              targetUser: target.username,
              message: `${target.username} больше не администратор`
            })
          };

        case 'giveChest':
          const type = chestType || 'common';
          if (!['common', 'rare', 'epic'].includes(type)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный тип сундука' }) };
          }
          db.users[targetIndex].chests = db.users[targetIndex].chests || [];
          db.users[targetIndex].chests.push({
            id: Date.now().toString(),
            type: type,
            droppedAt: new Date().toISOString()
          });
          writeDB(db);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              action: 'giveChest',
              targetUser: target.username,
              chestType: type,
              message: `Сундук (${type}) выдан ${target.username}`
            })
          };
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Некорректное действие' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка сервера' }) };
  }
};
