import { resolveRoute } from 'goget-router';

export function isPriceSort(sort: string | null | undefined): boolean {
    return sort === 'price_asc' || sort === 'price_desc';
}

export function resetPriceSort(): void {
    const url = new URL(location.href);
    url.searchParams.delete('sort');
    url.searchParams.delete('page');
    history.replaceState({ priceSortReset: true }, '', url);
    window.scrollTo(0, 0);
    void resolveRoute();
}

export function wasPriceSortReset(): boolean {
    return history.state?.priceSortReset === true;
}
