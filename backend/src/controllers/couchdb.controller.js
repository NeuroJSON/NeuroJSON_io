const axios = require("axios");
const COUCHDB_BASE_URL =
  process.env.COUCHDB_BASE_URL ||
  "https://cors.redoc.ly/https://neurojson.io:7777";

// get all dbs list (registry)
const getDbList = async (req, res) => {
  try {
    const response = await axios.get(`${COUCHDB_BASE_URL}/sys/registry`, {
      headers: {
        Origin: "https://neurojson.io",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching db list(registry):", error.message);
    res.status(error.response?.status || 500).json({
      message: "Error fetching db list(registry)",
      error: error.message,
    });
  }
};

// get db stats
const getDbStats = async (req, res) => {
  try {
    const response = await axios.get(
      "https://neurojson.org/io/search.cgi?dbstats=1"
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching db stats:", error.message);
    res.status(error.response?.status || 500).json({
      message: "Error fetching database stats",
      error: error.message,
    });
  }
};

// get database info
const getDbInfo = async (req, res) => {
  try {
    const { dbName } = req.params;
    const response = await axios.get(`${COUCHDB_BASE_URL}/${dbName}`, {
      headers: {
        Origin: "https://neurojson.io",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      `Error fetching db info for ${req.params.dbName}:`,
      error.message
    );
    res.status(error.response?.status || 500).json({
      message: "Error fetching database info",
      error: error.message,
    });
  }
};

module.exports = {
  getDbList,
};
