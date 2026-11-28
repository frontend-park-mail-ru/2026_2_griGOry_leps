import type { Child } from 'goget-vdom';
import type { Entry } from './api';

const MAX_VALUE_LENGTH = 80;

interface Rollout {
    rollout_percent: number;
    included_user_ids: number[];
    excluded_user_ids: number[];
}

function isRollout(value: unknown): value is Rollout {
    if (!value || typeof value !== 'object') return false;
    const rollout = value as Record<string, unknown>;
    return typeof rollout.rollout_percent === 'number'
        && Array.isArray(rollout.included_user_ids)
        && Array.isArray(rollout.excluded_user_ids);
}

function shorten(text: string): string {
    return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH - 1)}…` : text;
}

/** Краткое значение для строки списка: JSON конфига или правило флага по-русски. */
export function formatValue({ kind, value }: Entry): string {
    if (kind === 'flag') {
        if (value === true) return 'Включён';
        if (value === false) return 'Выключен';
        if (isRollout(value)) {
            const parts = [`${value.rollout_percent}%`];
            if (value.included_user_ids.length) parts.push(`вкл. ${value.included_user_ids.length}`);
            if (value.excluded_user_ids.length) parts.push(`искл. ${value.excluded_user_ids.length}`);
            return parts.join(' · ');
        }
    }
    return shorten(JSON.stringify(value) ?? String(value));
}

/** Первое вхождение запроса без учёта регистра — в <mark>, как его ищет бэкенд. */
export function highlight(name: string, search: string): Child[] {
    const start = search ? name.toLowerCase().indexOf(search.toLowerCase()) : -1;
    if (start < 0) return [name];

    const end = start + search.length;
    return [
        name.slice(0, start),
        <mark class="entries-search__mark">{name.slice(start, end)}</mark>,
        name.slice(end),
    ].filter(part => part !== '');
}
