import template from './home-page.hbs';
import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card.js';
import { PromoCard } from '@/components/promo-card/promo-card.js';
import { ProductCard } from '@/components/product-card/product-card.js';
import { EmptyState } from '@/components/empty-state/empty-state.js';
import { getCategories, getPromos, getProducts } from '@/lib/api.js';

export const HomePage = async (root) => {
    const [categories, promos, products] = await Promise.all([
        getCategories(),
        getPromos(),
        getProducts(),
    ]);

    const categoriesHtml = categories.length
        ? categories.slice(0, 4).map(CategoryCard).join('')
        : EmptyState({
            title: 'Категории временно недоступны',
            text: 'Попробуйте обновить страницу позже',
        });

    const promosHtml = promos.length ? promos.map(PromoCard).join('') : '';

    const productsHtml = products.length
        ? products.map(ProductCard).join('')
        : EmptyState({
            title: 'Товаров пока нет',
            text: 'Загляните позже — мы уже готовим новую подборку',
        });

    const emptyStateHtml = EmptyState({
        title: 'Пока нет рекомендаций для вас',
        text: 'Разместите первое объявление или загляните позже —<br>мы подберём то, что вам может понравиться',
        action: { href: '/create', label: 'Разместить объявление' },
    });

    root.innerHTML = template({
        categoriesHtml,
        promosHtml,
        productsHtml,
        productsEmpty: products.length === 0,
        emptyStateHtml,
    });

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
