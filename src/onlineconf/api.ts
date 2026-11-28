import { ApiError, query, request } from '@/lib/api';

export const scopes = ['frontend', 'auth', 'ads', 'search'] as const;
export type Scope = typeof scopes[number];
export type Kind = 'config' | 'flag';
export type Entry = { id: number; name: string; scope: Scope; kind: Kind; value: unknown };
export type Values = Pick<Entry, 'scope' | 'name' | 'value'>;
export interface HistoryChange {
    field: string;
    old_value: unknown;
    new_value: unknown;
}

export interface HistoryEntry {
    id: number;
    created_at: string;
    author: {
        id: number;
        name: string;
    };
    action: 'create' | 'update' | 'delete';
    changes: HistoryChange[];
}

export interface HistoryChange {
    field: string;
    old_value: unknown;
    new_value: unknown;
}

export interface HistoryEntry {
    id: number;
    created_at: string;
    author: {
        id: number;
        name: string;
    };
    action: 'create' | 'update' | 'delete';
    changes: HistoryChange[];
}

interface HistoryRecord {
    id: number;
    entry_id: number;
    actor_id: number;
    actor_name?: string;
    operation: 'create' | 'update' | 'delete';
    changed_at: string;
    before: Entry | null;
    after: Entry | null;
}

export interface EntriesFilter {
    kind: Kind;
    scope?: Scope;
    name?: string;
}

export interface EntriesFilter {
    kind: Kind;
    scope?: Scope;
    name?: string;
}

const entriesPath = '/onlineconf/admin/entries';

export async function checkFlag(id: number, userID: number): Promise<boolean> {
    const response = await checked(await request(`${entriesPath}/${id}/check?user_id=${userID}`, { cache: 'no-store' }));
    const result = await response.json();
    if (typeof result?.enabled !== 'boolean') throw new Error('Некорректный ответ сервиса.');
    return result.enabled;
}

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


export async function searchEntries(
    { kind, scope, name }: EntriesFilter
): Promise<Entry[]> {
    const response = await checked(
        await request(
            entriesPath + query({
                kind,
                scope,
                name: name?.trim(),
            }),
            { cache: 'no-store' }
        )
    );

    const rows: unknown = await response.json();

    if (rows === null) return [];

    if (!Array.isArray(rows) ||
        !rows.every(row => isEntry(row, kind))) {
        throw new Error(
            'Сервис вернул неожиданный формат списка.'
        );
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


function compareValues(
    before: unknown,
    after: unknown,
    field: string
): HistoryChange[] {
    if (before === after) {
        return [];
    }

    if (
        before !== null &&
        after !== null &&
        typeof before === 'object' &&
        typeof after === 'object' &&
        !Array.isArray(before) &&
        !Array.isArray(after)
    ) {
        const oldData = before as Record<string, unknown>;
        const newData = after as Record<string, unknown>;

        const keys = new Set([
            ...Object.keys(oldData),
            ...Object.keys(newData),
        ]);

        return [...keys].flatMap(key =>
            compareValues(
                oldData[key],
                newData[key],
                field === 'value' ? key : `${field}.${key}`
            )
        );
    }

    if (JSON.stringify(before) === JSON.stringify(after)) {
        return [];
    }

    return [{
        field,
        old_value: before,
        new_value: after,
    }];
}

function normalizeHistory(
    record: HistoryRecord
): HistoryEntry {
    const changes: HistoryChange[] = [];

    for (const field of ['name', 'scope', 'value'] as const) {
        changes.push(...compareValues(
            record.before?.[field],
            record.after?.[field],
            field
        ));
    }

    return {
        id: record.id,
        created_at: record.changed_at,
        author: {
            id: record.actor_id,
            name: record.actor_name ||
                `Пользователь #${record.actor_id}`,
        },
        action: record.operation,
        changes,
    };
}  


export async function getEntryHistory(
    id: number
): Promise<HistoryEntry[]> {
    const response = await checked(
        await request(
            `${entriesPath}/${id}/history`,
            { cache: 'no-store' }
        )
    );

    const records: unknown = await response.json();

    if (records === null) return [];

    if (!Array.isArray(records)) {
        throw new Error(
            'Сервис вернул неожиданный формат истории.'
        );
    }

    return (records as HistoryRecord[])
        .map(normalizeHistory);
}
