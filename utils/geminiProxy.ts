import { GoogleGenAI as DirectGoogleGenAI } from "@google/genai";

function cleanApiKey(key?: string): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export function parseGeminiError(errorObj: any): string {
  const code = errorObj?.code || errorObj?.status || "";
  const msg = String(errorObj?.message || errorObj?.error || errorObj || "");

  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("invalid API key") || code === 400) {
    return "API-ключ Gemini недействителен (API_KEY_INVALID). Проверьте символы ключа на aistudio.google.com/app/apikey и скопируйте его без лишних пробелов.";
  }
  if (msg.includes("QUOTA_EXCEEDED") || msg.includes("RESOURCE_EXHAUSTED") || code === 429) {
    return "Превышен лимит запросов Gemini (429 Quota Exceeded). Подождите 1 минуту или создайте новый ключ на aistudio.google.com.";
  }
  if (msg.includes("PERMISSION_DENIED") || code === 403) {
    return "Доступ к Gemini заблокирован (403 Permission Denied). Проверьте ограничения вашего API-ключа в Google Cloud Console.";
  }
  if (msg.includes("NOT_FOUND") || msg.includes("MODEL_NOT_FOUND") || code === 404) {
    return "Запрошенная модель Gemini недоступна для вашего ключа. Пробуем автоматически переключиться на стандартную модель gemini-2.5-flash.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Ошибка сетевого соединения с серверами Google Gemini. Проверьте интернет или отключите блокировщик рекламы/VPN.";
  }
  return msg || "Произошла неизвестная ошибка при вызове Gemini API";
}

// Нормализация параметров под REST API Google Gemini
function prepareRequestBody(params: any) {
  const body: any = {};

  // 1. Contents
  if (typeof params.contents === "string") {
    body.contents = [{ parts: [{ text: params.contents }] }];
  } else if (Array.isArray(params.contents)) {
    body.contents = params.contents.map((item: any) => {
      if (typeof item === "string") return { parts: [{ text: item }] };
      if (item && item.parts) return item;
      return { parts: [{ text: JSON.stringify(item) }] };
    });
  } else if (params.contents && params.contents.parts) {
    body.contents = [params.contents];
  } else {
    body.contents = [{ parts: [{ text: String(params.contents || "") }] }];
  }

  // 2. Config / SystemInstruction / responseMimeType
  const config = params.config || {};
  if (config.systemInstruction) {
    if (typeof config.systemInstruction === "string") {
      body.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    } else {
      body.systemInstruction = config.systemInstruction;
    }
  }

  if (config.responseMimeType) {
    body.generationConfig = body.generationConfig || {};
    body.generationConfig.responseMimeType = config.responseMimeType;
  }

  return body;
}

// Прямой вызов Google Gemini REST API с обработкой ошибок и фоллбэком моделей
async function callGeminiRestApi(apiKey: string, requestedModel: string, params: any): Promise<any> {
  const candidateModels = Array.from(new Set([
    requestedModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ])).filter(Boolean);

  let lastErrorMsg = "";

  for (const model of candidateModels) {
    // Нормализуем устаревшие имена моделей
    const targetModel = model === "gemini-3-flash-preview" ? "gemini-2.5-flash" : model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const requestBody = prepareRequestBody(params);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let json: any = {};
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Невалидный ответ сервера Gemini: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        const errObj = json.error || json;
        const errStatus = errObj?.status || response.status;
        const errMsg = errObj?.message || responseText;

        // Если модель не найдена (404), попробуем следующую модель из списка candidateModels
        if (errStatus === "NOT_FOUND" || response.status === 404 || errMsg.includes("not found")) {
          console.warn(`Модель ${targetModel} не найдена или недоступна, пробуем следующую...`);
          lastErrorMsg = `Модель ${targetModel} недоступна для вашего API-ключа.`;
          continue;
        }

        throw new Error(parseGeminiError(errObj));
      }

      // Извлекаем сгенерированный текст из ответа
      const candidates = json.candidates || [];
      const firstCandidate = candidates[0];
      const parts = firstCandidate?.content?.parts || [];
      const extractedText = parts.map((p: any) => p.text || "").join("");

      return {
        text: extractedText,
        raw: json
      };
    } catch (err: any) {
      if (err.message && !err.message.includes("не найдена")) {
        throw err;
      }
      lastErrorMsg = err.message || String(err);
    }
  }

  throw new Error(parseGeminiError({ message: lastErrorMsg || "Ни одна из поддерживаемых моделей Gemini не ответила" }));
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

        // 1. Если ключ указан пользователем в настройках клиента — выполняем прямые вызовы к Google REST API
        if (cleanKey) {
          const requestedModel = params.model || "gemini-2.5-flash";
          return await callGeminiRestApi(cleanKey, requestedModel, params);
        }

        // 2. Если клиентского ключа нет, пробуем обратиться к прокси-серверу /api/gemini
        try {
          const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: cleanKey, params }),
          });

          const rawText = await res.text();
          const trimmed = rawText.trim();

          if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<") || trimmed.toLowerCase().includes("the page") || trimmed.includes("404 Not Found")) {
            throw new Error(
              "Серверный роут /api/gemini недоступен (приложение развёрнуто как статический сайт на Vercel). Пожалуйста, введите ваш персональный API-ключ Gemini в Настройках приложения."
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
