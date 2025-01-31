import { api, baseURL } from "./instance";
import {
	DBDatafields,
	DBParticulars,
} from "redux/neurojson/types/neurojson.interface";
import { IApiResponse } from "types/responses/apiResponse.interface";
import { Registry } from "types/responses/registry.interface";

export const NeurojsonService = {
	getRegistry: async (): Promise<Registry> => {
		const response = await api.get<Registry>(`${baseURL}/sys/registry`);

		return response.data;
	},
	getDbInfo: async (dbName: string): Promise<DBParticulars> => {
		const response = await api.get(`${baseURL}/${dbName}`);
		return response.data;
	},
	getPaginatedData: async (
		dbName: string,
		offset: number,
		limit: number
	): Promise<DBDatafields> => {
		const response = await api.get(
			`${baseURL}/${dbName}/_design/qq/_view/dbinfo?limit=${limit}&skip=${offset}`
		);

		return response.data;
	},
	getDocumentById: async (dbName: string, documentId: string): Promise<any> => {
		try {
			console.log(`${baseURL}/${dbName}/${documentId}`);
			const response = await api.get(`${baseURL}/${dbName}/${documentId}`);
			console.log(response.data);
			return response.data;
		} catch (error) {
			console.error(
				`Error fetching document with ID ${documentId} from ${dbName}:`,
				error
			);
			throw error;
		}
	},
};
