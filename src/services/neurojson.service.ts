import { api, baseURL } from "./instance";
import { IApiResponse } from "types/responses/apiResponse.interface";
import { Registry } from "types/responses/registry.interface";

export const NeurojsonService = {
	getRegistry: async (): Promise<Registry> => {
		const response = await api.get<Registry>(`${baseURL}/sys/registry`);

		return response.data;
	},
};
