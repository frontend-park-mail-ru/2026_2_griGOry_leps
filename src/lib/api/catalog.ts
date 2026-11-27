import { categoryCovers, mockPromos, type Category, type Promo } from '@/lib/catalog';
import { json } from './errors';
import { request } from './request';
import { query } from './utils';
import type { City } from './types';

export interface CategoryNode {
    id: number;
    name: string;
    slug: string;
    delivery_allowed: boolean;
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

export async function getCategories(): Promise<Category[]> {
    const tree = await getCategoryTree();
    return tree.map(({ slug, name, children }) => ({
        slug, name, image: categoryCovers[slug], subcategories: children,
    }));
}

export function getPromos(): Promise<Promo[]> {
    return Promise.resolve(mockPromos);
}
