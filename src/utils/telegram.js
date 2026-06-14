// Тонкие обёртки над Telegram Bot API.
// parse_mode=HTML используется везде, где выводятся пользовательские данные
// (для безопасности плюс применяется escapeHtml в обработчиках).

export async function callTelegramApi(method, params, env) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API ${method} error:`, err);
    return { ok: false, description: err.message };
  }
}

export async function sendMessage(chatId, text, env, extra = {}) {
  return callTelegramApi(
    'sendMessage',
    {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra,
    },
    env
  );
}

export async function editMessageText(chatId, messageId, text, env, extra = {}) {
  return callTelegramApi(
    'editMessageText',
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...extra,
    },
    env
  );
}

export async function answerCallbackQuery(callbackQueryId, text, env, showAlert = false) {
  return callTelegramApi(
    'answerCallbackQuery',
    {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    },
    env
  );
}
