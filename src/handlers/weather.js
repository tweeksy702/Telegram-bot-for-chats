// Получение текущей погоды в городе РФ через OpenWeatherMap.
// Требует секрет OWM_API_KEY в env.

export async function getWeather(city, env) {
  if (!env.OWM_API_KEY) {
    return '⚠️ Сервис погоды не настроен: отсутствует API-ключ OpenWeatherMap.';
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?q=${encodeURIComponent(city)},RU` +
      `&appid=${env.OWM_API_KEY}` +
      `&units=metric&lang=ru`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || (data.cod && data.cod !== 200)) {
      if (data.cod === 401 || data.cod === '401') {
        return '⚠️ Неверный API-ключ OpenWeatherMap. Проверьте секрет OWM_API_KEY.';
      }
      if (data.cod === 404 || data.cod === '404') {
        return `⚠️ Город «${city}» не найден. Проверьте название.`;
      }
      return `⚠️ Ошибка получения погоды: ${data.message || 'неизвестная ошибка'}`;
    }

    const temp = Math.round(data.main.temp);
    const feels = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    // hPa -> мм рт. ст.
    const pressure = Math.round(data.main.pressure * 0.75006375541921);
    const wind = data.wind.speed;
    const desc = data.weather[0].description;
    const icon = getWeatherEmoji(data.weather[0].id);

    return (
      `${icon} <b>Погода в ${escapeHtml(data.name)}:</b>\n\n` +
      `🌡 Температура: ${temp}°C (ощущается ${feels}°C)\n` +
      `☁️ ${capitalize(desc)}\n` +
      `💧 Влажность: ${humidity}%\n` +
      `🎯 Давление: ${pressure} мм рт. ст.\n` +
      `💨 Ветер: ${wind} м/с`
    );
  } catch (err) {
    console.error('Weather error:', err);
    return '⚠️ Ошибка получения погоды. Попробуйте позже.';
  }
}

function getWeatherEmoji(id) {
  if (id >= 200 && id < 300) return '⛈';
  if (id >= 300 && id < 400) return '🌧';
  if (id >= 500 && id < 600) return '🌧';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫';
  if (id === 800) return '☀️';
  if (id === 801) return '🌤';
  if (id === 802) return '⛅';
  if (id >= 803) return '☁️';
  return '🌡';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
