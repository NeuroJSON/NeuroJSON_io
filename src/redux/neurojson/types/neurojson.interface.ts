import { Database } from "types/responses/registry.interface";

export interface INeuroJsonState {
	loading: boolean;
	registry: Database[] | null;
	error: string | null;
}
