import { json, query, request } from '@/lib/api';

export type OnlineconfKind = 'config' | 'flag';
export type OnlineconfScope = 'frontend' | 'auth' | 'ads' | 'search';

export const ONLINECONF_SCOPES: OnlineconfScope[] = ['frontend', 'auth', 'ads', 'search'];

export interface OnlineconfEntry {
    id: number;
    scope: OnlineconfScope;
    name: string;
    kind: OnlineconfKind;
    /** Конфиг — любое JSON-значение; флаг — boolean или правила раскатки */
    value: unknown;
}

export interface EntriesFilter {
    kind: OnlineconfKind;
    scope?: OnlineconfScope;
    name?: string;
}

/**
 * Записи OnlineConf для вкладки админки. Параметры и ответ — как у поиска
 * сервиса OnlineConf (`GET /v1/entries`), но путь — под защищённым
 * `/onlineconf/admin`: без права OnlineConf бэкенд отвечает 403.
 */
export async function searchEntries({ kind, scope, name }: EntriesFilter): Promise<OnlineconfEntry[]> {
    return json<OnlineconfEntry[]>(await request(`/onlineconf/admin/entries${query({ kind, scope, name })}`));
}
