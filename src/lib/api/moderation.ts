import { ensureOk, json } from './errors';
import type { Listing } from './listings';
import { request } from './request';
import { jsonBody, query } from './utils';

const PATH = '/moderation/listings';

export interface ModerationRequest {
    id: number;
    title: string;
    price: string | null;
    requested_at: string;
}

export interface ModerationPageData {
    items: ModerationRequest[];
    next_cursor: string | null;
}

export interface ModerationSnapshot {
    listing: Listing;
    revision: number;
    requested_at: string;
}

export async function getModerationQueue(cursor?: string): Promise<ModerationPageData> {
    return json(await request(`${PATH}${query({ cursor })}`));
}

export async function getModerationListing(id: number): Promise<ModerationSnapshot> {
    return json(await request(`${PATH}/${id}`));
}

export async function decideModeration(id: number, revision: number, reason?: string): Promise<void> {
    const action = reason === undefined ? 'approve' : 'reject';
    await ensureOk(await request(`${PATH}/${id}/${action}`, {
        method: 'POST',
        ...jsonBody({ revision, reason }),
    }));
}
