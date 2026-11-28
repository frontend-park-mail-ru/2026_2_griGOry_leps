import type { Entry, Kind, Scope, Values } from './api';

interface Rule {
    rollout_percent: number;
    included_user_ids: number[];
    excluded_user_ids: number[];
}

export function readRule(value: unknown): Rule | null {
    if (typeof value === 'boolean') {
        return { rollout_percent: value ? 100 : 0, included_user_ids: [], excluded_user_ids: [] };
    }
    if (!value || typeof value !== 'object') return null;

    const rule = value as Partial<Rule>;
    const percent = rule.rollout_percent;
    if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
        return null;
    }
    if (![rule.included_user_ids, rule.excluded_user_ids].every(ids => Array.isArray(ids) && ids.every(validID))) {
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
        percent: String(rule?.rollout_percent ?? 0),
        include: rule?.included_user_ids.join(', ') ?? '',
        exclude: rule?.excluded_user_ids.join(', ') ?? '',
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
            rollout_percent: percent,
            included_user_ids: parseIDs(draft.include, 'Всегда включён для'),
            excluded_user_ids: parseIDs(draft.exclude, 'Всегда выключен для'),
        } satisfies Rule;
    }

    return { name, scope: draft.scope, value };
}
