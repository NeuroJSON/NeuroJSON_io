const axios = require("axios");
const COUCHDB_BASE_URL =
  process.env.COUCHDB_BASE_URL ||
  "https://cors.redoc.ly/https://neurojson.io:7777";

// get registry
const getRegistry = async (req, res) => {
  try {
    console.log("hit the route");
    const response = await axios.get(`${COUCHDB_BASE_URL}/sys/registry`, {
      headers: {
        Origin: "https://neurojson.io",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    console.log("have response");
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching registry:", error.message);
    res.status(error.response?.status || 500).json({
      message: "Error fetching registry",
      error: error.message,
    });
  }
};

module.exports = {
  getRegistry,
};
