import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export const baseURL =
	process.env.REACT_APP_BACK_URL ??
	"https://cors.redoc.ly/https://neurojson.io:7777";

export const api: AxiosInstance = axios.create({
	baseURL,
	withCredentials: false,
});

api.interceptors.request.use((config) => {
	return config;
});

api.interceptors.response.use(
	(response: any) => response,
	async (error: { response: AxiosResponse; config: AxiosRequestConfig }) => {
		return Promise.reject(error);
	}
);
