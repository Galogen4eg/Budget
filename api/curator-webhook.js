export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;

  try {
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const message = callback.message;
      const token = process.env.TG_BOT_TOKEN;
      const channelId = process.env.PUBLIC_CHANNEL_ID;

      // 1. Обязательно гасим крутилку на кнопке
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback.id,
          text: data === "publish_current" ? "Публикую..." : "Отклонено"
        })
      });

      if (data === "publish_current") {
        let postRes;

        // Если это фото-пост
        if (message.photo && message.photo.length > 0) {
          const fileId = message.photo[message.photo.length - 1].file_id;
          postRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              photo: fileId,
              caption: message.caption || ""
            })
          });
        } else {
          // Если это текстовый пост
          postRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              text: message.text || "",
              disable_web_page_preview: false
            })
          });
        }

        const postData = await postRes.json();

        if (postData.ok) {
          // Обновляем сообщение у тебя в личке, чтобы убрать кнопки
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
        // Удаляем отклоненный черновик
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
