import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// ==========not mapping neurojson.org and CouchDB requests to backend api yet==============
// const needsCorsProxy =
//   process.env.REACT_APP_USE_CORS === "true" ||
//   process.env.NODE_ENV === "development";

// const backendURL = "https://neurojson.io:7777";

// export const baseURL = needsCorsProxy
//   ? `https://cors.redoc.ly/${backendURL}`
//   : backendURL;
//==========================================================================================

export const baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

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
