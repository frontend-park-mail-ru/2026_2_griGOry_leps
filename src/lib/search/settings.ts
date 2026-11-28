import { getSearchSettings, type SearchSettings } from '@/lib/api';
import { logWarn } from '@/lib/core';
import { getUser } from '@/lib/user';

export const CAUTIOUS_SEARCH_SETTINGS: SearchSettings = {
    max_query_length: null,
    price_sort_enabled: false,
};

let current: SearchSettings | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
let userId = getUser()?.id ?? null;
let generation = 0;

function syncUser(): void {
    const nextUserId = getUser()?.id ?? null;
    if (nextUserId === userId) return;
    userId = nextUserId;
    generation++;
    // Флаг зависит от сессии: старые настройки нельзя применять во время новой загрузки.
    current = null;
    inFlight = null;
}

function normalize(raw: unknown): SearchSettings {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)
        || !('max_query_length' in raw) || !('price_sort_enabled' in raw)) {
        throw new Error('Некорректные настройки поиска');
    }
    const limit = raw.max_query_length;
    return {
        max_query_length: typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : null,
        price_sort_enabled: raw.price_sort_enabled === true,
    };
}

function update(value: SearchSettings): void {
    if (current?.max_query_length === value.max_query_length
        && current?.price_sort_enabled === value.price_sort_enabled) return;
    current = value;
    listeners.forEach(fn => fn());
}

export function searchSettings(): SearchSettings | null {
    syncUser();
    return current;
}

export function subscribeSearchSettings(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function refreshSearchSettings(): Promise<void> {
    syncUser();
    if (inFlight) return inFlight;
    const requestGeneration = generation;
    inFlight = getSearchSettings()
        .then(raw => {
            syncUser();
            if (requestGeneration === generation) update(normalize(raw));
        })
        .catch(err => {
            syncUser();
            if (requestGeneration !== generation) return;
            logWarn('Не удалось получить настройки поиска:', err);
            if (current === null) update(CAUTIOUS_SEARCH_SETTINGS);
        })
        .finally(() => {
            if (requestGeneration === generation) inFlight = null;
        });
    return inFlight;
}

export function queryLength(q: string): number {
    return [...q.trim()].length;
}
