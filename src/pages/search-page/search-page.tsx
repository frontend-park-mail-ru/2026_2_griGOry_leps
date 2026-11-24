import { Component } from 'goget-vdom';
import { ProductCard } from '@/components/product-card/product-card';
import { searchListings, type AdCard, type SearchFilters } from '@/lib/api';
import './search-page.scss';
import { SearchFilterForm } from './search-filter-form';

interface SearchPageProps {
    query: string;
    page: number;
    filters: SearchFilters;
}

type SearchPageState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; items: AdCard[]; total: number };

const pageSize = 24;
function getEmptyMessage(query: string, page: number, filters: SearchFilters): string {
    if (page > 1) return 'На этой странице объявлений нет.';
    if (Object.keys(filters).length > 0) {
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

    for (const name of ['city', 'price_min', 'price_max'] as const) {
        const value = params.get(name)?.trim();
        if (value) filters[name] = value;
    }

    const delivery = params.get('has_delivery');
    if (delivery === 'true' || delivery === 'false') {
        filters.has_delivery = delivery === 'true';
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
            key={params.toString()}
            query={query}
            page={page}
            filters={readSearchFilters(params)}
        />
    );
}

class SearchResults extends Component<SearchPageProps, SearchPageState> {
    state: SearchPageState = { status: 'loading' };

    private requestId = 0;

    componentDidMount() {
        void this.load();
    }

    componentWillUnmount() {
        this.requestId++;
    }

    load = async () => {
        const id = ++this.requestId;
        const { query, page } = this.props;
        this.setState({ status: 'loading' });

        try {
            const result = await searchListings(
                query,
                pageSize,
                (page - 1) * pageSize,
                this.props.filters,
            );
            if (id === this.requestId) {
                this.setState({ status: 'ready', items: result.items, total: result.total });
            }
        } catch {
            if (id === this.requestId) {
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
        const { query, page } = this.props;
        const state = this.state;

        return (
            <section class="search-page">
                <h1 class="search-page__title">
                    {query ? `Результаты поиска по запросу «${query}»` : 'Все объявления'}
                </h1>
                <SearchFilterForm query={query} filters={this.props.filters} />
                {state.status === 'loading' && (
                    <p role="status">Ищем объявления…</p>
                )}

                {state.status === 'error' && (
                    <div role="alert">
                        <p>Не удалось загрузить объявления.</p>
                        <button type="button" onClick={this.load}>Попробовать ещё раз</button>
                    </div>
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
