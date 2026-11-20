import { Component, type Child, type VNode } from 'goget-vdom';
import type { AdCard, User } from '@/lib/api';
import { getListings } from '@/lib/api';
import type { Category, Promo } from '@/lib/catalog';
import { logWarn } from '@/lib/core';
import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card';
import { PromoCard } from '@/components/promo-card/promo-card';
import { ProductCard } from '@/components/product-card/product-card';
import { EmptyState } from '@/components/empty-state/empty-state';

export interface ScrollSectionProps {
    title: string;
    scrollerClass: string;
    scrollKey: string;
    children?: Child;
    onEnd?: () => void;
}

class ScrollSection extends Component<ScrollSectionProps, { canPrev: boolean; canNext: boolean }> {
    state = { canPrev: false, canNext: false };

    scroller: HTMLElement | null = null;
    resizeObserver?: ResizeObserver;

    componentDidMount() {
        this.updateArrows();

        if (typeof ResizeObserver !== 'undefined' && this.scroller) {
            this.resizeObserver = new ResizeObserver(this.updateArrows);
            this.resizeObserver.observe(this.scroller);
        } else {
            window.addEventListener('resize', this.updateArrows);
        }
    }

    componentDidUpdate() {
        this.updateArrows();
    }

    componentWillUnmount() {
        this.resizeObserver?.disconnect();
        window.removeEventListener('resize', this.updateArrows);
    }

    setScroller = (el: HTMLElement | null) => {
        this.scroller = el;
    };

    updateArrows = () => {
        const scroller = this.scroller;
        if (!scroller) return;

        const canPrev = scroller.scrollLeft > 0;
        const canNext = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
        if (canPrev !== this.state.canPrev || canNext !== this.state.canNext) {
            this.setState({ canPrev, canNext });
        }
        if (this.props.onEnd && scroller.scrollWidth > scroller.clientWidth
            && scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - scroller.clientWidth) {
            this.props.onEnd();
        }
    };

    scrollPage(direction: 1 | -1) {
        this.scroller?.scrollBy({ left: direction * this.scroller.clientWidth, behavior: 'smooth' });
    }

    render() {
        const { title, scrollerClass, scrollKey, children } = this.props;
        const { canPrev, canNext } = this.state;

        return (
            <section class="home-section">
                <div class="home-section__head">
                    <h2 class="home-section__title">{title}</h2>
                    <div class="home-section__arrows">
                        <button
                            type="button"
                            class="arrow arrow--prev"
                            aria-label="Назад"
                            disabled={!canPrev}
                            onClick={() => this.scrollPage(-1)}
                        ><img class="arrow__icon" src="/img/chevron.svg" alt="" /></button>
                        <button
                            type="button"
                            class="arrow arrow--next"
                            aria-label="Вперёд"
                            disabled={!canNext}
                            onClick={() => this.scrollPage(1)}
                        ><img class="arrow__icon" src="/img/chevron.svg" alt="" /></button>
                    </div>
                </div>
                <div class={scrollerClass} data-scroll-key={scrollKey} ref={this.setScroller} onScroll={this.updateArrows}>
                    {(children as VNode[]).map((item) => (
                        <div key={item.key} class="home-section__item">{item}</div>
                    ))}
                </div>
            </section>
        );
    }
}

export interface HomeData {
    categories: Category[];
    promos: Promo[];
    products: AdCard[];
    productsTotal?: number;
    nextCursor?: string | null;
    productsError?: boolean;
}

interface FeedState {
    items: AdCard[];
    total: number;
    cursor: string | null;
    loading: boolean;
    error: boolean;
    complete: boolean;
}

let feedCache: FeedState | null = null;

class ProductsSection extends Component<HomeData & { isGuest: boolean }, FeedState> {
    constructor(props: HomeData & { isGuest: boolean }) {
        super(props);
        const savedScroll = (history.state as { scrollers?: Record<string, number> } | null)?.scrollers?.products;
        if (savedScroll !== undefined && feedCache) {
            this.state = { ...feedCache, loading: false, error: false };
            return;
        }
        this.state = {
            items: props.products,
            total: props.productsTotal ?? props.products.length,
            cursor: props.nextCursor ?? null,
            loading: false,
            error: props.productsError ?? false,
            complete: !props.productsError && props.products.length >= (props.productsTotal ?? props.products.length),
        };
    }

    loadMore = async () => {
        const { items, cursor, complete, loading } = this.state;
        if (complete || loading) return;
        this.setState({ loading: true, error: false });
        try {
            const page = await getListings(cursor ? { cursor } : { offset: items.length });
            const seen = new Set(this.state.items.map((item) => item.id));
            const added = (page.items ?? []).filter((item) => !seen.has(item.id) && seen.add(item.id));
            const next = [...this.state.items, ...added];
            const nextCursor = page.next_cursor ?? null;
            const complete = next.length >= page.total || (page.items ?? []).length === 0
                || (added.length === 0 && nextCursor === cursor);
            const state = { items: next, total: page.total, cursor: nextCursor, loading: false, error: false, complete };
            feedCache = state;
            this.setState(state);
        } catch (err) {
            logWarn('Не удалось догрузить ленту:', err);
            this.setState({ loading: false, error: true });
        }
    };

    render() {
        const { items, loading, error, complete } = this.state;
        return (
            <div class="home-feed">
                <ScrollSection
                    title={this.props.isGuest ? 'Популярное сейчас' : 'Рекомендуем для вас'}
                    scrollerClass={items.length ? 'home-products' : 'home-products home-products--empty'}
                    scrollKey="products"
                    onEnd={this.loadMore}
                >
                    {items.length
                        ? items.map((product) => <ProductCard key={product.id} {...product} href={`/listing/${product.id}`} />)
                        : error
                            ? <EmptyState title="Не удалось загрузить объявления" text="Попробуйте ещё раз" />
                            : <EmptyState title="Товаров пока нет" text="Загляните позже — мы уже готовим новую подборку" />}
                </ScrollSection>
                <div class="home-feed-tail" aria-live="polite">
                    {loading && <span>Загружаем объявления…</span>}
                    {error && <button class="home-feed-tail__button" type="button" onClick={this.loadMore}>Не удалось загрузить. Повторить</button>}
                    {!loading && !error && !complete && <button class="home-feed-tail__button" type="button" onClick={this.loadMore}>Показать ещё</button>}
                    {!loading && !error && complete && items.length > 0 && <span>Все объявления просмотрены</span>}
                </div>
            </div>
        );
    }
}

export const HomePage = ({ categories, promos, products, productsTotal, nextCursor, productsError, user }: HomeData & { user: User | null }) => {
    const isGuest = user === null;

    return (
        <div class="home">
            <ScrollSection title="Выберите категорию" scrollerClass="home-categories" scrollKey="categories">
                {categories.length
                    ? categories.map((category) => <CategoryCard key={category.slug} {...category} />)
                    : <EmptyState title="Категории временно недоступны" text="Попробуйте обновить страницу позже" />}
            </ScrollSection>

            <section class="home-promo">
                {promos.map((promo) => <PromoCard key={promo.title} {...promo} />)}
            </section>

            {isGuest && (
                <section class="home-empty">
                    <EmptyState
                        title="Пока нет рекомендаций для вас"
                        text="Разместите первое объявление или загляните позже — мы подберём то, что вам может понравиться"
                        action={{ label: 'Разместить объявление', href: '/listing/new' }}
                    />
                </section>
            )}

            <ProductsSection categories={categories} promos={promos} products={products} productsTotal={productsTotal}
                nextCursor={nextCursor} productsError={productsError} isGuest={isGuest} />
        </div>
    );
};
