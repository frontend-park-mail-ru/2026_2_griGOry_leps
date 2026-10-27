import { json } from './errors';
import { request } from './request';
import { jsonBody } from './utils';
import type { Price } from './types';

export interface CartItem {
    listing_id: number;
    title: string | null;
    price: Price | null;
    image_url: string | null;
    address: string | null;
    delivery_from: string | null;
    availability: 'available' | 'unavailable';
    unavailable_reason: 'sold' | 'closed' | 'deleted' | null;
}

export interface Cart {
    items_count: number;
    groups: {
        seller: { id: number; first_name: string; avatar_url: string | null; rating: number };
        items: CartItem[];
    }[];
}

export interface CartCount {
    items_count: number;
}

export interface CartBulkAddResult extends CartCount {
    skipped_ids: number[];
}

export async function getCart(): Promise<Cart> {
    return json(await request('/cart'));
}

export async function addToCart(listingId: number): Promise<CartCount> {
    return json(await request('/cart/items', { method: 'POST', ...jsonBody({ listing_id: listingId }) }));
}

export async function removeFromCart(listingId: number): Promise<CartCount> {
    return json(await request(`/cart/items/${listingId}`, { method: 'DELETE' }));
}

export async function addToCartBulk(listingIds: number[]): Promise<CartBulkAddResult> {
    return json(await request('/cart/items/bulk-add', { method: 'POST', ...jsonBody({ listing_ids: listingIds }) }));
}

export async function removeFromCartBulk(listingIds: number[]): Promise<CartCount> {
    return json(await request('/cart/items/bulk-delete', { method: 'POST', ...jsonBody({ listing_ids: listingIds }) }));
}
