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

// cross-database search
const searchAllDatabases = async (req, res) => {
  try {
    const formData = req.body;
    const map = {
      keyword: "keyword",
      age_min: "agemin",
      age_max: "agemax",
      task_min: "taskmin",
      task_max: "taskmax",
      run_min: "runmin",
      run_max: "runmax",
      sess_min: "sessmin",
      sess_max: "sessmax",
      modality: "modality",
      run_name: "run",
      type_name: "type",
      session_name: "session",
      task_name: "task",
      limit: "limit",
      skip: "skip",
      count: "count",
      unique: "unique",
      gender: "gender",
      database: "dbname",
      dataset: "dsname",
      subject: "subname",
    };

    const params = new URLSearchParams();
    params.append("_get", "dbname, dsname, json");

    Object.keys(formData).forEach((key) => {
      let val = formData[key];
      if (val === "" || val === "any" || val === undefined || val === null) {
        return;
      }

      const queryKey = map[key];
      if (!queryKey) return;

      if (key.startsWith("age")) {
        params.append(queryKey, String(Math.floor(val * 100)).padStart(5, "0"));
      } else if (key === "gender") {
        params.append(queryKey, val[0]);
      } else if (key === "modality") {
        params.append(queryKey, val.replace(/.*\(/, "").replace(/\).*/, ""));
      } else {
        params.append(queryKey, val.toString());
      }
    });

    const queryString = `?${params.toString()}`;
    const response = await axios.get(
      `https://cors.redoc.ly/https://neurojson.org/io/search.cgi${queryString}`,
      {
        headers: {
          Origin: "https://neurojson.io",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error searching all databases:", error.message);
    res.status(error.response?.status || 500).json({
      message: "Error searching databases",
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

// get all datasets in a db (paginated)
const getDbDatasets = async (req, res) => {
  try {
    const { dbName } = req.params;
    const { offset = 0, limit = 10 } = req.query;

    const response = await axios.get(
      `${COUCHDB_BASE_URL}/${dbName}/_design/qq/_view/dbinfo`,
      {
        headers: {
          Origin: "https://neurojson.io",
          "X-Requested-With": "XMLHttpRequest",
        },
        params: {
          limit: parseInt(limit),
          skip: parseInt(offset),
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      `Error fetching datasets for ${req.params.dbName}:`,
      error.message
    );
    res.status(error.response?.status || 500).json({
      message: "Error fetching datasets",
      error: error.message,
    });
  }
};

module.exports = {
  getDbList,
  getDbStats,
  getDbInfo,
  getDbDatasets,
  searchAllDatabases,
};
