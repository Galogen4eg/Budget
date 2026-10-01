const SOURCES = {
  petapixel: { name: "PetaPixel", url: "https://petapixel.com/feed/" },
  diyphotography: { name: "DIYPhotography", url: "https://www.diyphotography.net/feed/" },
  fstoppers: { name: "Fstoppers", url: "https://fstoppers.com/feed" }
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
    // 1. Текстовые команды
    if (update.message && update.message.text) {
      const text = update.message.text.trim().toLowerCase();
      const chatId = update.message.chat.id;

      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Бот готов. Выбирай действие внизу:",
            reply_markup: mainKeyboard
          })
        });
        return res.status(200).json({ ok: true });
      }

      if (text === "⚙️ сменить источник" || text === "/sources") {
        const sourceButtons = {
          inline_keyboard: Object.entries(SOURCES).map(([key, item]) => [
            { text: item.name, callback_data: `src_${key}` }
          ])
        };

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Выбери источник для генерации новости:",
            reply_markup: sourceButtons
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
            text: "Ищу новость из основного источника...",
            reply_markup: mainKeyboard
          })
        });

        const host = req.headers.host;
        const protocol = host.includes("localhost") ? "http" : "https";
        await fetch(`${protocol}://${host}/api/curator-find`);
        return res.status(200).json({ ok: true });
      }
    }

    // 2. Обработка кнопок
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const message = callback.message;

      // Выбор конкретного источника
      if (data.startsWith("src_")) {
        const srcKey = data.replace("src_", "");
        const selected = SOURCES[srcKey];

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: `Выбран: ${selected.name}`
          })
        });

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: `Ищу новость из ${selected.name}...`,
            reply_markup: mainKeyboard
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
          text: data === "publish_current" ? "Публикую..." : "Отклонено"
        })
      });

      if (data === "publish_current") {
        const postRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            text: message.text || "",
            disable_web_page_preview: false
          })
        });

        const postData = await postRes.json();
        if (postData.ok) {
          await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: message.chat.id,
              message_id: message.message_id,
              reply_markup: { inline_keyboard: [] }
            })
          });
        }
      }

      if (data === "dismiss") {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id
          })
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: true, error: err.message });
  }
}
