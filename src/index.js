// Точка входа Cloudflare Worker.
// Принимает апдейты от Telegram на /webhook и содержит
// служебные GET-эндпоинты для настройки.

import { handleUpdate } from './router.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== Webhook от Telegram =====
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const update = await request.json();
        // Обрабатываем апдейт "в фоне", чтобы сразу вернуть 200 OK
        ctx.waitUntil(handleUpdate(update, env));
        return new Response('OK', { status: 200 });
      } catch (err) {
        console.error('Webhook parse error:', err);
        return new Response('Bad Request', { status: 400 });
      }
    }

    // ===== Служебные эндпоинты =====

    if (url.pathname === '/setwebhook' && request.method === 'GET') {
      const webhookUrl = `${url.protocol}//${url.host}/webhook`;
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query', 'my_chat_member'],
          }),
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/webhookinfo' && request.method === 'GET') {
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/deletewebhook' && request.method === 'GET') {
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`,
        { method: 'POST' }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/') {
      return new Response('✅ Telegram Bot Worker is running', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
