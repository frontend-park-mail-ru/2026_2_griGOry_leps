import { ApiError, query, request } from '@/lib/api';

export const scopes = ['frontend', 'auth', 'ads', 'search'] as const;
export type Scope = typeof scopes[number];
export type Kind = 'config' | 'flag';
export type Entry = { id: number; name: string; scope: Scope; kind: Kind; value: unknown };
export type Values = Pick<Entry, 'scope' | 'name' | 'value'>;
export interface EntriesFilter {
    kind: Kind;
    scope?: Scope;
    name?: string;
}

const entriesPath = '/onlineconf/admin/entries';

async function checked(response: Response) {
    if (response.ok) return response;
    const body = await response.json().catch(() => null);
    const reason = typeof body?.error === 'string' ? body.error
        : typeof body?.error?.message === 'string' ? body.error.message : '';
    throw new ApiError(response.status, { reason });
}

function isEntry(row: unknown, kind: Kind): row is Entry {
    if (!row || typeof row !== 'object') return false;
    const entry = row as Partial<Entry>;
    return Number.isSafeInteger(entry.id) && Number(entry.id) > 0 && typeof entry.name === 'string'
        && entry.kind === kind && scopes.some(scope => scope === entry.scope) && Object.hasOwn(entry, 'value');
}

export async function searchEntries({ kind, scope, name }: EntriesFilter): Promise<Entry[]> {
    const response = await checked(await request(entriesPath + query({ kind, scope, name: name?.trim() }), { cache: 'no-store' }));
    const rows: unknown = await response.json();
    if (rows === null) return [];
    if (!Array.isArray(rows) || !rows.every(row => isEntry(row, kind))) {
        throw new Error('Сервис вернул неожиданный формат списка.');
    }
    return rows;
}

export async function saveEntry(kind: Kind, values: Values, id?: number): Promise<void> {
    const path = id === undefined ? entriesPath : `${entriesPath}/${id}`;
    const response = await checked(await request(path, {
        method: id === undefined ? 'POST' : 'PATCH',
        body: JSON.stringify(id === undefined ? { ...values, kind } : values),
    }));
    const saved: unknown = await response.json();
    if (!isEntry(saved, kind) || (id !== undefined && id !== saved.id)) {
        throw new Error('Сервис не подтвердил сохранение.');
    }
}

export async function deleteEntry(id: number): Promise<void> {
    await checked(await request(`${entriesPath}/${id}`, { method: 'DELETE' }));
}

export function accessStatus(error: unknown): 401 | 403 | null {
    if (error instanceof ApiError) {
        if (error.status === 401) return 401;
        if (error.status === 403 && error.reason === 'forbidden') return 403;
    }
    return null;
}

export function errorText(error: unknown, fallback: string): string {
    if (error instanceof ApiError && error.status === 409) {
        return 'Это название уже занято в выбранном скоупе.';
    }
    return error instanceof ApiError && error.reason ? error.reason : fallback;
}
