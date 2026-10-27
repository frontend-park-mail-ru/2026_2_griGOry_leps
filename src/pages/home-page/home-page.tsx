import { Component, type Child, type VNode } from '@/vdom';
import type { AdCard, User } from '@/lib/api';
import type { Category, Promo } from '@/lib/data';
import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card';
import { PromoCard } from '@/components/promo-card/promo-card';
import { ProductCard } from '@/components/product-card/product-card';
import { EmptyState } from '@/components/empty-state/empty-state';

export interface ScrollSectionProps {
    title: string;
    scrollerClass: string;
    children?: Child;
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
    };

    scrollPage(direction: 1 | -1) {
        this.scroller?.scrollBy({ left: direction * this.scroller.clientWidth, behavior: 'smooth' });
    }

    render() {
        const { title, scrollerClass, children } = this.props;
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
                <div class={scrollerClass} ref={this.setScroller} onScroll={this.updateArrows}>
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
}

export const HomePage = ({ categories, promos, products, user }: HomeData & { user: User | null }) => {
    const isGuest = user === null;

    return (
        <div class="home">
            <ScrollSection title="Выберите категорию" scrollerClass="home-categories">
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
                        action={{ label: 'Разместить объявление', disabled: true }}
                    />
                </section>
            )}

            <ScrollSection
                title={isGuest ? 'Популярное сейчас' : 'Рекомендуем для вас'}
                scrollerClass={products.length ? 'home-products' : 'home-products home-products--empty'}
            >
                {products.length
                    ? products.map((product) => (
                        <ProductCard key={product.id} {...product} href={`/listing/${product.id}`} />
                    ))
                    : <EmptyState title="Товаров пока нет" text="Загляните позже — мы уже готовим новую подборку" />}
            </ScrollSection>
        </div>
    );
};
