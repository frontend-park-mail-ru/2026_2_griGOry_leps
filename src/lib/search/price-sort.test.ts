import { afterEach, expect, it, vi } from 'vitest';
import { resolveRoute } from 'goget-router';
import { isPriceSort, resetPriceSort, wasPriceSortReset } from './price-sort';

vi.mock('goget-router', async (orig) => ({
    ...await orig<typeof import('goget-router')>(),
    resolveRoute: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => vi.restoreAllMocks());

it('распознаёт только сортировку по цене', () => {
    expect(isPriceSort('price_asc')).toBe(true);
    expect(isPriceSort('price_desc')).toBe(true);
    expect(isPriceSort('newest')).toBe(false);
    expect(isPriceSort(undefined)).toBe(false);
});

it('убирает sort и page без новой записи в истории', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    history.replaceState(null, '', '/search?q=велосипед&city=Тула&sort=price_asc&page=3');
    const length = history.length;
    resetPriceSort();
    expect(location.pathname).toBe('/search');
    expect(Object.fromEntries(new URLSearchParams(location.search))).toEqual({ q: 'велосипед', city: 'Тула' });
    expect(history.length).toBe(length);
    expect(wasPriceSortReset()).toBe(true);
    history.pushState({}, '', '/search');
    expect(wasPriceSortReset()).toBe(false);
});

it('после сброса обновляет маршрут', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    history.replaceState(null, '', '/search?sort=price_desc&page=2');
    resetPriceSort();
    expect(resolveRoute).toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
});
