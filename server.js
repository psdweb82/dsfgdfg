// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// ==================== Middleware ====================
// Чтобы body POST-запросов читались
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отдаём фронтенд файлы (index.html, main.js, styles.css)
app.use(express.static(path.join(__dirname, 'frontend')));

// ==================== Автоподключение функций ====================
const functionsPath = path.join(__dirname, 'netlify/functions');

fs.readdirSync(functionsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const route = '/' + file.replace('.js', '');
    const func = require(path.join(functionsPath, file));

    // Превращаем Netlify функцию в Express route
    app.all('/api' + route, async (req, res) => {
      try {
        const event = {
          body: req.body,
          queryStringParameters: req.query,
          headers: req.headers,
          httpMethod: req.method,
        };

        const result = await func.handler
          ? await func.handler(event) // если функция экспортирована через exports.handler
          : await func(event);        // если функция просто module.exports = async (event) => {}

        // Парсим body как JSON, если это строка
        let responseBody = null;
        if (result.body) {
          try {
            responseBody = JSON.parse(result.body);
          } catch (e) {
            responseBody = result.body; // если не JSON
          }
        }

        res.status(result.statusCode || 200).json(responseBody);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  }
});

// ==================== SPA fallback ====================
// Любой другой путь отдаём index.html (для SPA роутинга)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ==================== Запуск сервера ====================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
