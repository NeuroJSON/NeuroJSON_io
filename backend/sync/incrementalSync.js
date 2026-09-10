"use strict";

require("dotenv").config();
const axios = require("axios");
const { sequelize } = require("../src/config/database");

const COUCHDB_URL = process.env.COUCHDB_URL || "https://neurojson.io:7777";
const CONCURRENCY = 5;

// fetch database list dynamically from registry
// registry doc shape: { database: [{ id, name, ... }, ...] }
async function getDatabases() {
  // Optional override for testing/ops: sync only the named databases instead
  // of the full registry, without touching the shared sys/registry doc.
  //   SYNC_DBS=sandbox1d,bfnirs node sync/incrementalSync.js
  if (process.env.SYNC_DBS) {
    const databases = process.env.SYNC_DBS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`SYNC_DBS override: ${databases.join(", ")}`);
    return databases;
  }
  const response = await axios.get(`${COUCHDB_URL}/sys/registry`);
  const entries = response.data?.database || [];
  const databases = entries.map((db) => db.id).filter(Boolean);
  console.log(`Found ${databases.length} databases in registry`);
  return databases;
}

// === Local ports of CouchDB _design/qq map functions ===
// 1:1 ports of dbinfo / subjects / links views. If upstream views change,
// these drift silently.

function transformDbinfo(doc) {
  const txt = doc["README"] || doc["README.md"] || doc["README.rst"] || "";
  const rawtext = JSON.stringify(doc);
  const datainfo = doc["dataset_description.json"] || { Name: doc._id };
  const subjlist = [];
  const modalitylist = [];

  for (const item of Object.keys(doc)) {
    if (item.indexOf("ub-") !== -1) {
      subjlist.push(item);
      for (const modal of Object.keys(doc[item] || {})) {
        if (modal.indexOf("ses") === 0) {
          for (const m of Object.keys(doc[item][modal] || {})) {
            if (m.indexOf(".") === -1 && modalitylist.indexOf(m) === -1) {
              modalitylist.push(m);
            }
          }
        } else if (
          modal.indexOf(".") === -1 &&
          modalitylist.indexOf(modal) === -1
        ) {
          modalitylist.push(modal);
        }
      }
    }
  }

  if (subjlist.length === 0) subjlist.push("nonbids");

  if (modalitylist.length === 0) {
    if (rawtext.indexOf('"MeshNode"') !== -1) modalitylist.push("JMesh");
    if (rawtext.indexOf('"NIFTIData"') !== -1) modalitylist.push("JNIFTI");
    if (rawtext.indexOf('"SNIRFData"') !== -1) modalitylist.push("JSNIRF");
    if (rawtext.indexOf('"_ArrayType_"') !== -1) modalitylist.push("JData");
  }

  return {
    name: datainfo.Name,
    length: rawtext.length,
    readme: String(txt).substr(0, 256),
    info: datainfo,
    subj: subjlist,
    modality: modalitylist,
  };
}

function transformSubjects(doc) {
  const results = [];
  const skipIds = ["sidecards", "derivatives", "sourcedata", "code"];
  if (skipIds.indexOf(doc._id) !== -1) return results;

  for (const subj of Object.keys(doc)) {
    if (!/^[sS]ub-/.test(subj)) continue;

    const sessionlist = [];
    const modalitylist = [];
    const tasklist = [];
    const runlist = [];
    const filetype = [];
    let age = -0.01;
    let gender = "N";

    const p = doc["participants.tsv"];
    if (p && Array.isArray(p.participant_id)) {
      let idx = -1;
      for (let i = 0; i < p.participant_id.length; i++) {
        if (subj.indexOf(String(p.participant_id[i])) > -1) {
          idx = i;
          break;
        }
      }

      if (idx >= 0) {
        for (const agekey of ["age", "age_scan", "age_at_scan"]) {
          if (age >= 0) break;
          if (p[agekey]) {
            age = p[agekey][idx];
            break;
          } else if (p[agekey.toUpperCase()]) {
            age = p[agekey.toUpperCase()][idx];
            break;
          } else {
            const cap = agekey.charAt(0).toUpperCase() + agekey.slice(1);
            if (p[cap]) {
              age = p[cap]; // matches upstream view (drops [idx] here)
              break;
            }
          }
        }
        if (age < 0) {
          for (const pfield of Object.keys(p)) {
            if (pfield.toLowerCase().indexOf("age") >= 0) {
              age = p[pfield][idx];
            }
          }
        }
        for (const sexkey of ["sex", "gender"]) {
          if (gender !== "N") break;
          if (p[sexkey]) {
            gender = p[sexkey][idx];
            break;
          } else if (p[sexkey.toUpperCase()]) {
            gender = p[sexkey.toUpperCase()][idx];
            break;
          } else {
            const cap = sexkey.charAt(0).toUpperCase() + sexkey.slice(1);
            if (p[cap]) {
              gender = p[cap]; // matches upstream view (drops [idx] here)
              break;
            }
          }
        }
        if (gender === "N") {
          for (const pfield of Object.keys(p)) {
            if (pfield.toLowerCase().indexOf("sex") >= 0) {
              gender = p[pfield][idx];
            }
          }
        }
        if (gender === "N") {
          for (const pfield of Object.keys(p)) {
            if (pfield.toLowerCase().indexOf("gender") >= 0) {
              gender = p[pfield][idx];
            }
          }
        }
      }
    }

    const subjDoc = doc[subj] || {};
    const parseFiles = (container) => {
      for (const filename of Object.keys(container || {})) {
        for (const task of filename.split("_")) {
          if (task.indexOf("run-") === 0) {
            if (runlist.indexOf(task.substring(4)) === -1) {
              runlist.push(task.substring(4));
            }
          } else if (task.indexOf("task-") === 0) {
            if (tasklist.indexOf(task.substring(5)) === -1) {
              tasklist.push(task.substring(5));
            }
          } else if (task.indexOf(".") > 0) {
            const tmp = task.substring(0, task.indexOf("."));
            if (filetype.indexOf(tmp) === -1) filetype.push(tmp);
          }
        }
      }
    };

    for (const modal of Object.keys(subjDoc)) {
      if (modal.indexOf("ses-") === 0) {
        if (sessionlist.indexOf(modal.substring(4)) === -1) {
          sessionlist.push(modal.substring(4));
        }
        for (const modname of Object.keys(subjDoc[modal] || {})) {
          if (
            modname.indexOf(".") === -1 &&
            modalitylist.indexOf(modname) === -1
          ) {
            modalitylist.push(modname);
          }
          parseFiles(subjDoc[modal][modname]);
        }
      } else if (
        modal.indexOf(".") === -1 &&
        modalitylist.indexOf(modal) === -1
      ) {
        modalitylist.push(modal);
        parseFiles(subjDoc[modal]);
      }
    }

    if (typeof gender === "string") {
      gender = gender.substring(0, 1).toUpperCase();
    } else {
      gender = gender + "";
    }
    if (typeof age === "string" && isNaN(+age)) age = -0.001;
    if (typeof age === "string") age = +age;
    if (age < 0) age = -0.01;
    age = Math.floor(age * 100);

    results.push({
      id: doc._id,
      key: [
        ("0000" + age).slice(-5),
        ("000" + gender).slice(-4),
        ("000" + sessionlist.length).slice(-4),
        ("000" + modalitylist.length).slice(-4),
        ("000" + tasklist.length).slice(-4),
        ("000" + runlist.length).slice(-4),
        subj.substring(4),
      ],
      value: {
        sessions: sessionlist,
        modalities: modalitylist,
        tasks: tasklist,
        runs: runlist,
        types: filetype,
      },
    });
  }

  return results;
}

// transformLinks() removed: links now come straight from the CouchDB links
// view (id-first key [doc._id, ext, size]) in both firstSync and
// processDatasetUpdate, so there's a single source of truth and no regex
// drift between the two paths.

// === DB helpers (each accepts an optional transaction) ===

async function getLastSeq(dbname) {
  try {
    const result = await sequelize.query(
      "SELECT last_seq FROM sync_state WHERE dbname = :dbname",
      { replacements: { dbname }, type: sequelize.QueryTypes.SELECT }
    );
    return result[0]?.last_seq || "0";
  } catch (err) {
    console.error(`Error getting last_seq for ${dbname}:`, err.message);
    return "0";
  }
}

async function saveLastSeq(dbname, seq) {
  await sequelize.query(
    `INSERT INTO sync_state (dbname, last_seq, synced_at)
     VALUES (:dbname, :seq, NOW())
     ON CONFLICT (dbname) DO UPDATE
     SET last_seq = :seq, synced_at = NOW()`,
    { replacements: { dbname, seq: String(seq) } }
  );
}

// Postgres jsonb rejects the null-byte escape with "unsupported Unicode
// escape sequence", so strip it from the serialized JSON before insert.
// Seen in openneuro README/TSV fields containing stray null bytes.
function safeStringify(obj) {
  return JSON.stringify(obj).replace(/\\u0000/g, "");
}

// A valid file type is a dot-prefixed extension with no slashes and
// a reasonable length. Some CouchDB links view rows (e.g. openneuro)
// emit paths like ".0/libraries/FID-A/..." where the version number
// gets parsed as a fake extension — reject those.
function isValidFileType(ext) {
  return (
    typeof ext === "string" &&
    ext.startsWith(".") &&
    !ext.includes("/") &&
    ext.length <= 20
  );
}

async function upsertIoview(dbname, dsname, subj, view, json, transaction) {
  const payload = safeStringify(json);
  await sequelize.query(
    `INSERT INTO ioviews (dbname, dsname, subj, view, json, search_vector, updated_at)
     VALUES (:dbname, :dsname, :subj, :view, :json, to_tsvector('english', :text), NOW())
     ON CONFLICT (dbname, dsname, subj, view) DO UPDATE
     SET json = :json,
         search_vector = to_tsvector('english', :text),
         updated_at = NOW()`,
    {
      replacements: {
        dbname,
        dsname,
        subj: String(subj),
        view,
        json: payload,
        text: payload,
      },
      transaction,
    }
  );
}

async function insertIolink(dbname, dsname, subj, view, json, transaction) {
  await sequelize.query(
    `INSERT INTO iolinks (dbname, dsname, subj, view, json)
     VALUES (:dbname, :dsname, :subj, :view, :json)`,
    {
      replacements: {
        dbname,
        dsname,
        subj: String(subj),
        view,
        json: safeStringify(json),
      },
      transaction,
    }
  );
}

// Record one dataset-level change for a sync run. Deduped by the unique
// (history_id, dbname, dsname) index, so a dataset touched twice in one run
// keeps its first logged change_type. Must share the same transaction as the
// data write so the log rolls back if the write fails.
async function logDatasetChange(
  historyId,
  dbname,
  dsname,
  changeType,
  transaction
) {
  if (!historyId) return; // only the incremental path logs; firstSync passes none
  await sequelize.query(
    `INSERT INTO dataset_changes (history_id, dbname, dsname, change_type)
     VALUES (:historyId, :dbname, :dsname, :changeType)
     ON CONFLICT (history_id, dbname, dsname) DO NOTHING`,
    {
      replacements: { historyId, dbname, dsname, changeType },
      transaction,
    }
  );
}

async function deleteDataset(dbname, dsname, transaction) {
  await sequelize.query(
    "DELETE FROM ioviews WHERE dbname = :dbname AND dsname = :dsname",
    { replacements: { dbname, dsname }, transaction }
  );
  await sequelize.query(
    "DELETE FROM iolinks WHERE dbname = :dbname AND dsname = :dsname",
    { replacements: { dbname, dsname }, transaction }
  );
}

// === First-time sync (fetch all three views once) ===

// Fetch a view, treating 404 as "view doesn't exist on this DB" (returns []).
// Non-BIDS DBs (e.g. brainmeshlibrary) only have the dbinfo view.
async function fetchView(dbname, viewName) {
  try {
    const res = await axios.get(
      `${COUCHDB_URL}/${dbname}/_design/qq/_view/${viewName}`
    );
    return res.data.rows || [];
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`  ${dbname}: view '${viewName}' not present, skipping`);
      return [];
    }
    throw err;
  }
}

async function firstSync(dbname) {
  console.log(`  ${dbname}: first sync, fetching all views...`);

  const dbinfoRows = await fetchView(dbname, "dbinfo");
  for (const row of dbinfoRows) {
    const subj = String(row.value?.subj?.length || 0);
    await upsertIoview(dbname, row.id, subj, "dbinfo", row.value);
  }
  console.log(`  ${dbname}: dbinfo synced (${dbinfoRows.length} rows)`);

  const subjectRows = await fetchView(dbname, "subjects");
  for (const row of subjectRows) {
    const subj = String(row.key?.[6] || "");
    await upsertIoview(dbname, row.id, subj, "subjects", {
      key: row.key,
      value: row.value,
    });
  }
  console.log(`  ${dbname}: subjects synced (${subjectRows.length} rows)`);

  const linkRows = await fetchView(dbname, "links");
  let linkCount = 0;
  for (const row of linkRows) {
    // links view key is now [doc._id, ext, size]
    const fileType = row.key?.[1];
    if (!isValidFileType(fileType)) continue;
    const subjId = String(row.key?.[2] || "");
    await insertIolink(dbname, row.id, subjId, fileType, {
      key: row.key,
      value: row.value,
    });
    linkCount++;
  }
  console.log(`  ${dbname}: links synced (${linkCount}/${linkRows.length} rows)`);
}

// === Process one changed dataset (Option A: 2 HTTP requests + local transforms) ===

async function processDatasetUpdate(dbname, dsname, historyId) {
  // dbinfo view supports key filtering; raw doc carries subjects; links view
  // is now filterable by dataset id (key = [doc._id, ext, size]) via a range
  // query, so links come straight from the view — same source as firstSync.
  const keyParam = encodeURIComponent(JSON.stringify(dsname));
  const linkStart = encodeURIComponent(JSON.stringify([dsname]));
  const linkEnd = encodeURIComponent(JSON.stringify([dsname, {}]));
  const [dbinfoRes, rawDocRes, linkRes] = await Promise.all([
    axios.get(
      `${COUCHDB_URL}/${dbname}/_design/qq/_view/dbinfo?key=${keyParam}`
    ),
    axios.get(`${COUCHDB_URL}/${dbname}/${encodeURIComponent(dsname)}`),
    axios
      .get(
        `${COUCHDB_URL}/${dbname}/_design/qq/_view/links?startkey=${linkStart}&endkey=${linkEnd}`
      )
      .catch((err) => {
        // DBs without a links view (404) → treat as no links.
        if (err.response?.status === 404) return { data: { rows: [] } };
        throw err;
      }),
  ]);

  const dbinfoRow = (dbinfoRes.data.rows || [])[0];
  if (!dbinfoRow) {
    console.warn(`  ${dbname}/${dsname}: no dbinfo row, skipping`);
    return;
  }
  const dbinfoValue = dbinfoRow.value;
  const doc = rawDocRes.data;

  const subjectRows = transformSubjects(doc);
  const linkRows = linkRes.data.rows || [];

  // Rule 1: wrap all writes for this dataset in one transaction.
  await sequelize.transaction(async (t) => {
    // Determine added vs updated BEFORE the dbinfo upsert (which would create
    // the row and make every dataset look pre-existing). Same transaction as
    // the write so the change log is consistent with the data.
    const existing = await sequelize.query(
      `SELECT 1 FROM ioviews
        WHERE dbname = :dbname AND dsname = :dsname AND view = 'dbinfo' LIMIT 1`,
      { replacements: { dbname, dsname }, transaction: t, type: sequelize.QueryTypes.SELECT }
    );
    const changeType = existing.length > 0 ? "updated" : "added";

    const subjCount = String(dbinfoValue?.subj?.length || 0);
    await upsertIoview(dbname, dsname, subjCount, "dbinfo", dbinfoValue, t);

    // Rule 2: empty-subjs guard. NOT IN (NULL) silently matches nothing.
    const currentSubjs = Array.isArray(dbinfoValue?.subj)
      ? dbinfoValue.subj
      : [];
    if (currentSubjs.length > 0) {
      // subjects view stores subj without "sub-"/"Sub-" prefix
      // (key[6] = subj.substring(4) in upstream map).
      const currentSubjIds = currentSubjs.map((s) => s.substring(4));
      await sequelize.query(
        `DELETE FROM ioviews
         WHERE dbname = :dbname AND dsname = :dsname AND view = 'subjects'
           AND subj NOT IN (:subjs)`,
        {
          replacements: { dbname, dsname, subjs: currentSubjIds },
          transaction: t,
        }
      );
    }

    for (const row of subjectRows) {
      const subj = String(row.key?.[6] || "");
      await upsertIoview(
        dbname,
        dsname,
        subj,
        "subjects",
        { key: row.key, value: row.value },
        t
      );
    }

    // iolinks: no usable upsert key, so delete + reinsert per dataset.
    await sequelize.query(
      "DELETE FROM iolinks WHERE dbname = :dbname AND dsname = :dsname",
      { replacements: { dbname, dsname }, transaction: t }
    );
    for (const row of linkRows) {
      // links view key is [doc._id, ext, size]
      const fileType = row.key?.[1];
      if (!isValidFileType(fileType)) continue;
      const subjId = String(row.key?.[2] || "");
      await insertIolink(
        dbname,
        dsname,
        subjId,
        fileType,
        { key: row.key, value: row.value },
        t
      );
    }

    // Log the dataset-level change in the SAME transaction as the data write.
    await logDatasetChange(historyId, dbname, dsname, changeType, t);
  });
}

// === Incremental sync ===

async function incrementalSync(dbname, lastSeq, historyId) {
  // No include_docs=true: we fetch the raw doc per dataset so the _changes
  // payload stays small and per-dataset work runs in parallel.
  const { data } = await axios.get(
    `${COUCHDB_URL}/${dbname}/_changes?since=${encodeURIComponent(lastSeq)}`
  );

  if (!data.results || data.results.length === 0) {
    console.log(`  ${dbname}: no changes since last sync`);
    return data.last_seq;
  }

  const changes = data.results.filter(
    (c) => c.id && !c.id.startsWith("_design/")
  );
  console.log(
    `  ${dbname}: ${changes.length} dataset changes (raw=${data.results.length})`
  );

  // Rule 3: bounded concurrency + per-dataset try/catch.
  for (let i = 0; i < changes.length; i += CONCURRENCY) {
    const chunk = changes.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (change) => {
        try {
          if (change.deleted) {
            // deleteDataset + change log share one transaction.
            await sequelize.transaction(async (t) => {
              await deleteDataset(dbname, change.id, t);
              await logDatasetChange(
                historyId,
                dbname,
                change.id,
                "deleted",
                t
              );
            });
            console.log(`  ${dbname}/${change.id}: deleted`);
          } else {
            await processDatasetUpdate(dbname, change.id, historyId);
          }
        } catch (err) {
          console.error(`  ${dbname}/${change.id}: failed - ${err.message}`);
        }
      })
    );
  }

  // Rule 4: return last_seq from THIS response. Never re-fetch update_seq
  // afterward (writes during sync would be silently skipped).
  return data.last_seq;
}

// === Sync a single database ===

async function syncDatabase(dbname, historyId) {
  console.log(`\nSyncing ${dbname}...`);
  const lastSeq = await getLastSeq(dbname);

  try {
    let nextSeq;
    if (lastSeq === "0") {
      // Rule 5: capture update_seq BEFORE firstSync. Writes during firstSync
      // get picked up by the next incremental run.
      const { data: info } = await axios.get(`${COUCHDB_URL}/${dbname}`);
      const seqAtStart = String(info.update_seq);
      // firstSync intentionally receives no historyId → it never logs to
      // dataset_changes (a full/first sync must not mass-record every dataset).
      await firstSync(dbname);
      nextSeq = seqAtStart;
    } else {
      nextSeq = await incrementalSync(dbname, lastSeq, historyId);
    }

    await saveLastSeq(dbname, String(nextSeq));
    console.log(`  ${dbname}: sync complete ✓`);
  } catch (err) {
    console.error(`  ${dbname}: sync failed - ${err.message}`);
  }
}

// === stats_history: one row per sync run ===

// Insert a 'running' row at sync start; return its id. The id will also back
// per-entity change logging (db_change_log) in a later phase.
async function createStatsHistory() {
  const [rows] = await sequelize.query(
    `INSERT INTO stats_history (started_at, status)
     VALUES (NOW(), 'running') RETURNING id`
  );
  return rows[0].id;
}

// Finalize the run's row. On success, compute totals from the fully-synced
// tables (done ONCE here, never per landing-page visit); on failure, record
// the error. Totals stay NULL for a failed/partial run.
async function finalizeStatsHistory(id, status, errorMessage) {
  if (status !== "success") {
    await sequelize.query(
      `UPDATE stats_history
          SET completed_at = NOW(), status = :status, error = :error
        WHERE id = :id`,
      { replacements: { id, status, error: errorMessage || null } }
    );
    return;
  }
  await sequelize.query(
    `UPDATE stats_history SET
        completed_at     = NOW(),
        status           = 'success',
        total_datasets   = (SELECT count(*) FROM ioviews WHERE view = 'dbinfo'),
        total_subjects   = (SELECT count(*) FROM ioviews WHERE view = 'subjects'),
        total_files      = (SELECT count(*) FROM iolinks),
        total_size_bytes = (SELECT COALESCE(
                              sum(CASE WHEN subj ~ '^[0-9]+$' THEN subj::bigint ELSE 0 END), 0)
                            FROM iolinks)
      WHERE id = :id`,
    { replacements: { id } }
  );
}

// === Main ===

async function runSync() {
  console.log("=== Starting NeuroJSON sync ===");
  console.log(new Date().toISOString());
  console.log(`CouchDB: ${COUCHDB_URL}`);

  // Create the run's history row up front so it exists throughout the sync.
  const historyId = await createStatsHistory();

  try {
    const databases = await getDatabases();
    console.log(`Databases: ${databases.length}`);

    for (const db of databases) {
      await syncDatabase(db, historyId);
    }

    // Compute + publish totals only after the whole run completed.
    await finalizeStatsHistory(historyId, "success");
    console.log(`\n=== Sync complete (stats_history #${historyId}) ===`);
    console.log(new Date().toISOString());
  } catch (err) {
    await finalizeStatsHistory(historyId, "failed", err.message);
    throw err;
  } finally {
    await sequelize.close();
  }
}

runSync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
