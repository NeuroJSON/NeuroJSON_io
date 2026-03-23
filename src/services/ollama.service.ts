const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const OllamaService = {
  chat: async (
    model: string,
    messages: { role: string; content: string }[]
  ): Promise<any> => {
    const response = await fetch(`${API_URL}/ollama/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to call Ollama");
    }

    return data;
  },

  getTags: async (): Promise<any> => {
    const response = await fetch(`${API_URL}/ollama/tags`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch Ollama models");
    }

    return data;
  },
};
