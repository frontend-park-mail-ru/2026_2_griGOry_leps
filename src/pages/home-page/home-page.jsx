import { Component } from '@/vdom/index.js';
import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card.jsx';
import { PromoCard } from '@/components/promo-card/promo-card.jsx';
import { ProductCard } from '@/components/product-card/product-card.jsx';
import { EmptyState } from '@/components/empty-state/empty-state.jsx';

/**
 * Секция с горизонтальной прокруткой и стрелками «назад/вперёд».
 * Стрелка выключается, когда листать в её сторону больше некуда.
 * @property {Object} props
 * @property {string} props.title
 * @property {string} props.scrollerClass Класс прокручиваемого блока
 * @property {*} props.children
 */
class ScrollSection extends Component {
    state = { canPrev: false, canNext: false };

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

    setScroller = (el) => {
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

    scrollPage(direction) {
        this.scroller?.scrollBy({ left: direction * this.scroller.clientWidth, behavior: 'smooth' });
    }

    render() {
        const { title, scrollerClass, children } = this.props;
        const { canPrev, canNext } = this.state;

        return (
            <section class="home-section">
                <div class="home-section__head">
                    <h2>{title}</h2>
                    <div class="home-section__arrows">
                        <button
                            type="button"
                            class="arrow arrow--prev"
                            aria-label="Назад"
                            disabled={!canPrev}
                            onClick={() => this.scrollPage(-1)}
                        ><img src="/img/chevron.svg" alt="" /></button>
                        <button
                            type="button"
                            class="arrow arrow--next"
                            aria-label="Вперёд"
                            disabled={!canNext}
                            onClick={() => this.scrollPage(1)}
                        ><img src="/img/chevron.svg" alt="" /></button>
                    </div>
                </div>
                <div class={scrollerClass} ref={this.setScroller} onScroll={this.updateArrows}>
                    {children}
                </div>
            </section>
        );
    }
}

/**
 * Главная: категории, промо, пустое состояние для гостя и лента объявлений.
 * @param {Object} props
 * @param {Array<Object>} props.categories
 * @param {Array<Object>} props.promos
 * @param {Array<Object>} props.products
 * @param {(module:api~User|null)} props.user
 */
export const HomePage = ({ categories, promos, products, user }) => {
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
                    ? products.map((product) => <ProductCard key={product.id} {...product} />)
                    : <EmptyState title="Товаров пока нет" text="Загляните позже — мы уже готовим новую подборку" />}
            </ScrollSection>
        </div>
    );
};
