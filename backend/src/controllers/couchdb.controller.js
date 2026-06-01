const axios = require("axios");
const { sequelize } = require("../config/database");
// const COUCHDB_BASE_URL =
//   process.env.COUCHDB_BASE_URL ||
//   "https://cors.redoc.ly/https://neurojson.io:7777";
const COUCHDB_BASE_URL = "https://neurojson.io:7777";
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

// cross-database search — old version proxied to https://neurojson.org/io/search.cgi
// kept for reference; replaced by the Postgres-backed version below.
// const searchAllDatabases = async (req, res) => {
//   try {
//     const formData = req.body;
//     const map = {
//       keyword: "keyword",
//       age_min: "agemin",
//       age_max: "agemax",
//       task_min: "taskmin",
//       task_max: "taskmax",
//       run_min: "runmin",
//       run_max: "runmax",
//       sess_min: "sessmin",
//       sess_max: "sessmax",
//       modality: "modality",
//       run_name: "run",
//       type_name: "type",
//       session_name: "session",
//       task_name: "task",
//       limit: "limit",
//       skip: "skip",
//       count: "count",
//       unique: "unique",
//       gender: "gender",
//       database: "dbname",
//       dataset: "dsname",
//       subject: "subname",
//     };
//
//     const params = new URLSearchParams();
//     params.append("_get", "dbname, dsname, json");
//
//     Object.keys(formData).forEach((key) => {
//       let val = formData[key];
//       if (val === "" || val === "any" || val === undefined || val === null) {
//         return;
//       }
//
//       const queryKey = map[key];
//       if (!queryKey) return;
//
//       if (key.startsWith("age")) {
//         params.append(queryKey, String(Math.floor(val * 100)).padStart(5, "0"));
//       } else if (key === "gender") {
//         params.append(queryKey, val[0]);
//       } else if (key === "modality") {
//         params.append(queryKey, val.replace(/.*\(/, "").replace(/\).*/, ""));
//       } else {
//         params.append(queryKey, val.toString());
//       }
//     });
//
//     const queryString = `?${params.toString()}`;
//     const response = await axios.get(
//       `https://cors.redoc.ly/https://neurojson.org/io/search.cgi${queryString}`,
//       {
//         headers: {
//           Origin: "https://neurojson.io",
//           "X-Requested-With": "XMLHttpRequest",
//         },
//       }
//     );
//     res.status(200).json(response.data);
//   } catch (error) {
//     console.error("Error searching all databases:", error.message);
//     res.status(error.response?.status || 500).json({
//       message: "Error searching databases",
//       error: error.message,
//     });
//   }
// };

// helpers for the Postgres-backed search
function isFilter(v) {
  return v !== "" && v !== "any" && v !== undefined && v !== null;
}
function pad4(n) {
  return String(n).padStart(4, "0");
}
function pad5(n) {
  return String(n).padStart(5, "0");
}

// cross-database search — Postgres-backed (queries ioviews)
const searchAllDatabases = async (req, res) => {
  try {
    const f = req.body || {};
    const where = [];
    const repl = {};

    // Pick which view to search.
    // Subject-level filters → subjects view; otherwise dbinfo.
    const subjectFilterKeys = [
      "age_min", "age_max", "gender",
      "task_min", "task_max", "task_name",
      "run_min", "run_max", "run_name",
      "sess_min", "sess_max", "session_name",
      "type_name", "modality", "subject",
    ];
    const isSubjectSearch = subjectFilterKeys.some((k) => isFilter(f[k]));
    where.push(`view = :view`);
    repl.view = isSubjectSearch ? "subjects" : "dbinfo";

    // Range filters compare against zero-padded key components.
    // json->'key' = [age, gender, sess, mod, task, run, subjId]
    if (isFilter(f.age_min)) {
      where.push(`(json->'key'->>0) >= :ageMin`);
      repl.ageMin = pad5(Math.floor(Number(f.age_min) * 100));
    }
    if (isFilter(f.age_max)) {
      where.push(`(json->'key'->>0) <= :ageMax`);
      repl.ageMax = pad5(Math.floor(Number(f.age_max) * 100));
    }
    if (isFilter(f.sess_min)) {
      where.push(`(json->'key'->>2) >= :sessMin`);
      repl.sessMin = pad4(f.sess_min);
    }
    if (isFilter(f.sess_max)) {
      where.push(`(json->'key'->>2) <= :sessMax`);
      repl.sessMax = pad4(f.sess_max);
    }
    if (isFilter(f.task_min)) {
      where.push(`(json->'key'->>4) >= :taskMin`);
      repl.taskMin = pad4(f.task_min);
    }
    if (isFilter(f.task_max)) {
      where.push(`(json->'key'->>4) <= :taskMax`);
      repl.taskMax = pad4(f.task_max);
    }
    if (isFilter(f.run_min)) {
      where.push(`(json->'key'->>5) >= :runMin`);
      repl.runMin = pad4(f.run_min);
    }
    if (isFilter(f.run_max)) {
      where.push(`(json->'key'->>5) <= :runMax`);
      repl.runMax = pad4(f.run_max);
    }
    if (isFilter(f.gender)) {
      // stored as one upper-case char left-padded to 4 chars
      where.push(`(json->'key'->>1) LIKE :gender`);
      repl.gender = `%${String(f.gender)[0].toUpperCase()}`;
    }

    // Name filters — jsonb ? checks if a string is an element of the array.
    if (isFilter(f.task_name)) {
      where.push(`json->'value'->'tasks' ? :taskName`);
      repl.taskName = String(f.task_name);
    }
    if (isFilter(f.run_name)) {
      where.push(`json->'value'->'runs' ? :runName`);
      repl.runName = String(f.run_name);
    }
    if (isFilter(f.session_name)) {
      where.push(`json->'value'->'sessions' ? :sessName`);
      repl.sessName = String(f.session_name);
    }
    if (isFilter(f.type_name)) {
      where.push(`json->'value'->'types' ? :typeName`);
      repl.typeName = String(f.type_name);
    }
    if (isFilter(f.modality)) {
      // form sometimes wraps as "fNIRS (nirs)" — pull text inside parens
      const mod = String(f.modality).replace(/.*\(/, "").replace(/\).*/, "");
      where.push(`json->'value'->'modalities' ? :modality`);
      repl.modality = mod;
    }

    // Dataset-level modality filter (multi-select + AND/OR).
    // Queries json->'modality' on dbinfo rows, not subjects rows.
    if (Array.isArray(f.modalities) && f.modalities.length > 0) {
      const op = f.modality_mode === "and" ? " AND " : " OR ";
      const parts = f.modalities.map((m, i) => {
        repl[`dmod${i}`] = String(m);
        return isSubjectSearch
          ? `dsi.json->'modality' ? :dmod${i}`
          : `json->'modality' ? :dmod${i}`;
      });
      const condition = `(${parts.join(op)})`;
      if (isSubjectSearch) {
        where.push(`EXISTS (
          SELECT 1 FROM ioviews dsi
          WHERE dsi.dbname = ioviews.dbname
            AND dsi.dsname = ioviews.dsname
            AND dsi.view = 'dbinfo'
            AND ${condition}
        )`);
      } else {
        where.push(condition);
      }
    }

    // db / ds / subj filters
    if (isFilter(f.database)) {
      where.push(`dbname = :dbname`);
      repl.dbname = String(f.database);
    }
    if (isFilter(f.dataset)) {
      where.push(`dsname = :dsname`);
      repl.dsname = String(f.dataset);
    }
    if (isFilter(f.subject)) {
      where.push(`subj = :subj`);
      repl.subj = String(f.subject);
    }

    // Keyword search — match anywhere relevant.
    // plainto_tsquery treats input as plain words AND'd together; ignores
    // operator chars like "-" and "OR" so dataset names with hyphens
    // (e.g. "ABIDE - CMU_a") don't get parsed as NOT clauses.
    // ILIKE on dbname/dsname adds substring matching so "fnirs" finds
    // "bfnirs", "openfnirs", and any dataset id containing it.
    // ILIKE on json->>'name' covers the human-readable name from
    // dataset_description.json (e.g. "ABIDE - CMU_a"), which is where the
    // user-visible dataset titles live — dsname column often stores just
    // an opaque id like "CMU_a" without the prefix.
    // ILIKE pattern normalizes whitespace/hyphens to % wildcards so
    // "ABIDE - CMU_a" matches stored names regardless of separator style.
    // The whole group is parenthesised so it ANDs cleanly with other filters.
    if (isFilter(f.keyword)) {
      where.push(`(
        search_vector @@ plainto_tsquery('english', :keyword)
        OR dbname ILIKE :keywordLike
        OR dsname ILIKE :keywordLike
        OR (json->>'name') ILIKE :keywordLike
      )`);
      repl.keyword = String(f.keyword);
      repl.keywordLike = `%${String(f.keyword).replace(/[\s-]+/g, "%")}%`;
    }

    // File-type filter — array of extensions like [".jdb", ".snirf"].
    // Dataset-level: include rows whose (dbname, dsname) has at least one
    // iolinks file with a matching view (extension). Per-subject filtering
    // isn't possible here because iolinks.subj stores file size, not subj id.
    // Use IN (:array) — Sequelize replacements expand arrays as 'a','b','c',
    // which fits IN(...) but NOT ANY(...).
    if (Array.isArray(f.file_type) && f.file_type.length > 0) {
      where.push(`EXISTS (
        SELECT 1 FROM iolinks l
        WHERE l.dbname = ioviews.dbname
          AND l.dsname = ioviews.dsname
          AND l.view IN (:fileTypes)
      )`);
      repl.fileTypes = f.file_type.map((t) => String(t));
    }

    const limit = Math.min(parseInt(f.limit) || 100, 1000);
    const offset = parseInt(f.skip) || 0;
    repl.limit = limit;
    repl.offset = offset;

    // When file_type filter is active, also return a sample of the actual
    // matching iolinks rows (filename, url, path, suffix) per dataset, plus
    // a total count. Frontend shows up to 10 as clickable filenames and a
    // "Download manifest" button for the full list via a separate endpoint.
    const matchingFilesActive =
      Array.isArray(f.file_type) && f.file_type.length > 0;
    const matchingFilesColumn = matchingFilesActive
      ? `,
        COALESCE((
          SELECT jsonb_agg(t.json)
          FROM (
            SELECT l.json
            FROM iolinks l
            WHERE l.dbname = ioviews.dbname
              AND l.dsname = ioviews.dsname
              AND l.view IN (:fileTypes)
            ORDER BY l.id
            LIMIT 10
          ) t
        ), '[]'::jsonb)::text AS matching_files,
        (SELECT COUNT(*) FROM iolinks l
         WHERE l.dbname = ioviews.dbname
           AND l.dsname = ioviews.dsname
           AND l.view IN (:fileTypes))::int AS matching_files_total`
      : "";

    // dbinfo was stored flat ({name, subj, ...}); subjects was stored wrapped
    // ({key, value}). Frontend expects parsed.value.subj for datasets, so we
    // wrap dbinfo on the way out.
    const sql = `
      SELECT
        dbname,
        dsname,
        subj,
        CASE
          WHEN view = 'dbinfo' THEN jsonb_build_object('value', json)::text
          ELSE json::text
        END AS json${matchingFilesColumn}
      FROM ioviews
      WHERE ${where.join(" AND ")}
      ORDER BY dbname, dsname, subj
      LIMIT :limit OFFSET :offset
    `;

    const rows = await sequelize.query(sql, {
      replacements: repl,
      type: sequelize.QueryTypes.SELECT,
    });

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error searching all databases:", error.message);
    res.status(500).json({
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

// get dataset detail
const getDatasetDetail = async (req, res) => {
  try {
    const { dbName, datasetId } = req.params;
    const { rev } = req.query;

    const params = {
      revs_info: true,
    };

    if (rev) {
      params.rev = rev;
    }

    const response = await axios.get(
      `${COUCHDB_BASE_URL}/${dbName}/${datasetId}`,
      {
        headers: {
          Origin: "https://neurojson.io",
          "X-Requested-With": "XMLHttpRequest",
        },
        params,
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      `Error fetching dataset ${req.params.datasetId} from ${req.params.dbName}:`,
      error.message
    );
    res.status(error.response?.status || 500).json({
      message: "Error fetching dataset detail",
      error: error.message,
    });
  }
};

// get dataset metadata
const getDatasetMeta = async (req, res) => {
  try {
    const { dbName, datasetId } = req.params;
    const response = await axios.get(
      `${COUCHDB_BASE_URL}/${dbName}/_design/qq/_view/dbinfo`,
      {
        headers: {
          Origin: "https://neurojson.io",
          "X-Requested-With": "XMLHttpRequest",
        },
        params: {
          key: JSON.stringify(datasetId),
          // include_docs: true,
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      `Error fetching dataset metadata ${req.params.datasetId}:`,
      error.message
    );
    res.status(error.response?.status || 500).json({
      message: "Error fetching dataset metadata",
      error: error.message,
    });
  }
};

// search within a specific database
// const searchDatabase = async(req, res) => {

// }

// Downloadable list of every matching iolinks URL for a dataset.
// Three formats via ?format=:
//   - txt (default) → plain URL list (use with `wget -i`)
//   - sh             → bash script with curl commands (Mac/Linux)
//   - bat            → Windows batch script with curl commands
// All three avoid server-side zipping — the user's machine pulls files
// directly from neurojson.org/io, so this Express server stays light.
const getDatasetFilesManifest = async (req, res) => {
  try {
    const { dbName, dsName } = req.params;
    const rawExt = req.query.ext;
    const format = String(req.query.format || "txt").toLowerCase();
    const exts = Array.isArray(rawExt)
      ? rawExt
      : typeof rawExt === "string" && rawExt.length > 0
      ? rawExt.split(",")
      : [];

    if (exts.length === 0) {
      res.status(400).send("ext query parameter required (e.g. ?ext=.jdb)");
      return;
    }

    const rows = await sequelize.query(
      `SELECT json->'value'->>'url'  AS url,
              json->'value'->>'file' AS file
       FROM iolinks
       WHERE dbname = :dbname
         AND dsname = :dsname
         AND view IN (:exts)
       ORDER BY id`,
      {
        replacements: { dbname: dbName, dsname: dsName, exts },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const resolveUrl = (url) => {
      if (!url || url.startsWith("http")) return url;
      return `https://neurojson.org/io/stat.cgi?action=get&db=${dbName}&doc=${dsName}&${url}`;
    };
    const files = rows.filter((r) => r.url).map((r) => ({ ...r, url: resolveUrl(r.url) }));
    const urls = files.map((r) => r.url);
    const baseName = `${dbName}_${dsName}_${exts.join("_")}`;
    const extLabel = exts.join(", ");

    // Strip any path separators or quote chars from the parsed filename
    // before using it in shell commands — file names come from iolinks
    // and are usually content hashes, but defensive belt-and-suspenders.
    const safeName = (s) =>
      (s || "").replace(/["\\\/\r\n]/g, "").trim();

    let body;
    let contentType;
    let filename;

    if (format === "sh") {
      // Bash script — curl is preinstalled on macOS and most Linux distros.
      // -L follows redirects, -C - resumes interrupted downloads, -o saves
      // with our parsed filename (the URL is a CGI query — using -O would
      // save files as literal `stat.cgi?...`).
      body =
        `#!/bin/bash\n` +
        `# Downloads ${extLabel} files from ${dbName}/${dsName}\n` +
        `# Usage: bash ${baseName}_download.sh\n` +
        `set -e\n` +
        `mkdir -p "neurojson_downloads"\n` +
        `cd "neurojson_downloads" || exit 1\n` +
        files
          .map((r) => {
            const fn = safeName(r.file);
            return fn
              ? `curl -L -C - -o "${fn}" "${r.url}"`
              : `curl -L -C - -O "${r.url}"`;
          })
          .join("\n") +
        `\necho "Done. Files saved to $(pwd)"\n`;
      contentType = "application/x-sh; charset=utf-8";
      filename = `${baseName}_download.sh`;
    } else if (format === "bat") {
      // Windows batch — curl ships with Windows 10+. Uses CRLF line endings
      // for proper rendering in CMD. /d on cd handles cross-drive paths.
      body =
        `@echo off\r\n` +
        `REM Downloads ${extLabel} files from ${dbName}/${dsName}\r\n` +
        `REM Usage: double-click or run ${baseName}_download.bat\r\n` +
        `if not exist "neurojson_downloads" mkdir "neurojson_downloads"\r\n` +
        `cd /d "neurojson_downloads"\r\n` +
        files
          .map((r) => {
            const fn = safeName(r.file);
            return fn
              ? `curl -L -C - -o "${fn}" "${r.url}"`
              : `curl -L -C - -O "${r.url}"`;
          })
          .join("\r\n") +
        `\r\necho Done. Files saved to %cd%\r\n` +
        `pause\r\n`;
      contentType = "text/plain; charset=utf-8";
      filename = `${baseName}_download.bat`;
    } else {
      // Default: plain URL list, one per line (advanced users with wget).
      body = urls.join("\n") + "\n";
      contentType = "text/plain; charset=utf-8";
      filename = `${baseName}_manifest.txt`;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(body);
  } catch (error) {
    console.error("Error generating manifest:", error.message);
    res.status(500).send(`Error generating manifest: ${error.message}`);
  }
};

// distinct file extensions present in iolinks across all synced DBs.
// Drives the multi-select "File types" filter on the search page.
const getFileTypes = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT DISTINCT view AS type
       FROM iolinks
       WHERE view IS NOT NULL AND view <> ''
       ORDER BY view`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.status(200).json(rows.map((r) => r.type));
  } catch (error) {
    console.error("Error fetching file types:", error.message);
    res.status(500).json({
      message: "Error fetching file types",
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
  getDatasetDetail,
  getDatasetMeta,
  getFileTypes,
  getDatasetFilesManifest,
};
