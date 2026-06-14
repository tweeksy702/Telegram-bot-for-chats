# Telegram Bot на Cloudflare Workers

Бот для координации участников игры в Telegram-группах.

## Возможности

- `/all` — позвать всех участников группы
- `/weather <город>` — текущая погода через Open-Meteo
- `/online` — список активированных участников
- Кнопка активации в личном чате

## Стек

- Cloudflare Workers (serverless)
- Cloudflare KV (хранилище данных)
- Open-Meteo API (погода, без ключа)
- Telegram Bot API

## Деплой

См. инструкцию в [`DEPLOY.md`](./DEPLOY.md) или README ниже.
