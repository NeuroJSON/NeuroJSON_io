import { Database } from "types/responses/registry.interface";

export interface INeuroJsonState {
	loading: boolean;
	registry: Database[] | null;
	error: string | null;
	data: any[]; // Paginated dataset (documents from CouchDB)
	selectedDocument: any | null; // Holds a single document's details
	offset: number; // Tracks the pagination offset
	limit: number; // Number of items to fetch per request (chunk size)
	hasMore: boolean; // Indicates if more data is available
}

export interface LoadPaginatedDataPayload {
	dbName: string;
	offset: number;
	limit: number;
}
