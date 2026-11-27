import { Component } from 'goget-vdom';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { Button } from '@/components/button/button';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ProductCard } from '@/components/product-card/product-card';
import { getCategoryTree, getListings, type AdCard, type CategoryNode, type Sort } from '@/lib/api';
import { logWarn, plural } from '@/lib/core';
import { appendListingPage } from '@/lib/listings';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page';
import './category-page.scss';

const pageSize = 18;

const sorts: Record<Sort, string> = {
    newest: 'Сначала новые',
    price_asc: 'Сначала дешевле',
    price_desc: 'Сначала дороже',
};

interface Feed {
    items: AdCard[];
    total: number | null;
    cursor: string | null;
    complete: boolean;
}

interface CategoryState extends Feed {
    path: CategoryNode[];
    category: 'loading' | 'error' | 'ready';
    loading: boolean;
    error: boolean;
    sort: Sort;
}

const emptyFeed: Feed = { items: [], total: null, cursor: null, complete: false };

function findPath(categories: CategoryNode[], slug: string): CategoryNode[] {
    for (const category of categories) {
        if (category.slug === slug) return [category];
        const path = findPath(category.children, slug);
        if (path.length) return [category, ...path];
    }
    return [];
}

function categoryHref(slug: string) {
    return `/category/${encodeURIComponent(slug)}`;
}

export class CategoryPage extends Component<{ slug: string }, CategoryState> {
    state: CategoryState = {
        ...emptyFeed, path: [], category: 'loading', loading: false, error: false, sort: 'newest',
    };

    private requestVersion = 0;

    componentDidMount() {
        void this.loadCategory();
    }

    componentWillUnmount() {
        this.requestVersion++;
    }

    loadCategory = async () => {
        const version = ++this.requestVersion;
        this.setState({ category: 'loading' });

        try {
            const tree = await getCategoryTree();
            if (version !== this.requestVersion) return;
            this.setState({ path: findPath(tree, this.props.slug), category: 'ready' });
            await this.loadMore();
        } catch (err) {
            if (version !== this.requestVersion) return;
            logWarn('Не удалось загрузить категории:', err);
            this.setState({ category: 'error' });
        }
    };

    loadMore = async () => {
        const { path, items, cursor, complete, loading, sort } = this.state;
        const current = path[path.length - 1];
        if (!current || complete || loading) return;

        const version = ++this.requestVersion;
        this.setState({ loading: true, error: false });

        try {
            const page = await getListings({
                category_id: current.id,
                limit: pageSize,
                sort,
                ...(cursor ? { cursor } : { offset: items.length }),
            });
            if (version !== this.requestVersion) return;
            this.setState({ ...appendListingPage(items, cursor, page), loading: false });
        } catch (err) {
            if (version !== this.requestVersion) return;
            logWarn('Не удалось загрузить объявления категории:', err);
            this.setState({ loading: false, error: true });
        }
    };

    changeSort = (event: Event) => {
        const sort = (event.target as HTMLSelectElement).value as Sort;
        if (sort === this.state.sort) return;
        this.setState({ ...emptyFeed, sort, loading: false, error: false });
        void this.loadMore();
    };

    render() {
        const { category, path, items, total, complete, loading, error, sort } = this.state;
        const current = path[path.length - 1];

        if (category === 'ready' && !current) return <NotFoundPage />;

        return (
            <div class="category-page">
                <Breadcrumbs flush strong items={[
                    { label: 'Главная', href: '/' },
                    { label: 'Все категории', href: '/categories' },
                    ...path.map((node) => ({
                        label: node.name,
                        href: node === current ? undefined : categoryHref(node.slug),
                    })),
                ]} />

                {category === 'loading' && <p role="status">Загружаем категорию…</p>}
                {category === 'error' && (
                    <div class="category-page__tail" role="status">
                        <span>Не удалось загрузить категорию.</span>
                        <Button text="Повторить" onClick={this.loadCategory} />
                    </div>
                )}

                {current && (
                    <section class="category-page__section" aria-labelledby="category-title">
                        <header class="category-page__head">
                            <h1 id="category-title" class="category-page__title">{current.name}</h1>
                            {total !== null && (
                                <p class="category-page__count">
                                    {`${total} ${plural(total, ['объявление', 'объявления', 'объявлений'])}`}
                                </p>
                            )}
                        </header>

                        {current.children.length > 0 && (
                            <div class="category-page__toolbar">
                                <nav class="category-page__subcategories" aria-label="Подкатегории">
                                    <a class="category-page__subcategory" href={categoryHref(current.slug)}
                                        aria-current="page" data-link>Все объявления</a>
                                    {current.children.map(({ slug, name }) => (
                                        <a key={slug} class="category-page__subcategory"
                                            href={categoryHref(slug)} data-link>{name}</a>
                                    ))}
                                </nav>
                                <select class="category-page__sort" aria-label="Сортировка"
                                    value={sort} onChange={this.changeSort}>
                                    {Object.entries(sorts).map(([value, name]) => (
                                        <option key={value} value={value}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {items.length > 0 && (
                            <div class={current.children.length
                                ? 'category-page__grid'
                                : 'category-page__grid category-page__grid--leaf'}>
                                {items.map((item) => (
                                    <ProductCard key={item.id} {...item} href={`/listing/${item.id}`} />
                                ))}
                            </div>
                        )}

                        {complete && items.length === 0 && (
                            <EmptyState title="Здесь пока нет объявлений" text="Попробуйте другую категорию." />
                        )}

                        {(loading || error || (!complete && items.length > 0)) && (
                            <div class="category-page__tail" aria-live="polite">
                                {loading && <span>Загружаем объявления…</span>}
                                {error && (
                                    <>
                                        <span>Не удалось загрузить объявления.</span>
                                        <Button text="Повторить" onClick={this.loadMore} />
                                    </>
                                )}
                                {!loading && !error && (
                                    <Button text="Показать ещё объявления" onClick={this.loadMore} />
                                )}
                            </div>
                        )}
                    </section>
                )}
            </div>
        );
    }
}
