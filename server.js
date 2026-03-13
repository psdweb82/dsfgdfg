const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Чтобы body POST-запросов читались
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздаём фронтенд
app.use(express.static(path.join(__dirname, 'frontend')));

// -----------------------
// Подключаем функции как API
// -----------------------
const functionsPath = path.join(__dirname, 'netlify/functions');

fs.readdirSync(functionsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const route = '/' + file.replace('.js', '');
    const func = require(path.join(functionsPath, file));

    // Обычная функция Netlify выглядит так: (event, context) => { ... }
    // Превращаем её в express route
    app.all('/api' + route, async (req, res) => {
      try {
        // Если функция экспортирована как module.exports = async (event) => {...}
        const result = await func({
          body: req.body,
          queryStringParameters: req.query,
          headers: req.headers,
          httpMethod: req.method,
        });
        
        // Netlify functions возвращают { statusCode, body }
        res.status(result.statusCode || 200).send(
          result.body ? JSON.parse(result.body) : null
        );
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });
  }
});

// -----------------------
// Любой другой путь отдаём index.html (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// -----------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
