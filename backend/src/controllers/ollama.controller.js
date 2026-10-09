// Ollama server + model come from .env, so switching needs no code change:
//   OLLAMA_BASE_URL=http://shui.neu.edu:11434
//   OLLAMA_MODEL=qwen3.8-careful:latest
const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL || "http://shui.neu.edu:11434"
).replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.8-careful:latest";

const proxyChat = async (req, res) => {
  console.log("🟣 [Ollama] proxyChat hit — model:", OLLAMA_MODEL);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req.body, model: OLLAMA_MODEL }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("🔴 [Ollama] fetch failed:", err.message); // ← add
    res.status(500).json({ error: err.message });
  }
};

const getTags = async (req, res) => {
  console.log("🟣 [Ollama] getTags hit"); // ← add
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("🔴 [Ollama] getTags failed:", err.message); // ← add
    res.status(500).json({ error: err.message });
  }
};

module.exports = { proxyChat, getTags };
