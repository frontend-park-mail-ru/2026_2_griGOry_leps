import { ensureOk, json } from './errors';
import { request } from './request';
import { fileBody, jsonBody, query } from './utils';
import type { AdCard, AdPage, City, CloseReason, ListingStatus, PageQuery, User } from './types';

/** Полный профиль текущего пользователя (GET /me) */
export interface Profile extends User {
    phone_verified: boolean;
    city: City | null;
    about: string;
    avatar_url: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
}

export interface UpdateProfileData {
    first_name?: string;
    phone?: string;
    email?: string;
    city_id?: number;
    about?: string;
}

export interface MyAdCard extends AdCard {
    status: ListingStatus;
    close_reason: CloseReason | null;
    updated_at: string;
}

export interface MyListingPage extends AdPage<MyAdCard> {
    counts: Record<'all' | ListingStatus, number>;
}

export async function updateProfile(data: UpdateProfileData): Promise<Profile> {
    return json(await request('/me', { method: 'PATCH', ...jsonBody(data) }));
}

export async function uploadAvatar(file: Blob): Promise<{ avatar_url: string | null }> {
    return json(await request('/me/avatar', { method: 'POST', ...fileBody(file) }));
}

export async function changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await ensureOk(await request('/me/password', { method: 'PUT', ...jsonBody(data) }));
}

export async function getMyListings(params: PageQuery & { status?: ListingStatus } = {}): Promise<MyListingPage> {
    return json(await request(`/me/listings${query(params)}`));
}
