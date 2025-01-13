import axios from "axios";

const COUCHDB_URL = "http://127.0.0.1:5984"; // CouchDB URL
const username = "admin"; // Replace with your username
const password = "mypassword"; // Replace with your password

/**
 * Fetches a list of all databases in CouchDB.
 */
export const fetchDatabases = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${COUCHDB_URL}/_all_dbs`, {
      auth: { username, password },
      headers: { Accept: "application/json" }, // Force JSON response
    });

    if (Array.isArray(response.data)) {
      // Filter out system databases (if needed)
      return response.data.filter((db) => !db.startsWith("_"));
    } else {
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error fetching databases:", error);
    throw error;
  }
};

/**
 * Fetches all documents from a specific database.
 *
 * @param dbName - The name of the database.
 */
export const fetchDocuments = async (dbName: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${COUCHDB_URL}/${dbName}/_all_docs`, {
      auth: { username, password },
      params: { include_docs: true }, // Include full document content
    });

    return response.data.rows || [];
  } catch (error) {
    console.error(`Error fetching documents from ${dbName}:`, error);
    throw error;
  }
};

/**
 * Fetches a specific document by its ID from a database.
 *
 * @param dbName - The name of the database.
 * @param documentId - The ID of the document to fetch.
 */
export const fetchDocumentById = async (dbName: string, documentId: string): Promise<any> => {
  try {
    const response = await axios.get(`${COUCHDB_URL}/${dbName}/${documentId}`, {
      auth: { username, password },
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching document with ID ${documentId} from ${dbName}:`, error);
    throw error;
  }
};

/**
 * Fetches paginated documents from a specific database.
 *
 * @param dbName - The name of the database.
 * @param offset - The starting index for pagination.
 * @param limit - The number of documents to fetch.
 */


// couchDbService.ts
export const fetchPaginatedDocument = async (
  dbName: string,
  offset: number,
  limit: number
): Promise<any[]> => {
  try {
    console.log("Fetching paginated data:", { dbName, offset, limit });
    const response = await axios.get(`${COUCHDB_URL}/${dbName}/_all_docs`, {
      auth: { username, password }, // Ensure credentials are included
      params: { skip: offset, limit, include_docs: true },
    });

    console.log("CouchDB response:", response.data);

    if (response.data.rows) {
      return response.data.rows
        .map((row : { doc: any }) => row.doc)
        .filter((doc: any) => doc !== undefined);
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching paginated data:", error);
    throw error;
  }
};

