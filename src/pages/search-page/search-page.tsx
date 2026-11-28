import { Component } from 'goget-vdom';
import { ProductCard } from '@/components/product-card/product-card';
import { ApiError, searchListings, type AdCard, type SearchFilters, type SearchSettings } from '@/lib/api';
import { searchSettings, refreshSearchSettings, isPriceSort, resetPriceSort, wasPriceSortReset } from '@/lib/search';
import './search-page.scss';
import { SearchFilterForm } from './search-filter-form';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { Button } from '@/components/button/button';
import { plural } from '@/lib/core';
import { validatePrices } from './search-price';

interface SearchPageProps {
    query: string;
    page: number;
    filters: SearchFilters;
    settings: SearchSettings | null;
}

type SearchPageState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'too-long' }
    | { status: 'ready'; items: AdCard[]; total: number };

const pageSize = 24;
function getEmptyMessage(query: string, page: number, filters: SearchFilters): string {
    if (page > 1) return 'На этой странице объявлений нет.';
    if (Object.keys(filters).some(key => key !== 'sort')) {
        return 'По выбранным фильтрам ничего не найдено. Попробуйте изменить условия.';
    }
    if (query) return 'Ничего не найдено. Попробуйте другой запрос.';
    return 'Опубликованных объявлений пока нет.';
}

function readSearchFilters(params: URLSearchParams): SearchFilters {
    const filters: SearchFilters = {};

    const category = Number(params.get('category_id'));
    if (Number.isSafeInteger(category) && category > 0) {
        filters.category_id = category;
    }

    const city = params.get('city')?.trim();
    if (city) filters.city = city;

    const min = params.get('price_min')?.trim().replace(',', '.') ?? '';
    const max = params.get('price_max')?.trim().replace(',', '.') ?? '';
    const { priceMinError, priceMaxError } = validatePrices(min, max);

    if (!priceMinError && !priceMaxError) {
        if (min) filters.price_min = min;
        if (max) filters.price_max = max;
    }

    const delivery = params.get('has_delivery');
    if (delivery === 'true' || delivery === 'false') {
        filters.has_delivery = delivery === 'true';
    }
    const sort = params.get('sort');
    if (sort === 'newest' || sort === 'price_asc' || sort === 'price_desc') {
        filters.sort = sort;
    }


    return filters;
}

export function SearchPage() {
    const params = new URLSearchParams(location.search);
    const query = (params.get('q') ?? '').trim();
    const requestedPage = Number(params.get('page') ?? '1');
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    return (
        <SearchResults
            key={`${query}:${page}`}
            query={query}
            page={page}
            filters={readSearchFilters(params)}
            settings={searchSettings()}
        />
    );
}

class SearchResults extends Component<SearchPageProps, SearchPageState> {
    state: SearchPageState = { status: 'loading' };

    private requestId = 0;
    private requestedFilters = '';
    private requestedPriceSort: boolean | undefined;

    componentDidMount() {
        void this.load();
    }

    componentDidUpdate() {
        if (JSON.stringify(this.props.filters) !== this.requestedFilters
            || (isPriceSort(this.props.filters.sort)
                && this.props.settings?.price_sort_enabled !== this.requestedPriceSort)) {
            void this.load();
        }
    }

    componentWillUnmount() {
        this.requestId++;
    }

    load = async () => {
        const id = ++this.requestId;
        if (location.pathname !== '/search') return;
        const url = location.pathname + location.search;
        const { query, page, filters, settings } = this.props;

        this.requestedFilters = JSON.stringify(filters);
        this.requestedPriceSort = settings?.price_sort_enabled;

        if (this.state.status !== 'loading') {
            this.setState({ status: 'loading' });
        }

        if (isPriceSort(filters.sort)) {
            if (settings === null) return;
            if (!settings.price_sort_enabled) {
                resetPriceSort();
                return;
            }
        }

        try {
            const result = await searchListings({
                q: query,
                limit: pageSize,
                offset: (page - 1) * pageSize,
                filters,
            });

            if (id === this.requestId && location.pathname + location.search === url) {
                this.setState({
                    status: 'ready',
                    items: result.items,
                    total: result.total,
                });
            }
        } catch (err) {
            if (id !== this.requestId || location.pathname + location.search !== url) return;
            if (err instanceof ApiError && err.status === 403 && err.reason === 'price sorting disabled') {
                resetPriceSort();
                void refreshSearchSettings();
            } else if (err instanceof ApiError && err.status === 400 && err.field === 'q') {
                this.setState({ status: 'too-long' });
                void refreshSearchSettings();
            } else {
                this.setState({ status: 'error' });
            }
        }
    };

    pageUrl(page: number) {
        const params = new URLSearchParams(location.search);

        if (page > 1) {
            params.set('page', String(page));
        } else {
            params.delete('page');
        }

        const search = params.toString();
        return search ? `/search?${search}` : '/search';
    }

    render() {
        const { query, page, settings } = this.props;
        const state = this.state;
        const maxQueryLength = settings?.max_query_length ?? null;

        return (
            <section class="search-page">
                <Breadcrumbs flush strong items={[
                    { label: 'Главная', href: '/' },
                    { label: 'Поиск' },
                ]} />

                <h1 class="search-page__title">
                    {query ? `«${query}»` : 'Все объявления'}
                </h1>

                {state.status === 'ready' && (
                    <p class="search-page__count">
                        {`Найдено ${state.total} ${plural(state.total, ['объявление', 'объявления', 'объявлений'])}`}
                        {this.props.filters.city && ` · ${this.props.filters.city}`}
                    </p>
                )}
                {wasPriceSortReset() && (
                    <p class="search-page__notice" role="status">
                        Сортировка по цене сейчас недоступна — показываем сначала новые.
                    </p>
                )}
                <SearchFilterForm
                    query={query}
                    filters={this.props.filters}
                    priceSortEnabled={settings?.price_sort_enabled === true}
                />
                {state.status === 'loading' && (
                    <p role="status">Ищем объявления…</p>
                )}

                {state.status === 'error' && (
                    <div role="alert">
                        <p>Не удалось загрузить объявления.</p>
                        <Button variant="secondary" text="Попробовать ещё раз" onClick={this.load} />
                    </div>
                )}

                {state.status === 'too-long' && (
                    <p role="alert">
                        {maxQueryLength !== null
                            ? `Запрос слишком длинный — сократите его до ${maxQueryLength} символов.`
                            : 'Запрос слишком длинный — сократите его.'}
                    </p>
                )}

                {state.status === 'ready' && (
                    <>
                        {state.items.length > 0 ? (
                            <div class="search-page__grid">
                                {state.items.map(item => (
                                    <ProductCard
                                        key={item.id}
                                        {...item}
                                        href={`/listing/${item.id}`}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p>{getEmptyMessage(query, page, this.props.filters)}</p>
                        )}

                        {(page > 1 || page * pageSize < state.total) && (
                            <nav class="search-page__pages" aria-label="Страницы результатов">
                                {page > 1 && <a data-link href={this.pageUrl(page - 1)}>Назад</a>}
                                <span>Страница {page}</span>
                                {page * pageSize < state.total && (
                                    <a data-link href={this.pageUrl(page + 1)}>Далее</a>
                                )}
                            </nav>
                        )}
                    </>
                )}
            </section>
        );
    }
}
