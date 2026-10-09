const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

// const getQwenTemperature = (modelName: string): number => {
//   if (modelName.includes("next") || modelName.includes("fast")) return 0.4;
//   if (modelName.includes("careful") || modelName.includes("think")) return 0.15;
//   return 0.3;
// };

export const OllamaService = {
  chat: async (
    model: string,
    messages: { role: string; content: string }[],
    temperature?: number
  ): Promise<any> => {
    // const temperature = getQwenTemperature(model);
    const response = await fetch(`${API_URL}/ollama/bidsify`, {
      method: "POST",
      // Send the login cookie: /ollama/bidsify requires login, and locally the
      // API (localhost:5000) is a different origin from the page.
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          ...(temperature !== undefined ? { temperature } : {}),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to call Ollama");
    }

    return data;
  },

  getTags: async (): Promise<any> => {
    const response = await fetch(`${API_URL}/ollama/tags`, {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Failed to fetch Ollama models"
      );
    }

    return data;
  },
};
