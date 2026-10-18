import { json } from './errors';
import { request } from './request';
import { query } from './utils';
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

export async function getSeller(id: number): Promise<SellerProfile> {
    return json(await request(`/sellers/${id}`));
}

export async function getSellerListings(
    id: number,
    params: PageQuery & { category_id?: number; sort?: Sort } = {},
): Promise<SellerAdPage> {
    return json(await request(`/sellers/${id}/listings${query(params)}`));
}
