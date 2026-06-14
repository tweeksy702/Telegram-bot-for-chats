// Маршрутизация входящих апдейтов Telegram
// в зависимости от типа чата (private / group) и типа события.

import { handlePrivateMessage, handleCallbackQuery } from './handlers/private.js';
import { handleGroupMessage } from './handlers/group.js';
import { sendMessage } from './utils/telegram.js';

export async function handleUpdate(update, env) {
  try {
    // Обычные сообщения
    if (update.message) {
      const chat = update.message.chat;
      if (chat.type === 'private') {
        await handlePrivateMessage(update.message, env);
      } else if (chat.type === 'group' || chat.type === 'supergroup') {
        await handleGroupMessage(update.message, env);
      }
      return;
    }

    // Нажатия на inline-кнопки
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, env);
      return;
    }

    // Бот добавлен/удалён из чата
    if (update.my_chat_member) {
      const mcm = update.my_chat_member;
      const newStatus = mcm.new_chat_member && mcm.new_chat_member.status;
      if (newStatus === 'member' || newStatus === 'administrator') {
        const chat = mcm.chat;
        if (chat.type === 'group' || chat.type === 'supergroup') {
          await sendMessage(
            chat.id,
            '👋 <b>Привет, группа!</b>\n\n' +
              'Я бот для сбора участников на игру.\n\n' +
              '<b>Команды в группе:</b>\n' +
              '• /all — позвать всех\n' +
              '• /weather &lt;город&gt; — погода в городе РФ\n' +
              '• /online — кто сейчас онлайн\n\n' +
              'Чтобы попасть в список онлайн, зайдите в личный чат со мной и нажмите /start.',
            env
          );
        }
      }
      return;
    }
  } catch (err) {
    console.error('handleUpdate error:', err);
  }
}
