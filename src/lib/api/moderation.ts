import { ensureOk, json } from './errors';
import { request } from './request';
import { jsonBody, query } from './utils';
import type { Listing } from './listings';

export interface ModerationItem {
    id: number;
    title: string;
    revision: number;
    updated_at: string;
}

export interface ModerationQueue {
    items: ModerationItem[];
    limit: number;
}

export interface ModerationSnapshot {
    listing: Listing;
    revision: number;
}

const path = '/admin/moderation/listings';

export async function getModerationQueue(afterId = 0, limit = 20): Promise<ModerationQueue> {
    return json(await request(`${path}${query({ after_id: afterId, limit })}`));
}

export async function getModerationListing(id: number): Promise<ModerationSnapshot> {
    return json(await request(`${path}/${id}`));
}

export async function approveModerationListing(id: number, revision: number): Promise<void> {
    await ensureOk(await request(`${path}/${id}/approve`, { method: 'POST', ...jsonBody({ revision }) }));
}

export async function rejectModerationListing(id: number, revision: number, reason: string): Promise<void> {
    await ensureOk(await request(`${path}/${id}/reject`, { method: 'POST', ...jsonBody({ revision, reason }) }));
}
