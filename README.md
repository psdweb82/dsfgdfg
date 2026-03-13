# ⛧ sukunaW - Игровая платформа

Игровая платформа с системой монет, мини-игрой, магазином и админ-панелью.

## 📁 Структура проекта

```
netlify-project/
├── database/
│   └── users.json          # База данных пользователей
├── frontend/
│   ├── index.html          # Главная страница
│   ├── main.js             # JavaScript логика
│   └── styles.css          # Стили
├── netlify/
│   └── functions/          # Серверлесс функции
│       ├── admin.js        # Админ-панель
│       ├── claimBonus.js   # Бонусы
│       ├── getUser.js      # Данные пользователя
│       ├── login.js        # Авторизация
│       ├── openChest.js    # Открытие сундуков
│       ├── register.js     # Регистрация
│       ├── shop.js         # Магазин
│       ├── submitGame.js   # Результаты игры
│       └── transfer.js     # Перевод монет
├── netlify.toml            # Конфигурация Netlify
├── package.json            # Зависимости
└── README.md
```

## 🚀 Деплой на Netlify

### Способ 1: Через GitHub (рекомендуется)

1. **Создайте репозиторий на GitHub**
   - Зайдите на https://github.com/new
   - Создайте новый репозиторий

2. **Загрузите файлы**
   ```bash
   cd netlify-project
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_ЛОГИН/sukunaw.git
   git push -u origin main
   ```

3. **Подключите к Netlify**
   - Зайдите на https://app.netlify.com
   - Нажмите "Add new site" → "Import an existing project"
   - Выберите GitHub → ваш репозиторий
   - Настройки:
     - **Build command:** оставьте пустым
     - **Publish directory:** `frontend`
   - Нажмите "Deploy site"

### Способ 2: Drag & Drop (самый простой)

1. Зайдите на https://app.netlify.com/drop
2. Перетащите папку `netlify-project` в браузер
3. Сайт автоматически задеплоится

### Способ 3: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
cd netlify-project
netlify deploy --prod
```

## ⚠️ ВАЖНО: База данных

JSON файл работает только для демонстрации. На Netlify файловая система read-only!

Для production используйте:
- MongoDB Atlas (бесплатно)
- Fauna DB (бесплатно)
- Supabase (бесплатно)

## 🔐 Учётные данные создателя

- **Логин:** `pseudotamine`
- **Пароль:** `synapthys5082_`

## 👑 Права доступа

### Создатель (pseudotamine):
- ✅ Назначать администраторов
- ✅ Снимать администраторов
- ✅ Банить/разбанивать пользователей
- ✅ Выдавать сундуки
- ✅ Добавлять монеты
- ❌ Его нельзя забанить

### Все администраторы:
- ✅ Банить пользователей
- ✅ Разбанивать пользователей
- ✅ Добавлять монеты
- ❌ НЕ могут забанить создателя
- ❌ НЕ могут назначать/снимать админов

## 🎮 Функционал

- ✅ Регистрация и авторизация
- ✅ Мини-игра "Dodge"
- ✅ Магазин (роли, градиенты, кланы)
- ✅ Перевод монет
- ✅ Ежедневные/еженедельные бонусы
- ✅ Система сундуков
- ✅ Система уровней (1-100)
- ✅ Админ-панель
- ✅ Бан/разбан (для всех админов)
- ✅ Назначение админов (только создатель)
