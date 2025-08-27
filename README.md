# Telegram Mini App (HTML/CSS/JS)

Простой пример мини‑приложения для Telegram на чистом HTML/CSS/JS.

## Что внутри
- `index.html` — разметка и подключение Telegram WebApp SDK
- `styles.css` — стили с поддержкой светлой/тёмной темы и параметров темы Telegram
- `main.js` — инициализация SDK, Main/Back кнопки, отправка данных, haptic feedback

## Локальный просмотр
```bash
cd /Users/victor/Desktop/Wallet_tg_app
python3 -m http.server 5173
```
Откройте: `http://localhost:5173`. В браузере часть функций будет в демо‑режиме.

## Деплой
### Вариант A — GitHub Pages
1. Создайте репозиторий на GitHub и загрузите файлы.
2. Settings → Pages → Deploy from branch → `main` (`/` root) → Save.
3. Дождитесь адреса вида `https://<username>.github.io/<repo>/`.

### Вариант B — Vercel
Веб‑интерфейс:
1. `https://vercel.com` → New Project → импортируйте репозиторий → Deploy.
2. Получите URL вида `https://<project>.vercel.app`.

CLI:
```bash
npm i -g vercel
cd /Users/victor/Desktop/Wallet_tg_app
vercel --prod
```

## Подключение к боту как Mini App
### Путь 1 — Mini App через @BotFather
1. Откройте `@BotFather` → команда `/newapp`.
2. Укажите название, URL деплоя (HTTPS), иконку, платформы.
3. (Опция) задайте короткое имя (Short name).
4. Команда `/connectapp` → выберите вашего бота → привяжите приложение.
5. Открывайте по ссылке `https://t.me/<bot_username>/<app_short_name>` или из меню бота.

Команды: `/myapps`, `/editapp`, `/deleteapp`.

### Путь 2 — Кнопка Web App в меню бота
1. В `@BotFather` → ваш бот → Bot Settings → Menu Button.
2. Выберите `Web App` и укажите название + URL деплоя.

## Что отправляет приложение боту
При действии пользователя вызывается `Telegram.WebApp.sendData(string)` со строкой JSON:
```json
{
  "type": "payment_request",
  "amount": 199,
  "currency": "RUB",
  "description": "За подписку",
  "ts": 1717171717171
}
```
На стороне бота придёт `web_app_data` (для кнопок клавиатуры) или данные от Mini App — распарсьте как JSON.

Полезно: [документация Web Apps](https://core.telegram.org/bots/webapps).
