import { resolveRoute } from 'goget-router';

export function isPriceSort(sort: string | null | undefined): boolean {
    return sort === 'price_asc' || sort === 'price_desc';
}

export function resetPriceSort(): void {
    const params = new URLSearchParams(location.search);
    params.delete('sort');
    params.delete('page');
    const url = params.size ? `${location.pathname}?${params}` : location.pathname;
    history.replaceState({ priceSortReset: true }, '', url);
    window.scrollTo(0, 0);
    void resolveRoute();
}

export function wasPriceSortReset(): boolean {
    return history.state?.priceSortReset === true;
}
