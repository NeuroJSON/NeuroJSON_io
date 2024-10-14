import { fetchRegistry } from "./neurojson.action";
import { INeuroJsonState } from "./types/neurojson.interface";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Database, Registry } from "types/responses/registry.interface";

const initialState: INeuroJsonState = {
	loading: false,
	registry: null,
	error: null,
};

const neurojsonSlice = createSlice({
	name: "neurojson",
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchRegistry.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(
				fetchRegistry.fulfilled,
				(state, action: PayloadAction<Database[]>) => {
					state.loading = false;
					console.log(action.payload);
					state.registry = action.payload;
				}
			)
			.addCase(fetchRegistry.rejected, (state, action: PayloadAction<any>) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { setLoading } = neurojsonSlice.actions;

export default neurojsonSlice.reducer;
