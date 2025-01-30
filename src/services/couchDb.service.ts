import axios from "axios";

const COUCHDB_URL = "http://127.0.0.1:5984"; // Replace with your CouchDB URL
const username = "admin"; // Replace with your username
const password = "mypassword"; // Replace with your password

// Create a reusable Axios instance
const axiosInstance = axios.create({
	baseURL: COUCHDB_URL,
	auth: { username, password },
	headers: { Accept: "application/json" },
});

/**
 * Fetches all databases from the CouchDB instance.
 * Filters out system databases starting with '_'.
 */
export const fetchDatabases = async (): Promise<string[]> => {
	try {
		const response = await axios.get(`${COUCHDB_URL}/_all_dbs`, {
			auth: { username, password },
			headers: { Accept: "application/json" },
		});

		if (Array.isArray(response.data)) {
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
 * Fetches general database information (e.g., total documents).
 *
 * @param dbName - The name of the database.
 */
export const fetchDbInfo = async (dbName: string) => {
	try {
		const response = await axios.get(`${COUCHDB_URL}/${dbName}`, {
			auth: { username, password },
		});
		return response.data;
	} catch (error) {
		console.error("Error fetching DB info:", error);
		throw error;
	}
};

/**
 * Fetches paginated datasets from the database using the `_find` endpoint.
 *
 * @param dbName - The name of the database.
 * @param offset - The starting offset for pagination.
 * @param limit - The number of datasets to fetch per page.
 */

export const fetchBidsDocs = async (
	dbName: string,
	offset: number,
	limit: number
): Promise<any[]> => {
	const queryData = {
		selector: {},
		limit,
		skip: offset,
	};

	try {
		const response = await axiosInstance.post(`/${dbName}/_find`, queryData, {
			headers: { "Content-Type": "application/json" },
		});

		// Process each document to calculate subject count and JSON size
		return response.data.docs.map((doc: any) => {
			const jsonSizeInKB = JSON.stringify(doc).length / 1024; // Calculate JSON size
			const subjectCount = Object.keys(doc).filter((key) =>
				key.startsWith("sub-")
			).length; // Count subjects
			return { ...doc, jsonSizeInKB, subjectCount };
		});
	} catch (error) {
		console.error(`Error fetching datasets from ${dbName}:`, error);
		throw error;
	}
};

/**
 * Fetches all documents from a specific database.
 * Includes the full content of each document.
 *
 * @param dbName - The name of the database to fetch documents from.
 */
export const fetchDocuments = async (dbName: string): Promise<any[]> => {
	try {
		const response = await axios.get(`${COUCHDB_URL}/${dbName}/_all_docs`, {
			auth: { username, password },
			params: { include_docs: true },
		});

		return response.data.rows.map((row: { doc: any }) => row.doc) || [];
	} catch (error) {
		console.error(`Error fetching documents from ${dbName}:`, error);
		throw error;
	}
};

/**
 * Fetches a specific document by its ID from a given database.
 *
 * @param dbName - The name of the database.
 * @param documentId - The ID of the document to fetch.
 */
export const fetchDocumentById = async (
	dbName: string,
	documentId: string
): Promise<any> => {
	try {
		const response = await axios.get(`${COUCHDB_URL}/${dbName}/${documentId}`, {
			auth: { username, password },
		});

		return response.data;
	} catch (error) {
		console.error(
			`Error fetching document with ID ${documentId} from ${dbName}:`,
			error
		);
		throw error;
	}
};

/**
 * Fetches paginated data from a specific database using `_all_docs`.
 *
 * @param dbName - The name of the database.
 * @param offset - The starting offset for pagination.
 * @param limit - The number of documents to fetch per page.
 */
export const fetchPaginatedDocument = async (
	dbName: string,
	offset: number,
	limit: number
): Promise<any[]> => {
	try {
		console.log("Fetching paginated data:", { dbName, offset, limit });
		const response = await axios.get(`${COUCHDB_URL}/${dbName}/_all_docs`, {
			auth: { username, password },
			params: { skip: offset, limit, include_docs: true },
		});

		return response.data.rows.map((row: { doc: any }) => row.doc) || [];
	} catch (error) {
		console.error("Error fetching paginated data:", error);
		throw error;
	}
};

/**
 * Fetches dataset details from the CouchDB `_view/dbinfo` view with pagination.
 *
 * @param dbName - The name of the database.
 * @param limit - The number of datasets to fetch per page.
 * @param offset - The starting offset for pagination.
 */
export const fetchDbInfoView = async (
	dbName: string,
	limit: number,
	offset: number
): Promise<any> => {
	try {
		const response = await axios.get(
			`${COUCHDB_URL}/${dbName}/_design/qq/_view/dbinfo`,
			{
				params: { limit, skip: offset },
				auth: { username, password },
				headers: { Accept: "application/json" },
			}
		);

		return response.data;
	} catch (error) {
		console.error(
			`Error fetching dbinfo view for ${dbName} with offset ${offset}:`,
			error
		);
		throw error;
	}
};

export default {
	fetchDatabases,
	fetchDbInfo,
	fetchBidsDocs,
	fetchDocuments,
	fetchDocumentById,
	fetchPaginatedDocument,
	fetchDbInfoView,
};
