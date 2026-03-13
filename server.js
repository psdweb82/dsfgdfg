// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Чтобы body POST-запросов читались
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отдаём фронтенд файлы (index.html, main.js, styles.css)
app.use(express.static(path.join(__dirname, 'frontend')));

// -----------------------
// Подключаем все функции из netlify/functions как API
// -----------------------
const functionsPath = path.join(__dirname, 'netlify/functions');

fs.readdirSync(functionsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const route = '/' + file.replace('.js', '');
    const func = require(path.join(functionsPath, file));

    // Превращаем Netlify функцию в Express route
    app.all('/api' + route, async (req, res) => {
      try {
        // Подготовка event как у Netlify
        const event = {
          body: req.body,
          queryStringParameters: req.query,
          headers: req.headers,
          httpMethod: req.method,
        };

        const result = await func(event);

        // Netlify функции возвращают { statusCode, body }
        // Если body — JSON в строке, парсим, иначе отдаем как есть
        let responseBody = null;
        if (result.body) {
          try {
            responseBody = JSON.parse(result.body);
          } catch (e) {
            responseBody = result.body;
          }
        }

        res.status(result.statusCode || 200).send(responseBody);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });
  }
});

// -----------------------
// Резервные роуты для всех функций (чтобы можно было обращаться напрямую)
// -----------------------
const adminFn = require('./netlify/functions/admin');
const claimBonusFn = require('./netlify/functions/claimBonus');
const getUserFn = require('./netlify/functions/getUser');
const loginFn = require('./netlify/functions/login');
const openChestFn = require('./netlify/functions/openChest');
const registerFn = require('./netlify/functions/register');
const shopFn = require('./netlify/functions/shop');
const submitGameFn = require('./netlify/functions/submitGame');
const transferFn = require('./netlify/functions/transfer');

app.post('/admin', (req, res) => adminFn.handler(req, res));
app.post('/claimBonus', (req, res) => claimBonusFn.handler(req, res));
app.post('/getUser', (req, res) => getUserFn.handler(req, res));
app.post('/login', (req, res) => loginFn.handler(req, res));
app.post('/openChest', (req, res) => openChestFn.handler(req, res));
app.post('/register', (req, res) => registerFn.handler(req, res));
app.post('/shop', (req, res) => shopFn.handler(req, res));
app.post('/submitGame', (req, res) => submitGameFn.handler(req, res));
app.post('/transfer', (req, res) => transferFn.handler(req, res));

// -----------------------
// Любой другой путь отдаём index.html (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// -----------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
