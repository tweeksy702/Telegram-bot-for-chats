// Работа с Cloudflare KV.
// Структура ключей:
//   user:{user_id}             -> { id, first_name, last_name, username }
//   online_users               -> [user_id, user_id, ...]
//   group_members:{chat_id}    -> [user_id, user_id, ...]

export async function getUser(userId, env) {
  const data = await env.BOT_KV.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function setUser(userId, userData, env) {
  await env.BOT_KV.put(`user:${userId}`, JSON.stringify(userData));
}

// ===== Список "онлайн" пользователей (единый JSON-массив) =====
export async function getOnlineUsers(env) {
  const list = await env.BOT_KV.get('online_users');
  return list ? JSON.parse(list) : [];
}

export async function setOnlineUsers(userIds, env) {
  await env.BOT_KV.put('online_users', JSON.stringify(userIds));
}

export async function addOnlineUser(userId, env) {
  const list = await getOnlineUsers(env);
  if (!list.includes(userId)) {
    list.push(userId);
    await setOnlineUsers(list, env);
  }
}

export async function removeOnlineUser(userId, env) {
  const list = await getOnlineUsers(env);
  const filtered = list.filter((id) => id !== userId);
  await setOnlineUsers(filtered, env);
}

// ===== Список участников конкретной группы =====
export async function getGroupMembers(chatId, env) {
  const data = await env.BOT_KV.get(`group_members:${chatId}`);
  return data ? JSON.parse(data) : [];
}

export async function setGroupMembers(chatId, members, env) {
  await env.BOT_KV.put(`group_members:${chatId}`, JSON.stringify(members));
}

export async function addGroupMember(chatId, userId, env) {
  const members = await getGroupMembers(chatId, env);
  if (!members.includes(userId)) {
    members.push(userId);
    await setGroupMembers(chatId, members, env);
  }
}

export async function removeGroupMember(chatId, userId, env) {
  const members = await getGroupMembers(chatId, env);
  const filtered = members.filter((id) => id !== userId);
  await setGroupMembers(chatId, filtered, env);
}
