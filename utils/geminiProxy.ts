import { GoogleGenAI as DirectGoogleGenAI } from "@google/genai";

function cleanApiKey(key?: string): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export function parseGeminiError(e: any): string {
  const msg = String(e?.message || e?.error || e || "");
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("invalid API key") || msg.includes("400")) {
    return "API ключ Gemini недействителен (API_KEY_INVALID). Проверьте символы ключа на странице aistudio.google.com/app/apikey и убедитесь, что скопировали его полностью без лишних кавычек или пробелов.";
  }
  if (msg.includes("QUOTA_EXCEEDED") || msg.includes("429") || msg.includes("Quota")) {
    return "Превышен лимит запросов Gemini (429 Quota Exceeded). Подождите 1 минуту или создайте новый API ключ в Google AI Studio.";
  }
  if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    return "Доступ к Gemini заблокирован (403 Permission Denied). Проверьте ограничения вашего API ключа в Google Cloud / AI Studio.";
  }
  if (msg.includes("MODEL_NOT_FOUND") || msg.includes("404")) {
    return "Запрошенная модель Gemini недоступна для вашего аккаунта или ключа.";
  }
  return msg || "Неизвестная ошибка при вызове Gemini API";
}

export class GoogleGenAI {
  apiKey?: string;

  constructor(options: { apiKey?: string } = {}) {
    this.apiKey = cleanApiKey(options.apiKey);
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        const cleanKey = cleanApiKey(this.apiKey);

        // 1. Если ключ передан в настройках клиента — выполняем прямой запрос через SDK @google/genai в браузере
        if (cleanKey) {
          try {
            const ai = new DirectGoogleGenAI({ apiKey: cleanKey });
            const modelToUse = params.model || "gemini-2.5-flash";
            const response = await ai.models.generateContent({
              ...params,
              model: modelToUse
            });
            return { text: response.text };
          } catch (directErr: any) {
            console.warn("Direct client Gemini call failed, trying fallback model...", directErr);
            // Если ошибка в названии модели, пробуем gemini-2.5-flash
            if (params.model && params.model !== "gemini-2.5-flash") {
              try {
                const ai = new DirectGoogleGenAI({ apiKey: cleanKey });
                const response = await ai.models.generateContent({
                  ...params,
                  model: "gemini-2.5-flash"
                });
                return { text: response.text };
              } catch (fallbackErr: any) {
                throw new Error(parseGeminiError(fallbackErr));
              }
            }
            throw new Error(parseGeminiError(directErr));
          }
        }

        // 2. Если клиентского ключа нет, совершаем запрос к серверу /api/gemini
        try {
          const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: cleanKey, params }),
          });

          const rawText = await res.text();

          // Безопасная проверка: если вместо JSON вернулась HTML-страница (например 404 или index.html на Vercel)
          const trimmed = rawText.trim();
          if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<") || trimmed.toLowerCase().includes("the page") || trimmed.includes("404 Not Found")) {
            throw new Error(
              "Серверный маршрут /api/gemini недоступен (приложение запущено как статический сайт на Vercel). Пожалуйста, введите ваш API-ключ Gemini напрямую в Настройках приложения."
            );
          }

          let data: any;
          try {
            data = JSON.parse(rawText);
          } catch (jsonErr) {
            throw new Error(`Ответ сервера не является валидным JSON: ${rawText.slice(0, 80)}`);
          }

          if (!res.ok) {
            throw new Error(parseGeminiError(data.error || "Ошибка генерации ответа"));
          }

          return data;
        } catch (serverErr: any) {
          throw new Error(parseGeminiError(serverErr.message || serverErr));
        }
      }
    };
  }
}

