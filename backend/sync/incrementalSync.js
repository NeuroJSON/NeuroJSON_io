"use strict";

require("dotenv").config();
const axios = require("axios");
const { sequelize } = require("../src/config/database");

const COUCHDB_URL = process.env.COUCHDB_URL || "https://neurojson.io:7777";

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
    // fallback to hardcoded list if registry fails
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

// get last synced sequence number for a database
async function getLastSeq(dbname) {
  try {
    const result = await sequelize.query(
      "SELECT last_seq FROM sync_state WHERE dbname = :dbname",
      {
        replacements: { dbname },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return result[0]?.last_seq || "0";
  } catch (err) {
    console.error(`Error getting last_seq for ${dbname}:`, err.message);
    return "0";
  }
}

// save latest sequence number after sync
async function saveLastSeq(dbname, seq) {
  await sequelize.query(
    `INSERT INTO sync_state (dbname, last_seq, synced_at)
     VALUES (:dbname, :seq, NOW())
     ON CONFLICT (dbname) DO UPDATE
     SET last_seq = :seq, synced_at = NOW()`,
    { replacements: { dbname, seq } }
  );
}

// upsert a row into ioviews
async function upsertIoview(dbname, dsname, subj, view, json) {
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
    }
  );
}

// insert a row into iolinks
async function insertIolink(dbname, dsname, subj, view, json) {
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
    }
  );
}

// delete all records for a dataset
async function deleteDataset(dbname, dsname) {
  await sequelize.query(
    "DELETE FROM ioviews WHERE dbname = :dbname AND dsname = :dsname",
    { replacements: { dbname, dsname } }
  );
  await sequelize.query(
    "DELETE FROM iolinks WHERE dbname = :dbname AND dsname = :dsname",
    { replacements: { dbname, dsname } }
  );
  console.log(`  Deleted ${dbname}/${dsname}`);
}

// first time sync - fetch from CouchDB views directly
async function firstSync(dbname) {
  console.log(`  ${dbname}: first sync, fetching all views...`);

  // fetch dbinfo view
  const dbinfoRes = await axios.get(
    `${COUCHDB_URL}/${dbname}/_design/qq/_view/dbinfo`
  );
  const dbinfoRows = dbinfoRes.data.rows || [];
  for (const row of dbinfoRows) {
    const subj = String(row.value?.subj?.length || 0);
    await upsertIoview(dbname, row.id, subj, "dbinfo", row.value);
  }
  console.log(`  ${dbname}: dbinfo synced (${dbinfoRows.length} rows)`);

  // fetch subjects view
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

  // fetch links view
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

// incremental sync - only fetch changes since last sync
async function incrementalSync(dbname, lastSeq) {
  const { data } = await axios.get(
    `${COUCHDB_URL}/${dbname}/_changes?since=${lastSeq}&include_docs=true`
  );

  if (data.results.length === 0) {
    console.log(`  ${dbname}: no changes since last sync`);
    return data.last_seq;
  }

  console.log(`  ${dbname}: ${data.results.length} changes found`);

  for (const change of data.results) {
    if (change.deleted) {
      await deleteDataset(dbname, change.id);
      continue;
    }

    const doc = change.doc;
    if (!doc?.value) continue;

    // upsert dbinfo
    if (doc.value.subj && Array.isArray(doc.value.subj)) {
      const subj = String(doc.value.subj.length);
      await upsertIoview(dbname, change.id, subj, "dbinfo", doc.value);
    }

    // upsert subjects
    if (doc.value.subjects) {
      for (const [subjId, subjData] of Object.entries(doc.value.subjects)) {
        await upsertIoview(dbname, change.id, subjId, "subjects", {
          key: subjData.key,
          value: subjData.value,
        });
      }
    }

    // upsert links
    if (doc.value.links) {
      for (const link of doc.value.links) {
        const fileType = link.key?.[0];
        const subjId = String(link.key?.[1] || "");
        await insertIolink(dbname, change.id, subjId, fileType, link);
      }
    }
  }

  return data.last_seq;
}

// sync a single database
async function syncDatabase(dbname) {
  console.log(`\nSyncing ${dbname}...`);
  const lastSeq = await getLastSeq(dbname);

  try {
    if (lastSeq === "0") {
      await firstSync(dbname);
    } else {
      await incrementalSync(dbname, lastSeq);
    }

    // get and save the latest seq number
    const { data: info } = await axios.get(`${COUCHDB_URL}/${dbname}`);
    await saveLastSeq(dbname, String(info.update_seq));
    console.log(`  ${dbname}: sync complete ✓`);
  } catch (err) {
    console.error(`  ${dbname}: sync failed - ${err.message}`);
  }
}

// main function
async function runSync() {
  console.log("=== Starting NeuroJSON sync ===");
  console.log(new Date().toISOString());
  console.log(`CouchDB: ${COUCHDB_URL}`);
  console.log(`Databases: ${DATABASES.length}`);

  // change to getDatabases() when ready for full sync
  // const databases = await getDatabases();
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
