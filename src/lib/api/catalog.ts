import { mockCategories, mockPromos, type Category, type Promo } from '../data';
import { json } from './errors';
import { request } from './request';
import { query } from './utils';
import type { City } from './types';

export interface CategoryNode {
    id: number;
    name: string;
    slug: string;
    /** Пустой массив у листа */
    children: CategoryNode[];
}

/** Без query — популярные города */
export async function getCities(search = ''): Promise<City[]> {
    return json(await request(`/cities${query({ query: search })}`));
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
    return json(await request('/categories'));
}

/** Пока из data.ts: у категорий на главной есть картинки, которых нет в /categories */
export function getCategories(): Promise<Category[]> {
    return Promise.resolve(mockCategories);
}

export function getPromos(): Promise<Promo[]> {
    return Promise.resolve(mockPromos);
}
