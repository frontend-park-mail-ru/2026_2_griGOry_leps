import { expect, it } from 'vitest';
import { render } from 'goget-vdom';
import type { OnlineconfEntry } from './api';
import { formatValue, highlight } from './format';

const config = (value: unknown): OnlineconfEntry => ({ id: 1, scope: 'search', name: 'limit', kind: 'config', value });
const flag = (value: unknown): OnlineconfEntry => ({ id: 2, scope: 'search', name: 'price_sort', kind: 'flag', value });

it('показывает значение конфига одной строкой JSON', () => {
    expect(formatValue(config(100))).toBe('100');
    expect(formatValue(config('abc'))).toBe('"abc"');
    expect(formatValue(config([1, 2]))).toBe('[1,2]');
});

it('обрезает длинное значение конфига до 80 символов', () => {
    const text = formatValue(config({ text: 'x'.repeat(100) }));
    expect(text).toHaveLength(80);
    expect(text.endsWith('…')).toBe(true);
    expect(text.startsWith('{"text":"xxx')).toBe(true);
});

it('показывает состояние флага', () => {
    expect(formatValue(flag(true))).toBe('Включён');
    expect(formatValue(flag(false))).toBe('Выключен');
    expect(formatValue(flag({ rollout_percent: 25, included_user_ids: [4], excluded_user_ids: [7, 9] })))
        .toBe('25% · вкл. 1 · искл. 2');
    expect(formatValue(flag({ rollout_percent: 0, included_user_ids: [], excluded_user_ids: [] }))).toBe('0%');
    expect(formatValue(flag('oops'))).toBe('"oops"');
});

function renderName(name: string, query: string): HTMLElement {
    const root = document.createElement('p');
    render(root, <span>{highlight(name, query)}</span>);
    return root;
}

it('подсвечивает совпадение без учёта регистра', () => {
    const latin = renderName('max_query_length', 'QUERY');
    expect(latin.textContent).toBe('max_query_length');
    expect(latin.querySelector('mark.entries-search__mark')?.textContent).toBe('query');

    const cyrillic = renderName('Сортировка', 'сорт');
    expect(cyrillic.querySelector('mark')?.textContent).toBe('Сорт');
});

it('не подсвечивает, если совпадения нет', () => {
    expect(highlight('abc', 'x')).toEqual(['abc']);
    expect(highlight('abc', '')).toEqual(['abc']);
    expect(renderName('abc', 'x').querySelector('mark')).toBeNull();
});
