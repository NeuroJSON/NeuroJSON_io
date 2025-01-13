import {
	fetchDocumentDetails,
	loadAllDocuments,
	loadPaginatedData,
} from "./neurojson.action";
import { INeuroJsonState } from "./types/neurojson.interface";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

const initialState: INeuroJsonState = {
	loading: false,
	data: [],
	selectedDocument: null,
	error: null,
	offset: 0,
	limit: 100,
	hasMore: true,
	registry: null,
};

const neurojsonSlice = createSlice({
	name: "neurojson",
	initialState,
	reducers: {
		resetData: (state) => {
			state.data = [];
			state.selectedDocument = null;
			state.offset = 0;
			state.error = null;
			state.loading = false;
			state.hasMore = true; // Reset pagination availability
		},
	},
	extraReducers: (builder) => {
		// Handle paginated data loading
		builder
			.addCase(loadPaginatedData.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(
				loadPaginatedData.fulfilled,
				(state, action: PayloadAction<any[]>) => {
					const uniqueEntries = action.payload.filter(
						(newItem) =>
							!state.data.some(
								(existingItem) => existingItem._id === newItem._id
							)
					);
					state.loading = false;

					if (uniqueEntries.length > 0) {
						state.data = [...state.data, ...uniqueEntries];
						state.offset += uniqueEntries.length;
						state.hasMore = true;
					} else {
						state.hasMore = false;
					}
				}
			)
			.addCase(loadPaginatedData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
				state.hasMore = false; // No more data to load
			})
			.addCase(loadAllDocuments.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(
				loadAllDocuments.fulfilled,
				(state, action: PayloadAction<any[]>) => {
					state.loading = false;
					state.data = action.payload;
					state.hasMore = false;
				}
			)
			.addCase(loadAllDocuments.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
				state.hasMore = false;
			})
			.addCase(fetchDocumentDetails.pending, (state) => {
				state.loading = true;
				state.error = null;
				state.selectedDocument = null;
			})
			.addCase(
				fetchDocumentDetails.fulfilled,
				(state, action: PayloadAction<any>) => {
					state.loading = false;
					state.selectedDocument = action.payload;
				}
			)
			.addCase(fetchDocumentDetails.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			});
	},
});

export const { resetData } = neurojsonSlice.actions;

export default neurojsonSlice.reducer;
