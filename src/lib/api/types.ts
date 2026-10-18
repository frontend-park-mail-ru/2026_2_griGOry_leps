/** Общие типы, которые используются в нескольких разделах API */

export type Price = string;
export type ListingStatus = 'draft' | 'moderation' | 'active' | 'closed' | 'sold';
export type CloseReason = 'sold_on_goget' | 'sold_elsewhere' | 'changed_mind' | 'other';
export type Condition = 'new' | 'used_good' | 'used_repair';
export type Sort = 'newest' | 'price_asc' | 'price_desc';
export type DeliveryMethod = 'courier' | 'pickup_point' | 'self_pickup';
export type PaymentMethod = 'card' | 'sbp' | 'cod';

export interface User {
    id: number;
    email: string;
    first_name: string;
    phone: string;
}

export interface City {
    id: number;
    name: string;
}

export interface PageQuery {
    limit?: number;
    offset?: number;
}

/** Карточка объявления в ленте, на странице продавца и в «Моих объявлениях» */
export interface AdCard {
    id: number;
    title: string;
    /** Цена в рублях строкой, например "15000.00"; "0.00" при is_free */
    price: Price;
    is_free?: boolean;
    image_url: string | null;
    city: string;
    has_delivery: boolean;
    category_id?: number;
    created_at: string;
}

export interface AdPage<T = AdCard> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface SellerShort {
    id: number;
    first_name: string;
    avatar_url: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
}
