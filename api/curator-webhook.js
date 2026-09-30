export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;

  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const message = callback.message;

    if (data === "publish_current") {
      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.PUBLIC_CHANNEL_ID,
          photo: message.photo[message.photo.length - 1].file_id,
          caption: message.caption
        })
      });

      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: `${message.caption}\n\n🚀 Опубликовано в канал!`
        })
      });
    }

    if (data === "dismiss") {
      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: `❌ Отклонено.`
        })
      });
    }

    await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callback.id })
    });
  }

  return res.status(200).send("OK");
}
