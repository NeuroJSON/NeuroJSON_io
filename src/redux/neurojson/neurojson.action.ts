import { createAsyncThunk } from "@reduxjs/toolkit";
import {
	fetchDocumentById,
	fetchDocuments,
	fetchPaginatedDocument,
} from "services/couchDb.service";
import { NeurojsonService } from "services/neurojson.service";

export const fetchRegistry = createAsyncThunk(
	"neurojson/fetchRegistry",
	async () => {
		const response = await NeurojsonService.getRegistry();
		return response.database;
	}
);

export const fetchDbInfo = createAsyncThunk(
	"neurojson/fetchDbInfo",
	async (dbName: string) => {
		const response = await NeurojsonService.getDbInfo(dbName);
		return response;
	}
);

export const loadPaginatedData = createAsyncThunk(
	"neurojson/loadPaginatedData",
	async (
		{
			dbName,
			offset,
			limit,
		}: { dbName: string; offset: number; limit: number },
		{ rejectWithValue }
	) => {
		try {
			const response = await NeurojsonService.getPaginatedData(
				dbName,
				offset,
				limit
			);

			if (response.rows.length === 0) {
				return rejectWithValue("No more data to load.");
			}

			return response.rows;
		} catch (error: any) {
			return rejectWithValue(error.message || "Failed to load data.");
		}
	}
);

export const loadAllDocuments = createAsyncThunk(
	"neurojson/loadAllDocuments",
	async (dbName: string, { rejectWithValue }) => {
		try {
			const data = await fetchDocuments(dbName);
			return data;
		} catch (error: any) {
			return rejectWithValue(error.message || "Failed to load documents.");
		}
	}
);

export const fetchDocumentDetails = createAsyncThunk(
	"neurojson/fetchDocumentDetails",
	async (
		{ dbName, docId }: { dbName: string; docId: string },
		{ rejectWithValue }
	) => {
		try {
			const data = await fetchDocumentById(dbName, docId);
			return data;
		} catch (error: any) {
			console.error("Failed to fetch document details:", error);
			return rejectWithValue("Failed to fetch document details.");
		}
	}
);
