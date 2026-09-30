import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card.js';
import { PromoCard } from '@/components/promo-card/promo-card.js';
import { ProductCard } from '@/components/product-card/product-card.js';
import { EmptyState } from '@/components/empty-state/empty-state.js';
import { api } from '@/lib/api.js';

export const HomePage = async (root) => {
    root.innerHTML = '<div class="home"><p style="padding: 2rem 32px;">Загрузка…</p></div>';

    const [categories, promos, products] = await Promise.all([
        api.categories().catch(() => [
        { slug: 'auto',   name: 'Авто',                  image: '/src/img/cat-auto.jpg' },
        { slug: 'realty', name: 'Недвижимость',          image: '/src/img/cat-realty.jpg' },
        { slug: 'rent',   name: 'Жильё для путешествий', image: '/src/img/cat-rent.jpg' },
        { slug: 'home',   name: 'Для дома и дачи',       image: '/src/img/cat-home.jpg' },
    ]),

    api.promos().catch(() => [
        { title: 'Идём в школу',      subtitle: 'рюкзаки, канцтовары',        image: '/src/img/promo-school.jpg', link: '/promo/school' },
        { title: 'Подарок за визит',  subtitle: 'заберите в течение суток',   image: '/src/img/promo-gift.jpg',   link: '/promo/gift' },
        { title: 'Сезон велосипедов', subtitle: 'подборка для города и гор', image: '/src/img/promo-bike.jpg',   link: '/promo/bike' },
    ]),

    api.products().catch(() => [
        { title: 'Велосипед горный',           price: '15 000', image: '/src/img/p1.jpg', rating: '4,9', reviews: 296, delivery: false },
        { title: 'Велосипед шоссейный, б/у',   price: '45 000', image: '/src/img/p2.jpg', rating: '4,7', reviews: 143, delivery: false },
        { title: 'Рюкзак школьный',            price: '3 200',  image: '/src/img/p3.jpg', rating: '4,4', reviews: 97,  delivery: true },
        { title: 'Диван раскладной, доставка', price: '48 000', image: '/src/img/p4.jpg', rating: '4,6', reviews: 412, delivery: true },
        { title: 'Комплект книг для 5 класса', price: '1 500',  image: '/src/img/p5.jpg', rating: '5,0', reviews: 58,  delivery: true },
        { title: 'Ноутбук игровой, гарантия',  price: '62 000', image: '/src/img/p6.jpg', rating: '4,8', reviews: 530, delivery: true },
    ]),
    ]);

    const categoriesHtml = categories.slice(0, 4).map(CategoryCard).join('');
    const promosHtml = promos.map(PromoCard).join('');
    const productsHtml = products.map(ProductCard).join('');

    const emptyStateHtml = EmptyState({
        title: 'Пока нет рекомендаций для вас',
        text: 'Разместите первое объявление или загляните позже —<br>мы подберём то, что вам может понравиться',
        action: { href: '/create', label: 'Разместить объявление' },
    });

    root.innerHTML = `
        <div class="home">

            <section class="home-section">
                <div class="home-section__head">
                    <h2>Выберите категорию</h2>
                    <div class="home-section__arrows">
                        <button class="arrow arrow--prev" aria-label="Назад">‹</button>
                        <button class="arrow arrow--next" aria-label="Вперёд">›</button>
                    </div>
                </div>
                <div class="home-categories" data-scroller>${categoriesHtml}</div>
            </section>

            <section class="home-promo">${promosHtml}</section>

            <section class="home-section">${emptyStateHtml}</section>

            <section class="home-section">
                <div class="home-section__head">
                    <h2>Популярное сейчас</h2>
                    <div class="home-section__arrows">
                        <button class="arrow arrow--prev" aria-label="Назад">‹</button>
                        <button class="arrow arrow--next" aria-label="Вперёд">›</button>
                    </div>
                </div>
                <div class="home-products" data-scroller>${productsHtml}</div>
            </section>

        </div>
    `;
    bindScrollers(root);
};

function bindScrollers(root) {
    root.querySelectorAll('.home-section__head').forEach((head) => {
        const section = head.closest('.home-section');
        const scroller = section?.querySelector('[data-scroller]');
        if (!scroller) return;

        const prev = head.querySelector('.arrow--prev');
        const next = head.querySelector('.arrow--next');

        prev?.addEventListener('click', () => {
            scroller.scrollBy({ left: -scroller.clientWidth, behavior: 'smooth' });
        });

        next?.addEventListener('click', () => {
            scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
        });
    });
}