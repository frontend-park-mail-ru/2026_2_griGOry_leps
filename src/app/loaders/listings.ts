import {
    ApiError, getCategories, getCategoryTree, getListing, getListings, getPromos, getProducts,
    type AdCard, type CategoryNode, type Listing,
} from '@/lib/api';
import type { Category } from '@/lib/catalog';
import { logWarn } from '@/lib/core';
import type { RouteParams } from 'goget-router';
import type { HomeData } from '@/pages/home-page/home-page';

export async function loadHome(): Promise<HomeData> {
    const [categories, promos, products] = await Promise.all([
        getCategories(),
        getPromos(),
        getProducts(),
    ]);
    return { categories, promos, products };
}

export async function loadCategories(): Promise<{ categories: Category[] }> {
    return { categories: await getCategories() };
}

export async function loadListing(id: string): Promise<Listing | null> {
    if (!/^\d+$/.test(id)) return null;
    try {
        return await getListing(Number(id));
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

export async function loadSimilar(listing: Listing): Promise<AdCard[]> {
    if (!listing.category || listing.is_owner) return [];
    try {
        const { items } = await getListings({ category_id: listing.category.id, limit: 7 });
        return items.filter((item) => item.id !== listing.id).slice(0, 6);
    } catch (err) {
        logWarn('Не удалось загрузить похожие объявления:', err);
        return [];
    }
}

export async function loadListingPage({ id }: RouteParams): Promise<{ listing: Listing | null; similar: AdCard[] }> {
    const listing = await loadListing(id);
    return { listing, similar: listing ? await loadSimilar(listing) : [] };
}

export async function loadListingNew(): Promise<{ categories: CategoryNode[] }> {
    return { categories: await getCategoryTree() };
}

export async function loadListingEdit({ id }: RouteParams): Promise<{ listing: Listing | null; categories: CategoryNode[] }> {
    const [listing, categories] = await Promise.all([loadListing(id), getCategoryTree()]);
    return { listing: listing?.is_owner && listing.status !== 'sold' ? listing : null, categories };
}
