import { Database } from "types/responses/registry.interface";

export interface INeuroJsonState {
  loading: boolean;
  registry: Database[] | null;
  error: string | null;
  data: any[];
  selectedDocument: any | null;
  offset: number;
  limit: number;
  hasMore: boolean;
  dbInfo: DBParticulars | null; // add dbInfo type
  dbStats: DbStatsItem[] | null; // for dbStats on landing page
  searchResults: any[] | { status: string; msg: string } | null;
}

export interface DBParticulars {
  instance_start_time: string;
  db_name: string;
  purge_seq: string;
  update_seq: string;
  sizes: Sizes;
  props: Props;
  doc_del_count: number;
  doc_count: number;
  disk_format_version: number;
  compact_running: boolean;
  cluster: Cluster;
}

export interface Cluster {
  q: number;
  n: number;
  w: number;
  r: number;
}

export interface Props {}

export interface Sizes {
  file: number;
  external: number;
  active: number;
}
export interface DBDatafields {
  total_rows: number;
  offset: number;
  rows: Row[];
}

export interface Row {
  id: string;
  key: string;
  value: Value;
}

export interface Value {
  name?: string;
  length: number;
  readme: string;
  info: Info;
  subj: string[];
  modality: Modality[];
}

export interface Info {
  BIDSVersion?: string;
  License?: string;
  Name?: string;
  ReferencesAndLinks?: string[];
  Authors?: string[];
  DatasetDOI?: string;
  Acknowledgements?: string;
  HowToAcknowledge?: string;
  Funding?: string[] | string;
  Description?: string;
  _DataLink_?: string;
  EthicsApprovals?: string[];
}

export enum Modality {
  Anat = "anat",
  Beh = "beh",
  Dwi = "dwi",
  Fmap = "fmap",
  Func = "func",
}

export interface DbStatsItem {
  view: string;
  num: number;
  size: number;
}
