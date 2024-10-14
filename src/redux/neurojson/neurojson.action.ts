import { createAsyncThunk } from "@reduxjs/toolkit";
import { NeurojsonService } from "services/neurojson.service";

export const fetchRegistry = createAsyncThunk(
	"neurojson/fetchRegistry",
	async () => {
		const response = await NeurojsonService.getRegistry();
		console.log(response);
		return response.database;
	}
);
