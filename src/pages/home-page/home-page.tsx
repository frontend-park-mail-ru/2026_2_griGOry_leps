import { Component, type Child, type VNode } from 'goget-vdom';
import { getListings, type AdCard, type User } from '@/lib/api';
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
    loop?: boolean;
    itemsCount?: number;
    hasMore?: boolean;
    onLoadMore?: () => Promise<boolean>;
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

        const loop = this.props.loop && (this.props.itemsCount ?? 0) > 1
            && scroller.scrollWidth > scroller.clientWidth + 1;
        const canPrev = loop || scroller.scrollLeft > 0;
        const canNext = loop || Boolean(this.props.hasMore)
            || scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
        if (canPrev !== this.state.canPrev || canNext !== this.state.canNext) {
            this.setState({ canPrev, canNext });
        }
    };

    async scrollPage(direction: 1 | -1) {
        const scroller = this.scroller;
        if (!scroller) return;

        if (direction === -1 && this.props.loop && scroller.scrollLeft <= 1) {
            scroller.scrollTo({ left: scroller.scrollWidth - scroller.clientWidth, behavior: 'smooth' });
            return;
        }

        if (direction === 1 && this.props.loop
            && scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1) {
            if (this.props.hasMore && this.props.onLoadMore) {
                try {
                    const added = await this.props.onLoadMore();
                    if (added) {
                        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                        scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
                        return;
                    }
                } catch {
                    return;
                }
            }
            scroller.scrollTo({ left: 0, behavior: 'smooth' });
            return;
        }

        scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' });
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
}

interface HomePageState {
    products: AdCard[];
    total: number;
    nextOffset: number;
    loadError: string;
}

export class HomePage extends Component<HomeData & { user: User | null }, HomePageState> {
    state: HomePageState = {
        products: this.props.products,
        total: this.props.productsTotal ?? this.props.products.length,
        nextOffset: this.props.products.length,
        loadError: '',
    };

    private loadingMore: Promise<boolean> | null = null;

    loadMore = (): Promise<boolean> => {
        if (this.loadingMore) return this.loadingMore;
        this.loadingMore = this.fetchMore().finally(() => { this.loadingMore = null; });
        return this.loadingMore;
    };

    async fetchMore(): Promise<boolean> {
        if (this.state.nextOffset >= this.state.total) return false;
        try {
            const page = await getListings({ limit: 24, offset: this.state.nextOffset });
            const ids = new Set(this.state.products.map(({ id }) => id));
            const fresh = page.items.filter(({ id }) => !ids.has(id));
            this.setState(({ products }) => ({
                products: [...products, ...fresh],
                total: page.total,
                nextOffset: page.offset + page.items.length,
                loadError: '',
            }));
            return fresh.length > 0;
        } catch (err) {
            logWarn('Не удалось загрузить следующую страницу объявлений:', err);
            this.setState({ loadError: 'Не удалось загрузить объявления. Нажмите стрелку ещё раз' });
            throw err;
        }
    }

    render() {
        const { categories, promos, user } = this.props;
        const { products, total, nextOffset, loadError } = this.state;
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

                <ScrollSection
                    title={isGuest ? 'Популярное сейчас' : 'Рекомендуем для вас'}
                    scrollerClass={products.length ? 'home-products' : 'home-products home-products--empty'}
                    scrollKey="products"
                    loop={products.length > 0}
                    itemsCount={products.length}
                    hasMore={nextOffset < total}
                    onLoadMore={this.loadMore}
                >
                    {products.length
                        ? products.map((product) => (
                            <ProductCard key={product.id} {...product} href={`/listing/${product.id}`} />
                        ))
                        : <EmptyState title="Товаров пока нет" text="Загляните позже — мы уже готовим новую подборку" />}
                </ScrollSection>
                {loadError && <p class="home__load-error" role="alert">{loadError}</p>}
            </div>
        );
    }
}
