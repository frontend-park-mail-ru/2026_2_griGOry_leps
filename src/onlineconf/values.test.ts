import { expect, it } from 'vitest';
import { makeDraft, parseDraft, readRule } from './values';

it.each(['null', 'false', '0', '"Москва"', '[1,2]', '{"limit":24}'])('сохраняет значение JSON %s', json => {
    const draft = { ...makeDraft('config'), name: 'limit', json };
    expect(parseDraft('config', draft).value).toEqual(JSON.parse(json));
});

it('сообщает о некорректном JSON', () => {
    expect(() => parseDraft('config', { ...makeDraft('config'), name: 'x', json: '{' })).toThrow('JSON');
});

it.each(['-1', '', '101', '0.5'])('отклоняет недопустимый процент %s', percent => {
    expect(() => parseDraft('flag', { ...makeDraft('flag'), name: 'x', percent })).toThrow('процент');
});

it('сохраняет оба списка и удаляет повторы внутри списка', () => {
    const draft = { ...makeDraft('flag'), name: 'new_sort', percent: '20', include: '7, 7 12', exclude: '7' };
    expect(parseDraft('flag', draft).value).toEqual({ rollout_percent: 20, included_user_ids: [7, 12], excluded_user_ids: [7] });
});

it.each(['0', '2147483648', '1.5', 'abc'])('отклоняет некорректный ID %s', exclude => {
    expect(() => parseDraft('flag', { ...makeDraft('flag'), name: 'x', exclude })).toThrow('ID');
});

it('открывает логические флаги, сохранённые первой версией сервиса', () => {
    expect(readRule(false)?.rollout_percent).toBe(0);
    expect(readRule(true)?.rollout_percent).toBe(100);
});

it('открывает флаг из API и сохраняет его настройки без потерь', () => {
    const value = { rollout_percent: 25, included_user_ids: [7, 12], excluded_user_ids: [17] };
    const entry = { id: 1, scope: 'search', kind: 'flag', name: 'price_sort', value } as const;
    const draft = makeDraft('flag', entry);
    expect(draft).toMatchObject({ percent: '25', include: '7, 12', exclude: '17' });
    expect(parseDraft('flag', draft)).toEqual({ scope: 'search', name: 'price_sort', value });
});
