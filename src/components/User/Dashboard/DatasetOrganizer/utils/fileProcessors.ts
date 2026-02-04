// src/components/DatasetOrganizer/utils/fileProcessors.ts
import JSZip from "jszip";
import pako from "pako";
import * as pdfjsLib from "pdfjs-dist";
import { FileItem } from "redux/projects/types/projects.interface";

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
export const processFile = async (file: File): Promise<FileItem> => {
  const entry: FileItem = {
    id: generateId(),
    name: file.name,
    type: "file",
    parentId: null,
    fileType: getFileType(file.name) as any,
    sourcePath: file.name,
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
    } else if (fileType === "office" && ext === "pdf") {
      // ✅ EXTRACT PDF - This was missing!
      console.log("Processing PDF file...");
      const buffer = await file.arrayBuffer();
      entry.content = await extractPDFContent(buffer);
      entry.contentType = "office";
      console.log("PDF processed successfully");
    } else if (fileType === "office" && ext === "docx") {
      // DOCX placeholder
      entry.content = `DOCX file: ${file.name}\nSize: ${(
        file.size / 1024
      ).toFixed(2)} KB\n\nNote: Install mammoth.js to extract DOCX content`;
      entry.contentType = "office";
    } else if (fileType === "office" && (ext === "xlsx" || ext === "xls")) {
      // Excel placeholder
      entry.content = `Excel file: ${file.name}\nSize: ${(
        file.size / 1024
      ).toFixed(2)} KB\n\nNote: Install xlsx.js to extract Excel content`;
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

  //   if (fileType === "text") {
  //     try {
  //       const text = await file.text();
  //       entry.content = text.slice(0, 5000); // First 5000 chars
  //       entry.contentType = "text";
  //     } catch (e: any) {
  //       entry.content = `Error reading file: ${e.message}`;
  //     }
  //   } else {
  //     // For binary files, just store basic info
  //     entry.content = `File: ${file.name}\nSize: ${(file.size / 1024).toFixed(
  //       2
  //     )} KB\nType: ${file.type || "Unknown"}`;
  //     entry.contentType = fileType;
  //   }

  return entry;
};

// Process ZIP files
export const processZip = async (file: File): Promise<FileItem[]> => {
  const zip = new JSZip();
  const zipName = file.name;

  try {
    const contents = await zip.loadAsync(file);
    const entries: FileItem[] = [];
    const pathMap: Record<string, string> = {};
    const paths = Object.keys(contents.files).sort();

    for (const path of paths) {
      const zipEntry = contents.files[path];

      // Skip directories
      if (zipEntry.dir || path.endsWith("/")) continue;

      const parts = path.split("/");
      const fileName = parts.pop()!;
      let currentPath = "";
      let parentId: string | null = null;

      // Create folder hierarchy
      parts.forEach((part) => {
        const folderPath = currentPath ? `${currentPath}/${part}` : part;
        if (!pathMap[folderPath]) {
          const folderId = generateId();
          pathMap[folderPath] = folderId;
          entries.push({
            id: folderId,
            name: part,
            type: "folder",
            parentId: parentId,
            sourcePath: `${zipName}/${folderPath}`,
          });
        }
        parentId = pathMap[folderPath];
        currentPath = folderPath;
      });

      // Add file
      const fileId = generateId();
      const fileType = getFileType(fileName);
      const ext = fileName.toLowerCase().split(".").pop();

      const entry: FileItem = {
        id: fileId,
        name: fileName,
        type: "file",
        parentId: parentId,
        fileType: fileType as any,
        sourcePath: `${zipName}/${path}`,
      };

      // Only extract text files
      //   if (fileType === "text") {
      //     try {
      //       const text = await zipEntry.async("text");
      //       entry.content = text.slice(0, 5000);
      //       entry.contentType = "text";
      //     } catch (e: any) {
      //       entry.content = `Error: ${e.message}`;
      //     }
      //   } else {
      //     // For binary files, just store info
      //     // entry.content = `ZIP Entry: ${fileName}\nCompressed Size: ${(
      //     //   zipEntry._data.compressedSize / 1024
      //     // ).toFixed(2)} KB`;
      //     // entry.contentType = fileType;
      //     // ✅ FIX 1: Get file size from the ZIP entry properly
      //     const arrayBuffer = await zipEntry.async("arraybuffer");
      //     const sizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);
      //     entry.content = `ZIP Entry: ${fileName}\nSize: ${sizeKB} KB`;
      //     entry.contentType = fileType;
      //   }

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
        // ✅ EXTRACT PDF FROM ZIP - This was missing!
        try {
          console.log(`Extracting PDF from ZIP: ${fileName}`);
          const arrayBuffer = await zipEntry.async("arraybuffer");
          entry.content = await extractPDFContent(arrayBuffer);
          entry.contentType = "office";
          console.log("ZIP PDF extracted successfully");
        } catch (e: any) {
          console.error("ZIP PDF extraction error:", e);
          entry.content = `Error extracting PDF: ${e.message}`;
        }
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

// Process folder - Web API limitation: can't fully traverse folders like Node.js
export const processFolder = async (
  folderEntry: FileSystemDirectoryEntry,
  parentId: string | null
): Promise<FileItem[]> => {
  const entries: FileItem[] = [];
  const folderId = generateId();

  // Add the folder itself
  entries.push({
    id: folderId,
    name: folderEntry.name,
    type: "folder",
    parentId: parentId,
    sourcePath: folderEntry.fullPath,
  });

  // Note: Full folder traversal requires complex recursive logic
  // For MVP, just create the folder entry
  // You can enhance this later

  return entries;
};

// Helper: Extract basic NIfTI header info (without full parsing)
// export const extractNiftiBasicInfo = async (
//   buffer: ArrayBuffer
// ): Promise<string> => {
//   try {
//     let data = buffer;
//     const arr = new Uint8Array(buffer);

//     // Check if gzipped
//     if (arr[0] === 0x1f && arr[1] === 0x8b) {
//       const decompressed = pako.inflate(arr);
//       data = decompressed.buffer;
//     }

//     const view = new DataView(data);
//     const sizeof_hdr = view.getInt32(0, true);

//     if (sizeof_hdr === 348) {
//       return "NIfTI-1 format detected\nHeader size: 348 bytes";
//     } else if (sizeof_hdr === 540) {
//       return "NIfTI-2 format detected\nHeader size: 540 bytes";
//     } else {
//       return "Invalid NIfTI file";
//     }
//   } catch (e: any) {
//     return `Error parsing NIfTI: ${e.message}`;
//   }
// };

// ✅ FIX 2: Correct type handling for pako
export const extractNiftiBasicInfo = async (
  buffer: ArrayBuffer
): Promise<string> => {
  try {
    const arr = new Uint8Array(buffer);

    // Check if gzipped
    if (arr[0] === 0x1f && arr[1] === 0x8b) {
      // pako.inflate returns Uint8Array, so use it directly
      const decompressed = pako.inflate(arr);
      // Create a new DataView from the decompressed Uint8Array
      const view = new DataView(decompressed.buffer);
      const sizeof_hdr = view.getInt32(0, true);

      if (sizeof_hdr === 348) {
        return "NIfTI-1 format detected\nHeader size: 348 bytes";
      } else if (sizeof_hdr === 540) {
        return "NIfTI-2 format detected\nHeader size: 540 bytes";
      } else {
        return "Invalid NIfTI file";
      }
    } else {
      // Not gzipped, use original buffer
      const view = new DataView(buffer);
      const sizeof_hdr = view.getInt32(0, true);

      if (sizeof_hdr === 348) {
        return "NIfTI-1 format detected\nHeader size: 348 bytes";
      } else if (sizeof_hdr === 540) {
        return "NIfTI-2 format detected\nHeader size: 540 bytes";
      } else {
        return "Invalid NIfTI file";
      }
    }
  } catch (e: any) {
    return `Error parsing NIfTI: ${e.message}`;
  }
};
