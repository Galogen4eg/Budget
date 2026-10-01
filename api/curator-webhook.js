export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;

  try {
    const token = process.env.TG_BOT_TOKEN;
    const channelId = process.env.PUBLIC_CHANNEL_ID;

    // Нижняя клавиатура с постоянной кнопкой запроса
    const mainKeyboard = {
      keyboard: [
        [{ text: "📰 Найти новость" }]
      ],
      resize_keyboard: true,
      persistent: true
    };

    // 1. Обработка входящих текстовых сообщений
    if (update.message && update.message.text) {
      const text = update.message.text.trim().toLowerCase();
      const chatId = update.message.chat.id;

      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Бот готов к работе. Нажми кнопку ниже, чтобы запросить свежий инфоповод.",
            reply_markup: mainKeyboard
          })
        });
        return res.status(200).json({ ok: true });
      }

      if (text === "📰 найти новость" || text === "/find" || text === "новость") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Ищу инфоповод и генерирую черновик...",
            reply_markup: mainKeyboard
          })
        });

        // Фоновый вызов парсера и генератора
        const host = req.headers.host;
        const protocol = host.includes("localhost") ? "http" : "https";
        await fetch(`${protocol}://${host}/api/curator-find`);

        return res.status(200).json({ ok: true });
      }
    }

    // 2. Обработка нажатий инлайн-кнопок под черновиком
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const message = callback.message;

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
          // Убираем инлайн-кнопки у опубликованного черновика
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
