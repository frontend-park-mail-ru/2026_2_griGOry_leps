import template from './home-page.hbs';
import './home-page.scss';

import { CategoryCard } from '@/components/category-card/category-card.js';
import { PromoCard } from '@/components/promo-card/promo-card.js';
import { ProductCard } from '@/components/product-card/product-card.js';
import { EmptyState } from '@/components/empty-state/empty-state.js';
import { getCategories, getPromos, getProducts } from '@/lib/api.js';
import { getUser } from '@/store.js';

export const HomePage = async (root) => {
    const [categories, promos, products] = await Promise.all([
        getCategories(),
        getPromos(),
        getProducts(),
    ]);

    const categoriesHtml = categories.length
        ? categories.map(CategoryCard).join('')
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

    const isGuest = getUser() === null;

    const emptyStateHtml = isGuest
        ? EmptyState({
            title: 'Пока нет рекомендаций для вас',
            text: 'Разместите первое объявление или загляните позже — мы подберём то, что вам может понравиться',
            action: { label: 'Разместить объявление', disabled: true },
        })
        : '';

    root.innerHTML = template({
        categoriesHtml,
        promosHtml,
        productsHtml,
        productsEmpty: products.length === 0,
        productsTitle: isGuest ? 'Популярное сейчас' : 'Рекомендуем для вас',
        emptyStateHtml,
    });

    bindScrollers(root);
};

function bindScrollers(root) {
    root.querySelectorAll('.home-section__head').forEach((head) => {
        const section = head.closest('.home-section');
        const scroller = section?.querySelector('[data-scroller]');
        const prev = head.querySelector('.arrow--prev');
        const next = head.querySelector('.arrow--next');
        if (!scroller || !prev || !next) return;

        const updateArrows = () => {
            prev.disabled = scroller.scrollLeft <= 0;
            next.disabled = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
        };

        prev.addEventListener('click', () => {
            scroller.scrollBy({ left: -scroller.clientWidth, behavior: 'smooth' });
        });

        next.addEventListener('click', () => {
            scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
        });

        scroller.addEventListener('scroll', updateArrows);
        updateArrows();
    });
}
