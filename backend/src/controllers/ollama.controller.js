const OLLAMA_BASE_URL = "http://jin.neu.edu:11434";
const OLLAMA_MODEL = "qwen3.6:27b";

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
