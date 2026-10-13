// Frontend copy of the CouchDB `_design/qq` "dbinfo" view (also mirrored by
// transformDbinfo in backend/sync/incrementalSync.js). Used in PREVIEW mode,
// where a not-yet-published dataset has no dbinfo row, so the metadata panel
// shows the same subjects / modality the public page will show later.
// Keep in sync with the CouchDB view if it changes.
export const dbinfoFromDoc = (doc: any) => {
  const txt = doc["README"] || doc["README.md"] || doc["README.rst"] || "";
  const rawtext = JSON.stringify(doc);
  const datainfo = doc["dataset_description.json"]
    ? { ...doc["dataset_description.json"] }
    : { Name: doc._id };
  if (doc[".datainfo"]) datainfo[".datainfo"] = doc[".datainfo"];

  const subjlist: string[] = [];
  const modalitylist: string[] = [];
  for (const item of Object.keys(doc)) {
    if (item.indexOf("ub-") === -1) continue;
    subjlist.push(item);
    const node = doc[item];
    if (!node || typeof node !== "object") continue;
    for (const modal of Object.keys(node)) {
      if (modal.indexOf("ses") === 0) {
        const ses = node[modal];
        if (!ses || typeof ses !== "object") continue;
        for (const m of Object.keys(ses)) {
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
    aisummary: doc[".datainfo"]?.AISummary || "",
  };
};

// Same shape the page gets from fetchDbInfoByDatasetId (rows[0].value).
export const previewViewInfo = (doc: any) =>
  doc ? { rows: [{ value: dbinfoFromDoc(doc) }] } : null;
