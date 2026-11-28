import { json } from './errors';
import { request } from './request';

export interface SearchSettings {
    max_query_length: number | null;
    price_sort_enabled: boolean;
}

export async function getSearchSettings(): Promise<SearchSettings> {
    return json(await request('/search/settings'));
}
