import type { LinkMeta, TreeNode } from "./types";

export const isPreviewable = (url: string) =>
  /\.(nii(\.gz)?|bnii|jdt|jdb|jmsh|bmsh)$/i.test(
    (url.match(/file=([^&]+)/)?.[1] ?? url).toLowerCase()
  );

export const formatLeafValue = (v: any): string => {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number" || t === "boolean") return String(v);
  if (t === "string") return v.length > 120 ? v.slice(0, 120) + "…" : v;
  if (Array.isArray(v)) {
    const n = v.length;
    const head = v
      .slice(0, 5)
      .map((x) => (typeof x === "number" ? x : JSON.stringify(x)));
    return n <= 5
      ? `[${head.join(", ")}]`
      : `[${head.join(", ")}, …] (${n} items)`;
  }
  return ""; // if it is object, return as a folder
};

// ignore meta keys
// export const shouldSkipKey = (key: string) =>
//   key === "_id" || key === "_rev" || key.startsWith(".");
export const shouldSkipKey = (_key: string) => false;

// build path -> {url, index} lookup, built from extractDataLinks function
// if external link objects have {path, url, index}, build a Map for the tree
export const makeLinkMap = <
  T extends { path: string; url: string; index: number }
>(
  links: T[]
): Map<string, LinkMeta> => {
  const m = new Map<string, LinkMeta>();
  links.forEach((l) => m.set(l.path, { url: l.url, index: l.index }));
  return m;
};

// Recursively convert the dataset JSON to a file-tree
// export const buildTreeFromDoc = (
//   doc: any,
//   linkMap: Map<string, LinkMeta>,
//   curPath = ""
// ): TreeNode[] => {
//   if (!doc || typeof doc !== "object") return [];
//   const out: TreeNode[] = [];

//   Object.keys(doc).forEach((key) => {
//     if (shouldSkipKey(key)) return;

//     const val = doc[key];
//     const path = `${curPath}/${key}`;
//     const link = linkMap.get(path);

//     if (link) {
//       out.push({ kind: "file", name: key, path, link });
//       return;
//     }

//     if (val && typeof val === "object" && !Array.isArray(val)) {
//       out.push({
//         kind: "folder",
//         name: key,
//         path,
//         children: buildTreeFromDoc(val, linkMap, path),
//       });
//       return;
//     }

//     out.push({ kind: "file", name: key, path, value: val });
//   });

//   return out;
// };
export const buildTreeFromDoc = (
  doc: any,
  linkMap: Map<string, LinkMeta>,
  curPath = ""
): TreeNode[] => {
  if (doc === null || typeof doc !== "object") return [];

  const out: TreeNode[] = [];

  if (Array.isArray(doc)) {
    doc.forEach((item, i) => {
      const path = `${curPath}/[${i}]`;
      const linkHere = linkMap.get(path) || linkMap.get(`${path}/_DataLink_`);

      if (item && typeof item === "object") {
        out.push({
          kind: "folder",
          name: `[${i}]`,
          path,
          link: linkHere,
          children: buildTreeFromDoc(item, linkMap, path),
        });
      } else {
        out.push({
          kind: "file",
          name: `[${i}]`,
          path,
          link: linkHere,
          value: item,
        });
      }
    });
    return out;
  }

  Object.keys(doc).forEach((key) => {
    const val = doc[key];
    const path = `${curPath}/${key}`;
    const linkHere = linkMap.get(path) || linkMap.get(`${path}/_DataLink_`);

    if (val && typeof val === "object") {
      out.push({
        kind: "folder",
        name: key,
        path,
        link: linkHere,
        children: buildTreeFromDoc(val, linkMap, path),
      });
    } else {
      out.push({ kind: "file", name: key, path, link: linkHere, value: val });
    }
  });

  return out;
};
