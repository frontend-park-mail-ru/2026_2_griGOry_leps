import { json } from './errors';
import { request } from './request';

export type SearchButtonColor = 'blue' | 'orange';

export interface SearchSettings {
    max_query_length: number | null;
    price_sort_enabled: boolean;
    search_button_color?: SearchButtonColor;
}

export async function getSearchSettings(): Promise<SearchSettings> {
    return json(await request('/search/settings'));
}
