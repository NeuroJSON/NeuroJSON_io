import axios from "axios";

const COUCHDB_URL = "http://127.0.0.1:5984"; // CouchDB URL
const username = "admin"; // Replace with your username
const password = "mypassword"; // Replace with your password

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

export const fetchDocuments = async (dbName: string): Promise<any[]> => {
	try {
		const response = await axios.get(`${COUCHDB_URL}/${dbName}/_all_docs`, {
			auth: { username, password },
			params: { include_docs: true },
		});

		return response.data.rows || [];
	} catch (error) {
		console.error(`Error fetching documents from ${dbName}:`, error);
		throw error;
	}
};

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

// couchDbService.ts
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

		console.log("CouchDB response:", response.data);

		if (response.data.rows) {
			return response.data.rows
				.map((row: { doc: any }) => row.doc)
				.filter((doc: any) => doc !== undefined);
		} else {
			return [];
		}
	} catch (error) {
		console.error("Error fetching paginated data:", error);
		throw error;
	}
};
