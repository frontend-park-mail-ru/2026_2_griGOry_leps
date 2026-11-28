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
    expect(parseDraft('flag', draft).value).toEqual({ percent: 20, includeUserIDs: [7, 12], excludeUserIDs: [7] });
});

it.each(['0', '2147483648', '1.5', 'abc'])('отклоняет некорректный ID %s', exclude => {
    expect(() => parseDraft('flag', { ...makeDraft('flag'), name: 'x', exclude })).toThrow('ID');
});

it('открывает логические флаги, сохранённые первой версией сервиса', () => {
    expect(readRule(false)?.percent).toBe(0);
    expect(readRule(true)?.percent).toBe(100);
});
