"use strict";

require("dotenv").config();
const axios = require("axios");
const { sequelize } = require("../src/config/database");

const COUCHDB_URL = process.env.COUCHDB_URL || "https://neurojson.io:7777";
const CONCURRENCY = 5;

// fetch database list dynamically from registry
async function getDatabases() {
  try {
    const response = await axios.get(`${COUCHDB_URL}/sys/registry`);
    const databases = response.data
      .map((db) => db.id)
      .filter((id) => id && id !== "sys");
    console.log(`Found ${databases.length} databases in registry`);
    return databases;
  } catch (err) {
    console.error("Failed to fetch registry:", err.message);
    return [
      "openneuro",
      "abide",
      "abide2",
      "datalad-registry",
      "adhd200",
      "bfnirs",
      "mcx",
      "mmc",
      "ucl-4d-neonatal-head-model",
      "unc-012-infant-atlas",
      "unc-infant-cortical-surface-atlas",
      "cotilab",
      "emnist",
      "nemo-bids",
      "openfnirs",
    ];
  }
}

// === Local ports of CouchDB _design/qq map functions ===
// 1:1 ports of dbinfo / subjects / links views. If upstream views change,
// these drift silently.

function transformDbinfo(doc) {
  const txt =
    doc["README"] || doc["README.md"] || doc["README.rst"] || "";
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

function transformLinks(doc) {
  const results = [];
  const filenameRe = /file=([^\/]*\/)*([^&\/\.]+)(\.[^.&%:]+(\.gz)*)([&:].*)*$/;
  const filesizeRe = /size=(\d+)/;
  const jsonpathRe = /:(\$[^&]+)/;
  const urlhash = {};

  function traverse(obj, level, rootpath) {
    if (level > 10) return;
    if (obj === null || typeof obj !== "object") return;

    for (const subkey of Object.keys(obj)) {
      const v = obj[subkey];
      if (
        subkey === "_DataLink_" &&
        typeof v === "string" &&
        v.indexOf("http") !== -1
      ) {
        const url = v;
        const uniqurl = url.split(":$")[0];
        if (!Object.prototype.hasOwnProperty.call(urlhash, uniqurl)) {
          const fname = url.match(filenameRe);
          const fsize = url.match(filesizeRe);
          let jpath = url.match(jsonpathRe);
          if (jpath !== null && jpath.length) jpath = jpath[1];
          urlhash[uniqurl] = 1;
          if (fname && fsize) {
            results.push({
              id: doc._id,
              key: [fname[3], parseInt(fsize[1], 10)],
              value: {
                path: rootpath,
                url: uniqurl,
                file: fname[2] + fname[3],
                suffix: fname[3],
                ref: jpath,
              },
            });
          }
        }
      }
      if (typeof v === "object" && v !== null) {
        traverse(v, level + 1, rootpath + "." + subkey);
      }
    }
  }

  traverse(doc, 1, "$");
  return results;
}

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

async function upsertIoview(dbname, dsname, subj, view, json, transaction) {
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
        json: JSON.stringify(json),
        text: JSON.stringify(json),
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
        json: JSON.stringify(json),
      },
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

async function firstSync(dbname) {
  console.log(`  ${dbname}: first sync, fetching all views...`);

  const dbinfoRes = await axios.get(
    `${COUCHDB_URL}/${dbname}/_design/qq/_view/dbinfo`
  );
  const dbinfoRows = dbinfoRes.data.rows || [];
  for (const row of dbinfoRows) {
    const subj = String(row.value?.subj?.length || 0);
    await upsertIoview(dbname, row.id, subj, "dbinfo", row.value);
  }
  console.log(`  ${dbname}: dbinfo synced (${dbinfoRows.length} rows)`);

  const subjectsRes = await axios.get(
    `${COUCHDB_URL}/${dbname}/_design/qq/_view/subjects`
  );
  const subjectRows = subjectsRes.data.rows || [];
  for (const row of subjectRows) {
    const subj = String(row.key?.[6] || "");
    await upsertIoview(dbname, row.id, subj, "subjects", {
      key: row.key,
      value: row.value,
    });
  }
  console.log(`  ${dbname}: subjects synced (${subjectRows.length} rows)`);

  const linksRes = await axios.get(
    `${COUCHDB_URL}/${dbname}/_design/qq/_view/links`
  );
  const linkRows = linksRes.data.rows || [];
  for (const row of linkRows) {
    const fileType = row.key?.[0];
    const subjId = String(row.key?.[1] || "");
    await insertIolink(dbname, row.id, subjId, fileType, {
      key: row.key,
      value: row.value,
    });
  }
  console.log(`  ${dbname}: links synced (${linkRows.length} rows)`);
}

// === Process one changed dataset (Option A: 2 HTTP requests + local transforms) ===

async function processDatasetUpdate(dbname, dsname) {
  // dbinfo view supports key filtering; raw doc carries everything else.
  const keyParam = encodeURIComponent(JSON.stringify(dsname));
  const [dbinfoRes, rawDocRes] = await Promise.all([
    axios.get(
      `${COUCHDB_URL}/${dbname}/_design/qq/_view/dbinfo?key=${keyParam}`
    ),
    axios.get(`${COUCHDB_URL}/${dbname}/${encodeURIComponent(dsname)}`),
  ]);

  const dbinfoRow = (dbinfoRes.data.rows || [])[0];
  if (!dbinfoRow) {
    console.warn(`  ${dbname}/${dsname}: no dbinfo row, skipping`);
    return;
  }
  const dbinfoValue = dbinfoRow.value;
  const doc = rawDocRes.data;

  const subjectRows = transformSubjects(doc);
  const linkRows = transformLinks(doc);

  // Rule 1: wrap all writes for this dataset in one transaction.
  await sequelize.transaction(async (t) => {
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
      const fileType = row.key?.[0];
      const subjId = String(row.key?.[1] || "");
      await insertIolink(
        dbname,
        dsname,
        subjId,
        fileType,
        { key: row.key, value: row.value },
        t
      );
    }
  });
}

// === Incremental sync ===

async function incrementalSync(dbname, lastSeq) {
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
            await sequelize.transaction((t) =>
              deleteDataset(dbname, change.id, t)
            );
            console.log(`  ${dbname}/${change.id}: deleted`);
          } else {
            await processDatasetUpdate(dbname, change.id);
          }
        } catch (err) {
          console.error(
            `  ${dbname}/${change.id}: failed - ${err.message}`
          );
        }
      })
    );
  }

  // Rule 4: return last_seq from THIS response. Never re-fetch update_seq
  // afterward (writes during sync would be silently skipped).
  return data.last_seq;
}

// === Sync a single database ===

async function syncDatabase(dbname) {
  console.log(`\nSyncing ${dbname}...`);
  const lastSeq = await getLastSeq(dbname);

  try {
    let nextSeq;
    if (lastSeq === "0") {
      // Rule 5: capture update_seq BEFORE firstSync. Writes during firstSync
      // get picked up by the next incremental run.
      const { data: info } = await axios.get(`${COUCHDB_URL}/${dbname}`);
      const seqAtStart = String(info.update_seq);
      await firstSync(dbname);
      nextSeq = seqAtStart;
    } else {
      nextSeq = await incrementalSync(dbname, lastSeq);
    }

    await saveLastSeq(dbname, String(nextSeq));
    console.log(`  ${dbname}: sync complete ✓`);
  } catch (err) {
    console.error(`  ${dbname}: sync failed - ${err.message}`);
  }
}

// === Main ===

async function runSync() {
  console.log("=== Starting NeuroJSON sync ===");
  console.log(new Date().toISOString());
  console.log(`CouchDB: ${COUCHDB_URL}`);

  // change to await getDatabases() when ready for full sync
  const databases = ["bfnirs"]; // testing with small database first
  console.log(`Databases: ${databases.length}`);

  for (const db of databases) {
    await syncDatabase(db);
  }

  await sequelize.close();
  console.log("\n=== Sync complete ===");
  console.log(new Date().toISOString());
}

runSync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
