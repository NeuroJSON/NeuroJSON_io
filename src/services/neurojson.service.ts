import { api, baseURL } from "./instance";
import axios from "axios";
import {
  DBDatafields,
  DBParticulars,
} from "redux/neurojson/types/neurojson.interface";
import { IApiResponse } from "types/responses/apiResponse.interface";
import { Registry } from "types/responses/registry.interface";

export const NeurojsonService = {
  // getRegistry: async (): Promise<Registry> => {
  //   const response = await api.get<Registry>(`${baseURL}/sys/registry`);

  //   return response.data;
  // },
  // GET /api/v1/dbs/  → getDbList
  getRegistry: async () => {
    const response = await api.get(`/dbs`);
    return response.data;
  },

  // getDbInfo: async (dbName: string): Promise<DBParticulars> => {
  //   const response = await api.get(`${baseURL}/${dbName}`);
  //   return response.data;
  // },
  // GET /api/v1/dbs/:dbName  → getDbInfo
  getDbInfo: async (dbName: string) => {
    const response = await api.get(`/dbs/${dbName}`);
    return response.data;
  },

  // getPaginatedData: async (
  //   dbName: string,
  //   offset: number,
  //   limit: number
  // ): Promise<DBDatafields> => {
  //   const response = await api.get(
  //     `${baseURL}/${dbName}/_design/qq/_view/dbinfo?limit=${limit}&skip=${offset}`
  //   );

  //   return response.data;
  // },
  // GET /api/v1/dbs/:dbName/datasets?offset=0&limit=10  → getDbDatasets
  getPaginatedData: async (dbName: string, offset: number, limit: number) => {
    const response = await api.get(`/dbs/${dbName}/datasets`, {
      params: { offset, limit },
    });
    return response.data;
  },

  // getDocumentById: async (
  //   dbName: string,
  //   documentId: string,
  //   rev?: string
  // ): Promise<any> => {
  //   try {
  //     const url = `${baseURL}/${dbName}/${documentId}`;
  //     const response = await api.get(url, {
  //       params: {
  //         revs_info: true,
  //         ...(rev ? { rev } : {}), // add ?rev=... only when provided
  //       },
  //     });
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       `Error fetching document with ID ${documentId} from ${dbName}:`,
  //       error
  //     );
  //     throw error;
  //   }
  // },
  // GET /api/v1/datasets/:dbName/:datasetId  → getDatasetDetail
  getDocumentById: async (dbName: string, documentId: string, rev?: string) => {
    const response = await api.get(`/datasets/${dbName}/${documentId}`, {
      params: { revs_info: true, ...(rev ? { rev } : {}) },
    });
    return response.data;
  },

  // getDbStats: async (): Promise<any> => {
  //   const response = await axios.get(
  //     "https://cors.redoc.ly/https://neurojson.org/io/search.cgi?dbstats=1"
  //   );
  //   return response.data;
  // },
  // GET /api/v1/dbs/stats  → getDbStats
  getDbStats: async () => {
    const response = await api.get(`/dbs/stats`);
    return response.data;
  },

  // getMetadataSearchResults: async (formData: any): Promise<any> => {
  //   const map: Record<string, string> = {
  //     keyword: "keyword",
  //     age_min: "agemin",
  //     age_max: "agemax",
  //     task_min: "taskmin",
  //     task_max: "taskmax",
  //     run_min: "runmin",
  //     run_max: "runmax",
  //     sess_min: "sessmin",
  //     sess_max: "sessmax",
  //     modality: "modality",
  //     run_name: "run",
  //     type_name: "type",
  //     session_name: "session",
  //     task_name: "task",
  //     limit: "limit",
  //     skip: "skip",
  //     count: "count",
  //     unique: "unique",
  //     gender: "gender",
  //     database: "dbname",
  //     dataset: "dsname",
  //     subject: "subname",
  //   };

  //   const params = new URLSearchParams();
  //   params.append("_get", "dbname, dsname, json");
  //   Object.keys(formData).forEach((key) => {
  //     let val = formData[key];
  //     if (val === "" || val === "any" || val === undefined || val === null)
  //       return;

  //     const queryKey = map[key];
  //     if (!queryKey) return;

  //     if (key.startsWith("age")) {
  //       params.append(queryKey, String(Math.floor(val * 100)).padStart(5, "0"));
  //     } else if (key === "gender") {
  //       params.append(queryKey, val[0]);
  //     } else if (key === "modality") {
  //       params.append(queryKey, val.replace(/.*\(/, "").replace(/\).*/, ""));
  //     } else {
  //       params.append(queryKey, val.toString());
  //     }
  //   });

  //   const queryString = `?${params.toString()}`;
  //   const response = await axios.get(
  //     `https://cors.redoc.ly/https://neurojson.org/io/search.cgi${queryString}`
  //   );

  //   return response.data;
  // },
  // GET /api/v1/dbs/search  → searchAllDatabases
  getMetadataSearchResults: async (formData: any) => {
    const response = await api.post(`/dbs/search`, formData);
    return response.data;
  },

  // getDbInfoByDatasetId: async (dbName: string, dsId: string): Promise<any> => {
  //   const response = await api.get(
  //     `${baseURL}/${dbName}/_design/qq/_view/dbinfo`,
  //     {
  //       params: {
  //         // CouchDB expects a JSON value; this produces %22ds000001%22
  //         key: JSON.stringify(dsId),
  //         // include_docs is optional; keep it if your view needs the full doc
  //         include_docs: true,
  //         // reduce: false, // uncomment if your view has a reduce function
  //       },
  //     }
  //   );
  //   return response.data;
  // },
  // GET /api/v1/datasets/:dbName/:datasetId/meta  → getDatasetMeta
  getDbInfoByDatasetId: async (dbName: string, dsId: string) => {
    const response = await api.get(`/datasets/${dbName}/${dsId}/meta`);
    return response.data;
  },
};
