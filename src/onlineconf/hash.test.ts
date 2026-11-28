import { expect, it } from 'vitest';
import { hashFor, readHash } from './hash';

it('читает вкладку и фильтры из решётки', () => {
    expect(readHash('#flags?scope=search&name=sort')).toEqual({ kind: 'flag', scope: 'search', name: 'sort' });
    expect(readHash('#configs?name=%D0%BB%D0%B8%D0%BC%D0%B8%D1%82')).toEqual({ kind: 'config', scope: '', name: 'лимит' });
    expect(readHash('#flags')).toEqual({ kind: 'flag', scope: '', name: '' });
});

it('открывает конфиги для пустой и незнакомой решётки', () => {
    expect(readHash('')).toEqual({ kind: 'config', scope: '', name: '' });
    expect(readHash('#')).toEqual({ kind: 'config', scope: '', name: '' });
    expect(readHash('#other?name=x')).toEqual({ kind: 'config', scope: '', name: 'x' });
});

it('игнорирует незнакомый скоуп', () => {
    expect(readHash('#flags?scope=web&name=a')).toEqual({ kind: 'flag', scope: '', name: 'a' });
});

it('собирает решётку без пустых фильтров', () => {
    expect(hashFor('flag', 'search', 'sort')).toBe('#flags?scope=search&name=sort');
    expect(hashFor('config', '', '  ')).toBe('#configs');
    expect(hashFor('config', 'ads', ' цена ')).toBe(`#configs?scope=ads&name=${encodeURIComponent('цена')}`);
});

it('читает то, что собрал', () => {
    for (const filter of [
        { kind: 'flag', scope: 'auth', name: 'a&b=c #d' },
        { kind: 'config', scope: '', name: '🚲' },
    ] as const) {
        expect(readHash(hashFor(filter.kind, filter.scope, filter.name))).toEqual(filter);
    }
});
