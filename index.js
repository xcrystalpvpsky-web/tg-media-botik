const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// состояние пользователя
const userMode = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Выбери, что создать:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🖼 Создать фото', callback_data: 'img' }],
        [{ text: '🎥 Создать видео', callback_data: 'vid' }]
      ]
    }
  });
});

bot.on('callback_query', (q) => {
  const chatId = q.message.chat.id;

  if (q.data === 'img') {
    userMode[chatId] = 'img';
    bot.sendMessage(chatId, '✏️ Напиши описание для картинки');
  }

  if (q.data === 'vid') {
    userMode[chatId] = 'vid';
    bot.sendMessage(chatId, '✏️ Напиши описание для видео');
  }

  bot.answerCallbackQuery(q.id);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text || !userMode[chatId]) return;

  try {
    // 🖼 КАРТИНКА
    if (userMode[chatId] === 'img') {
      const img = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: msg.text,
        size: '1024x1024'
      });

      bot.sendPhoto(chatId, img.data[0].url);
      delete userMode[chatId];
    }

    // 🎥 ВИДЕО (пример: Runway)
    if (userMode[chatId] === 'vid') {
      const res = await axios.post(
        'https://api.runwayml.com/v1/generate',
        { prompt: msg.text, duration: 4 },
        {
          headers: {
            Authorization: `Bearer ${process.env.RUNWAY_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      bot.sendMessage(chatId, `🎥 Видео создаётся:\n${res.data.url}`);
      delete userMode[chatId];
    }
  } catch (e) {
    bot.sendMessage(chatId, 'Ошибка при генерации 😕');
    delete userMode[chatId];
  }
});
