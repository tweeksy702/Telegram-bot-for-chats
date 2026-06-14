// Обработка сообщений в группах: команды, трекинг участников,
// упоминания через /all.

import { sendMessage } from '../utils/telegram.js';
import {
  addGroupMember,
  removeGroupMember,
  getGroupMembers,
  getUser,
  setUser,
  getOnlineUsers,
} from '../utils/storage.js';
import { getWeather } from './weather.js';

export async function handleGroupMessage(message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || '';

  // --- Трекинг участников ---

  // Вступление новых участников
  if (message.new_chat_members && message.new_chat_members.length > 0) {
    for (const member of message.new_chat_members) {
      if (!member.is_bot) {
        await addGroupMember(chatId, member.id, env);
        await saveUserInfo(member, env);
      }
    }
  }

  // Выход участника
  if (message.left_chat_member) {
    await removeGroupMember(chatId, message.left_chat_member.id, env);
  }

  // Каждое сообщение = запись отправителя как участника
  if (message.from && !message.from.is_bot) {
    await addGroupMember(chatId, userId, env);
    await saveUserInfo(message.from, env);
  }

  if (!text) return;

  // --- Команды ---

  if (text === '/all' || text.startsWith('/all@')) {
    await handleAllCommand(chatId, env);
    return;
  }

  if (text.startsWith('/weather')) {
    const city = text.replace(/^\/weather(@\w+)?\s*/, '').trim();
    if (!city) {
      await sendMessage(
        chatId,
        '⚠️ Укажите город: <code>/weather Москва</code>',
        env
      );
    } else {
      const w = await getWeather(city, env);
      await sendMessage(chatId, w, env);
    }
    return;
  }

  if (text === '/online' || text.startsWith('/online@')) {
    await handleOnlineInGroup(chatId, env);
    return;
  }

  if (text === '/help' || text.startsWith('/help@')) {
    await sendMessage(
      chatId,
      '📋 <b>Команды в группе:</b>\n\n' +
        '/all — позвать всех участников\n' +
        '/weather &lt;город&gt; — погода в городе РФ\n' +
        '/online — кто сейчас онлайн в этой группе\n' +
        '/help — эта справка\n\n' +
        'Чтобы попасть в список онлайн, зайдите в личный чат с ботом и нажмите /start.',
      env
    );
  }
}

// ===== /all — упомянуть всех =====
async function handleAllCommand(chatId, env) {
  const memberIds = await getGroupMembers(chatId, env);

  if (memberIds.length === 0) {
    await sendMessage(
      chatId,
      '😔 Пока никого не знаю в этом чате.\n\n' +
        'Попросите участников написать любое сообщение, чтобы бот их запомнил.',
      env
    );
    return;
  }

  const mentions = [];
  for (const id of memberIds) {
    const u = await getUser(id, env);
    let name = 'Участник';
    if (u) {
      if (u.username) {
        name = '@' + u.username;
      } else if (u.first_name) {
        name = u.first_name + (u.last_name ? ' ' + u.last_name : '');
      }
    }
    mentions.push(`<a href="tg://user?id=${id}">${escapeHtml(name)}</a>`);
  }

  const prefix =
    '📢 <b>Сбор всех участников!</b>\n\n' +
    '⚡ Все заходим в игру!\n\n';

  const chunks = chunkMentions(prefix, mentions, 4000);
  for (const chunk of chunks) {
    await sendMessage(chatId, chunk, env);
  }
}

// ===== /online — кто онлайн в этой группе =====
async function handleOnlineInGroup(chatId, env) {
  const onlineIds = await getOnlineUsers(env);
  const groupMembers = await getGroupMembers(chatId, env);
  const onlineInGroup = onlineIds.filter((id) => groupMembers.includes(id));

  if (onlineInGroup.length === 0) {
    await sendMessage(
      chatId,
      '😔 В этой группе сейчас никого нет онлайн.\n\n' +
        'Попросите участников активироваться в личном чате с ботом (/start).',
      env
    );
    return;
  }

  const lines = [];
  for (const id of onlineInGroup) {
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
    `🟢 <b>Онлайн в этой группе (${onlineInGroup.length}):</b>\n\n` +
      lines.join('\n'),
    env
  );
}

// ===== Утилиты =====

// Разбивает длинный список упоминаний на сообщения до maxLength символов.
// Telegram ограничивает длину сообщения 4096 символами.
function chunkMentions(prefix, mentions, maxLength) {
  const chunks = [];
  let current = '';

  for (const m of mentions) {
    const sep = current ? ' ' : '';
    const candidate = current + sep + m;
    if (candidate.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = m;
      } else {
        // единственное упоминание оказалось длиннее лимита — отправляем как есть
        chunks.push(m);
        current = '';
      }
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  if (chunks.length === 0) return [prefix];
  chunks[0] = prefix + chunks[0];
  return chunks;
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

async function saveUserInfo(user, env) {
  if (!user || user.is_bot) return;
  const existing = await getUser(user.id, env);
  const data = {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || '',
  };
  if (
    !existing ||
    existing.first_name !== data.first_name ||
    existing.last_name !== data.last_name ||
    existing.username !== data.username
  ) {
    await setUser(user.id, data, env);
  }
}
