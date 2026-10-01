const SOURCES = {
  pikabu: { name: "Пикабу", url: "https://pikabu.ru/xml/main.xml" },
  yaplakal: { name: "ЯПлакалъ", url: "https://www.yaplakal.com/news.xml" },
  fishki: { name: "Фишки.нет", url: "https://fishki.net/info/rss/" },
  joyreactor: { name: "JoyReactor", url: "https://joyreactor.cc/rss" },
  lepra: { name: "Лепра (TG)", url: "https://rsshub.app/telegram/channel/lepra2ch" },
  photar: { name: "Photar.ru", url: "https://photar.ru/feed/" },
  dtf: { name: "DTF (Geek)", url: "https://dtf.ru/rss/all" },
  boredpanda: { name: "Bored Panda", url: "https://www.boredpanda.com/photography/feed/" },
  reddit_mildly: { name: "r/MildlyInteresting", url: "https://www.reddit.com/r/mildlyinteresting/.rss" },
  reddit_camera: { name: "r/CameraMan", url: "https://www.reddit.com/r/PraiseTheCameraMan/.rss" }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body;
  const token = process.env.TG_BOT_TOKEN;
  const channelId = process.env.PUBLIC_CHANNEL_ID;

  const mainKeyboard = {
    keyboard: [
      [{ text: "📰 Найти новость" }],
      [{ text: "⚙️ Сменить источник" }]
    ],
    resize_keyboard: true,
    persistent: true
  };

  try {
    if (update.message && update.message.text) {
      const text = update.message.text.trim().toLowerCase();
      const chatId = update.message.chat.id;

      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Бот-куратор готов. Выбирай источник и ищи инфоповоды.",
            reply_markup: mainKeyboard
          })
        });
        return res.status(200).json({ ok: true });
      }

      if (text === "⚙️ сменить источник" || text === "/sources") {
        const keys = Object.keys(SOURCES);
        const inline_keyboard = [];
        
        for (let i = 0; i < keys.length; i += 2) {
          const row = [{ text: SOURCES[keys[i]].name, callback_data: `src_${keys[i]}` }];
          if (keys[i+1]) {
            row.push({ text: SOURCES[keys[i+1]].name, callback_data: `src_${keys[i+1]}` });
          }
          inline_keyboard.push(row);
        }

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Выбери ленту для парсинга:",
            reply_markup: { inline_keyboard }
          })
        });
        return res.status(200).json({ ok: true });
      }

      if (text === "📰 найти новость" || text === "/find") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Ищу случайную новость...",
            reply_markup: mainKeyboard
          })
        });

        const host = req.headers.host;
        const protocol = host.includes("localhost") ? "http" : "https";
        await fetch(`${protocol}://${host}/api/curator-find`);
        return res.status(200).json({ ok: true });
      }
    }

    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const message = callback.message;

      if (data.startsWith("src_")) {
        const srcKey = data.replace("src_", "");
        const selected = SOURCES[srcKey];

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callback.id, text: `Источник: ${selected.name}` })
        });

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: `Парсю случайную новость из ${selected.name}...`
          })
        });

        const host = req.headers.host;
        const protocol = host.includes("localhost") ? "http" : "https";
        await fetch(`${protocol}://${host}/api/curator-find?feed=${encodeURIComponent(selected.url)}`);
        return res.status(200).json({ ok: true });
      }

      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback.id,
          text: data === "publish_current" ? "Отправлено в канал" : "Удалено"
        })
      });

      if (data === "publish_current") {
        const postRes = await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            from_chat_id: message.chat.id,
            message_id: message.message_id
          })
        });

        if ((await postRes.json()).ok) {
          await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: message.chat.id, message_id: message.message_id, reply_markup: { inline_keyboard: [] } })
          });
        }
      }

      if (data === "dismiss") {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: message.chat.id, message_id: message.message_id })
        });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: true, error: err.message });
  }
}
