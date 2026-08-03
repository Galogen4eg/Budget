export class GoogleGenAI {
  apiKey?: string;
  constructor(options: { apiKey?: string } = {}) {
    this.apiKey = options.apiKey;
  }
  get models() {
    return {
      generateContent: async (params: any) => {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: this.apiKey, params }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate content");
        }
        return res.json();
      }
    };
  }
}
