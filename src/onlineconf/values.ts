import type { Entry, Kind, Scope, Values } from './api';

interface Rule {
    percent: number;
    includeUserIDs: number[];
    excludeUserIDs: number[];
}

export function readRule(value: unknown): Rule | null {
    if (typeof value === 'boolean') {
        return { percent: value ? 100 : 0, includeUserIDs: [], excludeUserIDs: [] };
    }
    if (!value || typeof value !== 'object') return null;

    const rule = value as Partial<Rule>;
    if (typeof rule.percent !== 'number' || !Number.isInteger(rule.percent) || rule.percent < 0 || rule.percent > 100) {
        return null;
    }
    if (![rule.includeUserIDs, rule.excludeUserIDs].every(ids => Array.isArray(ids) && ids.every(validID))) {
        return null;
    }
    return rule as Rule;
}

function validID(id: unknown): boolean {
    return typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= 2147483647;
}

function parseIDs(raw: string, label: string): number[] {
    if (!raw.trim()) return [];
    const parts = raw.trim().split(/[\s,;]+/);
    if (parts.some(s => !/^\d+$/.test(s) || !validID(Number(s)))) {
        throw new Error(`Проверьте ID в поле «${label}».`);
    }
    return [...new Set(parts.map(Number))];
}

export function makeDraft(kind: Kind, entry?: Entry, scope: Scope = 'frontend') {
    const rule = entry && kind === 'flag' ? readRule(entry.value) : null;

    return {
        name: entry?.name ?? '',
        scope: entry?.scope ?? scope,
        json: entry && kind === 'config' ? JSON.stringify(entry.value, null, 2) : '',
        percent: String(rule?.percent ?? 0),
        include: rule?.includeUserIDs.join(', ') ?? '',
        exclude: rule?.excludeUserIDs.join(', ') ?? '',
    };
}

export function parseDraft(kind: Kind, draft: ReturnType<typeof makeDraft>): Values {
    const name = draft.name.trim();
    if (!name || [...name].length > 255) {
        throw new Error('Введите название длиной от 1 до 255 символов.');
    }

    let value: unknown;
    if (kind === 'config') {
        try {
            value = JSON.parse(draft.json);
        } catch {
            throw new Error('Проверьте JSON. Строки и названия полей должны быть в двойных кавычках.');
        }
    } else {
        const percent = Number(draft.percent);
        if (!/^\d+$/.test(draft.percent) || percent > 100) {
            throw new Error('Введите целый процент от 0 до 100.');
        }
        value = {
            percent,
            includeUserIDs: parseIDs(draft.include, 'Всегда включён для'),
            excludeUserIDs: parseIDs(draft.exclude, 'Всегда выключен для'),
        };
    }

    return { name, scope: draft.scope, value };
}
