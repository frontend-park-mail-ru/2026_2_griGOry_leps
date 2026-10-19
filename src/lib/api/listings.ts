import { logWarn } from '@/lib/logger';
import { ensureOk, json } from './errors';
import { request } from './request';
import { fileBody, jsonBody, query } from './utils';
import type { AdCard, AdPage, CloseReason, Condition, ListingStatus, Price, SellerShort, Sort } from './types';

export interface UploadedPhoto {
    id: number;
    url: string;
    thumb_url: string;
}

export interface ListingPhoto extends UploadedPhoto {
    is_main: boolean;
}

/** Объявление целиком (страница объявления) */
export interface Listing {
    id: number;
    title: string;
    category: { id: number; name: string; path: string } | null;
    description: string;
    photos: ListingPhoto[];
    price: Price | null;
    is_free: boolean;
    is_negotiable: boolean;
    condition: Condition | null;
    city: string;
    address: string | null;
    has_delivery: boolean;
    attributes: { key: string; name: string; value: string }[];
    status: ListingStatus;
    close_reason: CloseReason | null;
    seller: SellerShort;
    is_owner: boolean;
    in_cart: boolean;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Поля формы объявления; при правке можно передать любое подмножество */
export interface ListingData {
    category_id?: number;
    title?: string;
    /** Порядок задаёт порядок фото, первое — главное */
    photo_ids?: number[];
    description?: string;
    /** Рубли строкой: "1500" или "1500.50" */
    price?: string;
    is_free?: boolean;
    is_negotiable?: boolean;
    condition?: Condition;
    address?: string;
    has_delivery?: boolean;
}

export interface CreateListingData extends ListingData {
    /** true — на модерацию (по умолчанию), false — черновик */
    publish?: boolean;
}

export interface ListingsQuery {
    q?: string;
    category_id?: number;
    city?: string;
    price_min?: string;
    price_max?: string;
    has_delivery?: boolean;
    sort?: Sort;
    limit?: number;
    offset?: number;
}

export async function getListings(params: ListingsQuery = {}): Promise<AdPage> {
    return json(await request(`/listings${query(params)}`));
}

/** Лента для главной. При ошибке пустой список, чтобы главная не падала */
export async function getProducts(): Promise<AdCard[]> {
    try {
        return (await getListings()).items ?? [];
    } catch (err) {
        logWarn('API недоступен:', err);
        return [];
    }
}

export async function getListing(id: number): Promise<Listing> {
    return json(await request(`/listings/${id}`));
}

export async function createListing(data: CreateListingData): Promise<Listing> {
    return json(await request('/listings', { method: 'POST', ...jsonBody(data) }));
}

export async function updateListing(id: number, data: ListingData): Promise<Listing> {
    return json(await request(`/listings/${id}`, { method: 'PATCH', ...jsonBody(data) }));
}

export async function deleteListing(id: number): Promise<void> {
    await ensureOk(await request(`/listings/${id}`, { method: 'DELETE' }));
}

export async function closeListing(id: number, reason: CloseReason): Promise<Listing> {
    return json(await request(`/listings/${id}/close`, { method: 'POST', ...jsonBody({ reason }) }));
}

/** Фото загружается до отправки формы, в форму уходит его id */
export async function uploadListingPhoto(file: Blob): Promise<UploadedPhoto> {
    return json(await request('/listing-photos', { method: 'POST', ...fileBody(file) }));
}
