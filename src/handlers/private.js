// Обработка сообщений в личном чате с ботом и нажатий inline-кнопок.

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
} from '../utils/telegram.js';
import {
  getUser,
  setUser,
  addOnlineUser,
  removeOnlineUser,
  getOnlineUsers,
} from '../utils/storage.js';
import { getWeather } from './weather.js';

export async function handlePrivateMessage(message, env) {
  const userId = message.from.id;
  const text = message.text || '';

  // /start — приветствие и кнопка активации
  if (text.startsWith('/start')) {
    await sendMessage(
      message.chat.id,
      '👋 <b>Привет!</b>\n\n' +
        'Я бот для координации участников игры. Чтобы вас видели в списке онлайн, ' +
        'нажмите кнопку ниже для активации.',
      env,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Активироваться', callback_data: 'activate' }],
          ],
        },
      }
    );
    return;
  }

  // /online — список онлайн-участников
  if (text === '/online' || text.startsWith('/online@')) {
    await showOnlineList(message.chat.id, env);
    return;
  }

  // /offline — выйти из игры
  if (text === '/offline' || text.startsWith('/offline@')) {
    await removeOnlineUser(userId, env);
    await sendMessage(
      message.chat.id,
      '❌ Вы вышли из игры. Вас больше не видно в списке онлайн.',
      env,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟢 Снова активироваться', callback_data: 'activate' }],
          ],
        },
      }
    );
    return;
  }

  // /weather <город>
  if (text.startsWith('/weather')) {
    const city = text.replace(/^\/weather(@\w+)?\s*/, '').trim();
    if (!city) {
      await sendMessage(
        message.chat.id,
        '⚠️ Укажите город: <code>/weather Москва</code>',
        env
      );
    } else {
      const w = await getWeather(city, env);
      await sendMessage(message.chat.id, w, env);
    }
    return;
  }

  // /help
  if (text === '/help' || text.startsWith('/help@')) {
    await sendMessage(
      message.chat.id,
      '📋 <b>Команды в личном чате:</b>\n\n' +
        '/start — приветствие и активация\n' +
        '/online — список онлайн-участников\n' +
        '/offline — выйти из игры\n' +
        '/weather &lt;город&gt; — погода\n' +
        '/help — эта справка',
      env
    );
    return;
  }
}

// ===== Inline-кнопки =====
export async function handleCallbackQuery(callbackQuery, env) {
  const data = callbackQuery.data;
  const user = callbackQuery.from;
  const userId = user.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  if (data === 'activate') {
    // Сохраняем профиль
    await setUser(
      userId,
      {
        id: userId,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
      },
      env
    );
    // Помечаем как онлайн
    await addOnlineUser(userId, env);

    await answerCallbackQuery(callbackQuery.id, 'Вы в игре!', env);

    // Меняем исходное сообщение и показываем "УСПЕХ"
    await editMessageText(
      chatId,
      messageId,
      '✅ <b>Статус: УСПЕХ</b>\n\n' +
        'Вы активированы и видны в списке онлайн-участников.',
      env,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Выйти из игры', callback_data: 'deactivate' }],
          ],
        },
      }
    );
    return;
  }

  if (data === 'deactivate') {
    await removeOnlineUser(userId, env);
    await answerCallbackQuery(callbackQuery.id, 'Вы вышли из игры', env);
    await editMessageText(
      chatId,
      messageId,
      '❌ Вы вышли из игры. Вас больше не видно в списке онлайн.',
      env,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟢 Снова активироваться', callback_data: 'activate' }],
          ],
        },
      }
    );
    return;
  }
}

// ===== Помощник: вывод списка онлайн =====
async function showOnlineList(chatId, env) {
  const onlineIds = await getOnlineUsers(env);

  if (onlineIds.length === 0) {
    await sendMessage(
      chatId,
      '😔 Сейчас никто не активирован.\n\n' +
        'Попросите участников зайти в личный чат с ботом и нажать /start.',
      env
    );
    return;
  }

  const lines = [];
  for (const id of onlineIds) {
    const u = await getUser(id, env);
    if (u) {
      const name = u.username
        ? '@' + u.username
        : u.first_name + (u.last_name ? ' ' + u.last_name : '');
      lines.push('• ' + escapeHtml(name));
    }
  }

  await sendMessage(
    chatId,
    `🟢 <b>Онлайн (${onlineIds.length}):</b>\n\n${lines.join('\n')}`,
    env
  );
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}
