import { api, baseURL } from "./instance";
import axios from "axios";
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
      const response = await api.get(`${baseURL}/${dbName}/${documentId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching document with ID ${documentId} from ${dbName}:`,
        error
      );
      throw error;
    }
  },
  getDbStats: async (): Promise<any> => {
    const response = await axios.get(
      "https://cors.redoc.ly/https://neurojson.org/io/search.cgi?dbstats=1"
    );
    return response.data;
  },
  getMetadataSearchResults: async (formData: any): Promise<any> => {
    const map: Record<string, string> = {
      keyword: "keyword",
      age_min: "agemin",
      age_max: "agemax",
      task_min: "taskmin",
      task_max: "taskmax",
      run_min: "runmin",
      run_max: "runmax",
      sess_min: "sessmin",
      sess_max: "sessmax",
      modality: "modality",
      run_name: "run",
      type_name: "type",
      session_name: "session",
      task_name: "task",
      limit: "limit",
      skip: "skip",
      count: "count",
      unique: "unique",
      gender: "gender",
      database: "dbname",
      dataset: "dsname",
      subject: "subname",
    };

    const params = new URLSearchParams();
    params.append("_get", "dbname, dsname, json");
    Object.keys(formData).forEach((key) => {
      let val = formData[key];
      if (val === "" || val === "any" || val === undefined || val === null)
        return;

      const queryKey = map[key];
      if (!queryKey) return;

      if (key.startsWith("age")) {
        params.append(queryKey, String(Math.floor(val * 100)).padStart(5, "0"));
      } else if (key === "gender") {
        params.append(queryKey, val[0]);
      } else if (key === "modality") {
        params.append(queryKey, val.replace(/.*\(/, "").replace(/\).*/, ""));
      } else {
        params.append(queryKey, val.toString());
      }
    });

    const queryString = `?${params.toString()}`;
    const response = await axios.get(
      `https://cors.redoc.ly/https://neurojson.org/io/search.cgi${queryString}`
    );

    return response.data;
  },
};
