import * as hdf5 from "jsfive";
import JSZip from "jszip";
import * as mammoth from "mammoth";
import pako from "pako";
import * as pdfjsLib from "pdfjs-dist";
import { FileItem } from "redux/projects/types/projects.interface";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getFileType = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".nii.gz") || lower.endsWith(".nii")) return "nifti";

  const ext = lower.split(".").pop() || "";
  const fileTypes: Record<string, string[]> = {
    text: ["json", "md", "txt", "tsv", "bvec", "bval", "csv"],
    nifti: ["nii"],
    hdf5: ["snirf", "h5", "hdf5", "hdf"],
    neurojsonText: ["jnii", "jmsh", "jdt", "jnirs"],
    neurojsonBinary: ["jdb", "bjd", "bnii", "bmsh", "bnirs"],
    office: ["docx", "pdf", "xlsx", "xls"],
  };

  for (const [type, extensions] of Object.entries(fileTypes)) {
    if (extensions.includes(ext)) return type;
  }

  return "other";
};

// Extract PDF text content
const extractPDFContent = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    let fullText = `PDF: ${pdf.numPages} page${
      pdf.numPages !== 1 ? "s" : ""
    }\n`;
    fullText += "─".repeat(50) + "\n\n";

    // Extract first 5 pages only
    const maxPages = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      fullText += `[Page ${i}]\n${pageText.slice(0, 1000)}\n\n`;
    }

    if (pdf.numPages > 5) {
      fullText += `... (${pdf.numPages - 5} more pages not shown)`;
    }

    return fullText;
  } catch (error: any) {
    return `Error extracting PDF: ${error.message}`;
  }
};

// Simple file processing - just store file info without deep parsing
export const processFile = async (
  file: File,
  basePath?: string
): Promise<FileItem> => {
  const relativePath = file.webkitRelativePath || file.name;
  const fullPath = basePath
    ? `${basePath}/${relativePath}`.replace(/\/+/g, "/") // Clean up double slashes
    : relativePath;
  const entry: FileItem = {
    id: generateId(),
    name: file.name,
    type: "file",
    parentId: null,
    fileType: getFileType(file.name) as any,
    // sourcePath: file.name,
    sourcePath: fullPath, // ← Now includes base path if provided
  };

  // Only extract content for text files
  const fileType = getFileType(file.name);
  const ext = file.name.toLowerCase().split(".").pop();

  try {
    if (fileType === "text") {
      // Extract text files
      const text = await file.text();
      entry.content = text.slice(0, 5000);
      entry.contentType = "text";
    } else if (fileType === "nifti") {
      const buffer = await file.arrayBuffer();
      const header = parseNiftiHeader(buffer);
      entry.content = JSON.stringify(header, null, 2);
      entry.contentType = "nifti";
    } else if (fileType === "hdf5") {
      // Extract HDF5/SNIRF structure
      const buffer = await file.arrayBuffer();
      const tree = parseHDF5Tree(buffer);
      if (tree.error) {
        entry.content = `Error parsing HDF5: ${tree.error}`;
      } else {
        entry.content = formatHDF5Tree(tree);
      }
      entry.contentType = "hdf5";
    } else if (fileType === "neurojsonText") {
      // Extract NeuroJSON text
      const text = await file.text();
      // entry.content = text.slice(0, 5000);
      try {
        const json = JSON.parse(text);
        entry.content = JSON.stringify(json, null, 2).slice(0, 5000);
      } catch (e) {
        entry.content = text.slice(0, 5000);
      }
      entry.contentType = "neurojson";
    } else if (fileType === "neurojsonBinary") {
      // NeuroJSON binary placeholder
      entry.content = `Binary NeuroJSON: ${file.name}\nSize: ${(
        file.size / 1024
      ).toFixed(2)} KB\nFormat: BJData`;
      entry.contentType = "neurojson";
    } else if (fileType === "office" && ext === "pdf") {
      // Extract PDF
      const buffer = await file.arrayBuffer();
      entry.content = await extractPDFContent(buffer);
      entry.contentType = "office";
    } else if (fileType === "office" && ext === "docx") {
      // Extract DOCX
      const buffer = await file.arrayBuffer();
      entry.content = await extractDOCXContent(buffer);
      entry.contentType = "office";
    } else if (fileType === "office" && (ext === "xlsx" || ext === "xls")) {
      // Extract Excel
      const buffer = await file.arrayBuffer();
      entry.content = extractExcelContent(buffer);
      entry.contentType = "office";
    } else {
      // For other binary files, just store basic info
      entry.content = `File: ${file.name}\nSize: ${(file.size / 1024).toFixed(
        2
      )} KB\nType: ${file.type || "Unknown"}`;
      entry.contentType = fileType;
    }
  } catch (e: any) {
    console.error("File processing error:", e);
    entry.content = `Error reading file: ${e.message}`;
  }

  return entry;
};

// Process ZIP files
export const processZip = async (
  file: File,
  basePath?: string
): Promise<FileItem[]> => {
  const zip = new JSZip();
  const zipName = file.name;

  try {
    const contents = await zip.loadAsync(file);
    const entries: FileItem[] = [];
    const pathMap: Record<string, string> = {};
    // ✅ ADD: Create root ZIP container
    const zipRootId = generateId();
    entries.push({
      id: zipRootId,
      name: zipName,
      type: "zip",
      parentId: null,
      sourcePath: zipName,
    });

    const paths = Object.keys(contents.files).sort();

    for (const path of paths) {
      const zipEntry = contents.files[path];

      // Skip directories
      if (zipEntry.dir || path.endsWith("/")) continue;

      const parts = path.split("/");
      const fileName = parts.pop()!;
      let currentPath = "";
      //   let parentId: string | null = null;
      let parentId: string | null = zipRootId;

      // Create folder hierarchy
      parts.forEach((part) => {
        const folderPath = currentPath ? `${currentPath}/${part}` : part;
        if (!pathMap[folderPath]) {
          const folderId = generateId();
          pathMap[folderPath] = folderId;
          const folderSourcePath = basePath
            ? `${basePath}/${zipName}/${folderPath}`.replace(/\/+/g, "/")
            : `${zipName}/${folderPath}`;
          entries.push({
            id: folderId,
            name: part,
            type: "folder",
            parentId: parentId,
            // sourcePath: `${zipName}/${folderPath}`,
            sourcePath: folderSourcePath,
          });
        }
        parentId = pathMap[folderPath];
        currentPath = folderPath;
      });

      // Add file
      const fileId = generateId();
      const fileType = getFileType(fileName);
      const ext = fileName.toLowerCase().split(".").pop();

      // Add basePath to file sourcePath
      const fileSourcePath = basePath
        ? `${basePath}/${zipName}/${path}`.replace(/\/+/g, "/")
        : `${zipName}/${path}`;

      const entry: FileItem = {
        id: fileId,
        name: fileName,
        type: "file",
        parentId: parentId,
        fileType: fileType as any,
        // sourcePath: `${zipName}/${path}`,
        sourcePath: fileSourcePath,
      };

      // Extract content based on file type
      if (fileType === "text") {
        try {
          const text = await zipEntry.async("text");
          entry.content = text.slice(0, 5000);
          entry.contentType = "text";
        } catch (e: any) {
          entry.content = `Error: ${e.message}`;
        }
      } else if (fileType === "office" && ext === "pdf") {
        // Extract PDF
        try {
          const arrayBuffer = await zipEntry.async("arraybuffer");
          entry.content = await extractPDFContent(arrayBuffer);
          entry.contentType = "office";
        } catch (e: any) {
          console.error("ZIP PDF extraction error:", e);
          entry.content = `Error extracting PDF: ${e.message}`;
        }
      } else if (fileType === "office" && ext === "docx") {
        // Extract DOCX
        try {
          const arrayBuffer = await zipEntry.async("arraybuffer");
          entry.content = await extractDOCXContent(arrayBuffer);
          entry.contentType = "office";
        } catch (e: any) {
          entry.content = `Error extracting DOCX: ${e.message}`;
        }
      } else if (fileType === "office" && (ext === "xlsx" || ext === "xls")) {
        // Extract Excel
        try {
          const arrayBuffer = await zipEntry.async("arraybuffer");
          entry.content = extractExcelContent(arrayBuffer);
          entry.contentType = "office";
        } catch (e: any) {
          entry.content = `Error extracting Excel: ${e.message}`;
        }
      }
      // NIfTI header extraction from ZIP
      else if (fileType === "nifti") {
        try {
          const arrayBuffer = await zipEntry.async("arraybuffer");
          const header = parseNiftiHeader(arrayBuffer);
          entry.content = JSON.stringify(header, null, 2); // ← Format as JSON
          entry.contentType = "nifti";
        } catch (e: any) {
          entry.content = `Error extracting NIfTI header: ${e.message}`;
        }
      }

      // HDF5/SNIRF
      else if (fileType === "hdf5") {
        try {
          const arrayBuffer = await zipEntry.async("arraybuffer");
          const tree = parseHDF5Tree(arrayBuffer);
          if (tree.error) {
            entry.content = `Error parsing HDF5: ${tree.error}`;
          } else {
            entry.content = formatHDF5Tree(tree);
          }
          entry.contentType = "hdf5";
        } catch (e: any) {
          entry.content = `Error extracting HDF5: ${e.message}`;
        }
      }
      // NeuroJSON text files
      else if (fileType === "neurojsonText") {
        try {
          const text = await zipEntry.async("text");
          // entry.content = text.slice(0, 5000);
          const json = JSON.parse(text);
          entry.content = JSON.stringify(json, null, 2).slice(0, 5000);
          entry.contentType = "neurojson";
        } catch (e: any) {
          entry.content = `Error: ${e.message}`;
        }
      }
      // NeuroJSON binary placeholder
      else if (fileType === "neurojsonBinary") {
        const arrayBuffer = await zipEntry.async("arraybuffer");
        const sizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
        entry.content = `Binary NeuroJSON: ${fileName}\nSize: ${sizeKB} KB\nFormat: BJData`;
        entry.contentType = "neurojson";
      } else {
        // For other binary files, just store info
        const arrayBuffer = await zipEntry.async("arraybuffer");
        const sizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
        entry.content = `ZIP Entry: ${fileName}\nSize: ${sizeKB} KB`;
        entry.contentType = fileType;
      }

      entries.push(entry);
    }

    return entries;
  } catch (e: any) {
    console.error("Error processing ZIP:", e);
    return [
      {
        id: generateId(),
        name: zipName,
        type: "file",
        parentId: null,
        content: `Error processing ZIP: ${e.message}`,
        fileType: "other",
      },
    ];
  }
};

export const processFolder = async (
  folderEntry: FileSystemDirectoryEntry,
  parentId: string | null,
  basePath?: string
): Promise<FileItem[]> => {
  const entries: FileItem[] = [];
  const folderId = generateId();
  //   const basePath = folderEntry.name;
  const folderName = folderEntry.name;

  // Add basePath to root folder sourcePath
  const rootSourcePath = basePath
    ? `${basePath}/${folderName}`.replace(/\/+/g, "/")
    : folderName;

  // Add the folder itself
  entries.push({
    id: folderId,
    name: folderEntry.name,
    type: "folder",
    parentId: parentId,
    // sourcePath: basePath,
    sourcePath: rootSourcePath,
  });

  // Helper: Promisify readEntries
  const readEntries = (
    reader: FileSystemDirectoryReader
  ): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  };

  // Helper: Promisify file() method
  const getFile = (fileEntry: FileSystemFileEntry): Promise<File> => {
    return new Promise((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
  };

  // Recursive traversal function
  async function traverseDirectory(
    dirEntry: FileSystemDirectoryEntry,
    currentParentId: string,
    currentPath: string
  ): Promise<void> {
    const dirReader = dirEntry.createReader();
    let allEntries: FileSystemEntry[] = [];

    // Read all entries (may require multiple calls)
    const readBatch = async (): Promise<void> => {
      const batch = await readEntries(dirReader);
      if (batch.length > 0) {
        allEntries = allEntries.concat(Array.from(batch));
        await readBatch(); // Keep reading
      }
    };

    await readBatch();

    // Process each entry
    for (const entry of allEntries) {
      //   const entryPath = `${currentPath}/${entry.name}`;
      // Construct full path with basePath
      const entryPath = basePath
        ? `${basePath}/${currentPath}/${entry.name}`.replace(/\/+/g, "/")
        : `${currentPath}/${entry.name}`;

      if (entry.isFile) {
        // Process file
        const fileEntry = entry as FileSystemFileEntry;
        const file = await getFile(fileEntry);
        const fileItem = await processFile(file);
        fileItem.parentId = currentParentId;
        fileItem.sourcePath = entryPath;
        entries.push(fileItem);
      } else if (entry.isDirectory) {
        // Process subfolder
        const subFolderId = generateId();
        entries.push({
          id: subFolderId,
          name: entry.name,
          type: "folder",
          parentId: currentParentId,
          sourcePath: entryPath,
        });
        await traverseDirectory(
          entry as FileSystemDirectoryEntry,
          subFolderId,
          //   entryPath
          `${currentPath}/${entry.name}`
        );
      }
    }
  }

  // Start traversal
  await traverseDirectory(folderEntry, folderId, folderName);

  return entries;
};

export const parseNiftiHeader = (buffer: ArrayBuffer): any => {
  try {
    let data: ArrayBufferLike = buffer;
    const arr = new Uint8Array(buffer);

    // Check if gzipped
    if (arr[0] === 0x1f && arr[1] === 0x8b) {
      const decompressed = pako.inflate(arr);
      data = decompressed.buffer;
    }

    const view = new DataView(data);
    const sizeof_hdr = view.getInt32(0, true);
    const isNifti2 = sizeof_hdr === 540;
    const isNifti1 = sizeof_hdr === 348;

    if (!isNifti1 && !isNifti2) {
      return { error: "Not a valid NIfTI file" };
    }

    const header: any = { format: isNifti2 ? "NIfTI-2" : "NIfTI-1" };

    if (isNifti1) {
      header.dim = [];
      for (let i = 0; i < 8; i++) {
        header.dim.push(view.getInt16(40 + i * 2, true));
      }
      header.datatype = view.getInt16(70, true);
      header.bitpix = view.getInt16(72, true);
      header.pixdim = [];
      for (let j = 0; j < 8; j++) {
        header.pixdim.push(view.getFloat32(76 + j * 4, true));
      }
      header.vox_offset = view.getFloat32(108, true);
      header.scl_slope = view.getFloat32(112, true);
      header.scl_inter = view.getFloat32(116, true);
      header.qform_code = view.getInt16(252, true);
      header.sform_code = view.getInt16(254, true);

      // Extract 80-character description (bytes 148-227)
      const descripBytes = new Uint8Array(data, 148, 80);
      header.descrip = String.fromCharCode(...descripBytes)
        .replace(/\0/g, "") // Remove null terminators
        .trim(); // Remove whitespace

      // Extract 4-character magic string (bytes 344-347)
      const magicBytes = new Uint8Array(data, 344, 4);
      header.magic = String.fromCharCode(...magicBytes).replace(/\0/g, "");

      const datatypes: Record<number, string> = {
        0: "UNKNOWN",
        2: "UINT8",
        4: "INT16",
        8: "INT32",
        16: "FLOAT32",
        64: "FLOAT64",
        256: "INT8",
        512: "UINT16",
        768: "UINT32",
      };
      header.datatype_name = datatypes[header.datatype] || "UNKNOWN";
    }

    return header;
  } catch (e: any) {
    return { error: e.message };
  }
};

// Parse HDF5/SNIRF tree structure
const parseHDF5Tree = (buffer: ArrayBuffer): any => {
  try {
    const f = new hdf5.File(buffer);
    const tree: any = { type: "group", name: "/", children: [], attrs: {} };

    const getAttrs = (item: any) => {
      try {
        return item.attrs || {};
      } catch (e) {
        return {};
      }
    };

    const getKeys = (item: any): string[] => {
      try {
        if (item.keys && Array.isArray(item.keys)) return item.keys;
        if (typeof item.keys === "function") return item.keys();
        return [];
      } catch (e) {
        return [];
      }
    };

    const traverse = (group: any, node: any, depth: number, path: string) => {
      if (depth > 20) {
        node.truncated = true;
        return;
      }
      node.attrs = getAttrs(group);

      const keys = getKeys(group);

      for (const key of keys) {
        try {
          const item = group.get(key);
          if (!item) continue;

          const childPath = `${path}/${key}`;
          const child: any = {
            name: key,
            path: childPath,
            attrs: getAttrs(item),
          };

          const itemKeys = getKeys(item);

          if (itemKeys.length > 0) {
            // It's a group with children
            child.type = "group";
            child.children = [];
            traverse(item, child, depth + 1, childPath);
          } else {
            // It's a dataset
            child.type = "dataset";
            try {
              child.shape = item.shape || [];
              child.dtype = item.dtype || "unknown";
              // Read small scalar or 1D data
              const totalElements = child.shape.reduce(
                (a: number, b: number) => a * b,
                1
              );
              if (
                totalElements > 0 &&
                totalElements < 50 &&
                child.shape.length <= 1
              ) {
                try {
                  const val = item.value;
                  if (val !== undefined && val !== null) {
                    child.value = val;
                  }
                } catch (e) {
                  // Ignore read errors
                }
              }
            } catch (e) {
              child.dtype = "error";
            }
          }
          node.children.push(child);
        } catch (e) {
          console.log("Error reading key:", key, e);
        }
      }
    };

    traverse(f, tree, 0, "");
    return tree;
  } catch (e: any) {
    return { error: e.message };
  }
};

const formatHDF5Tree = (node: any, indent: number = 0): string => {
  const pad = "  ".repeat(indent);
  let result = "";

  if (node.type === "group") {
    result += `${pad}📁 ${node.name}`;
    const attrKeys = Object.keys(node.attrs || {});
    if (attrKeys.length > 0) {
      const attrStr = attrKeys
        .slice(0, 5)
        .map((k) => {
          const v = node.attrs[k];
          if (typeof v === "string") return `${k}="${v.slice(0, 30)}"`;
          return k;
        })
        .join(", ");
      result += ` {${attrStr}${attrKeys.length > 5 ? "..." : ""}}`;
    }
    result += "\n";
    if (node.truncated) result += `${pad}  ... (truncated)\n`;
    const children = node.children || [];
    for (const child of children) {
      result += formatHDF5Tree(child, indent + 1);
    }
  } else {
    result += `${pad}📊 ${node.name}`;
    if (node.shape && node.shape.length) {
      result += ` [${node.shape.join("×")}]`;
    }
    if (node.dtype) result += ` (${node.dtype})`;
    if (node.value !== undefined) {
      let valStr;
      if (Array.isArray(node.value)) {
        valStr = `[${node.value.slice(0, 5).join(", ")}${
          node.value.length > 5 ? "..." : ""
        }]`;
      } else {
        valStr = String(node.value).slice(0, 50);
      }
      result += ` = ${valStr}`;
    }
    const attrKeys2 = Object.keys(node.attrs || {});
    if (attrKeys2.length > 0) {
      result += ` {${attrKeys2.slice(0, 3).join(", ")}}`;
    }
    result += "\n";
  }
  return result;
};

// Extract DOCX text content
const extractDOCXContent = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;
    return (
      text.slice(0, 5000) + (text.length > 5000 ? "\n... (truncated)" : "")
    );
  } catch (error: any) {
    return `Error extracting DOCX: ${error.message}`;
  }
};

// Extract Excel content
const extractExcelContent = (buffer: ArrayBuffer): string => {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    let text = `Excel: ${workbook.SheetNames.length} sheet(s)\n${"─".repeat(
      50
    )}`;

    // Process first 3 sheets
    for (let i = 0; i < Math.min(workbook.SheetNames.length, 3); i++) {
      const sheetName = workbook.SheetNames[i];
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const lines = csv.split("\n").slice(0, 20); // First 20 rows

      text += `\n\n[Sheet: ${sheetName}]\n${lines.join("\n")}`;
    }

    if (workbook.SheetNames.length > 3) {
      text += `\n\n... (${
        workbook.SheetNames.length - 3
      } more sheets not shown)`;
    }

    return text;
  } catch (error: any) {
    return `Error extracting Excel: ${error.message}`;
  }
};
