import { ensureOk, json } from './errors';
import { request } from './request';
import { jsonBody, query } from './utils';
import type { AdPage, PageQuery, SellerShort, Sort } from './types';

export interface SellerProfile extends SellerShort {
    location: string;
    phone_verified: boolean;
    completed_sales_count: number;
    active_listings_count: number;
}

export interface SellerAdPage extends AdPage {
    categories: { id: number; name: string; count: number }[];
}

export type ReviewSort = 'newest' | 'rating_desc' | 'rating_asc';

export type ReportReason = 'fraud' | 'prohibited' | 'rude' | 'other';

export interface Review {
    id: number;
    author: { id: number; first_name: string; avatar_url: string | null };
    rating: number;
    text: string;
    listing_title: string | null;
    photos: string[];
    created_at: string;
}

export interface ReviewPage extends AdPage<Review> {
    rating: number;
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export async function getSeller(id: number): Promise<SellerProfile> {
    return json(await request(`/sellers/${id}`));
}

export async function getSellerListings(
    id: number,
    params: PageQuery & { category_id?: number; sort?: Sort } = {},
): Promise<SellerAdPage> {
    return json(await request(`/sellers/${id}/listings${query(params)}`));
}

export async function getSellerReviews(
    id: number,
    params: PageQuery & { sort?: ReviewSort; with_photos?: boolean } = {},
): Promise<ReviewPage> {
    return json(await request(`/sellers/${id}/reviews${query(params)}`));
}

export async function reportSeller(id: number, data: { reason: ReportReason; comment: string }): Promise<void> {
    await ensureOk(await request(`/sellers/${id}/reports`, { method: 'POST', ...jsonBody(data) }));
}
