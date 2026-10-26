import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import type { AdCard } from '@/lib/api';
import { ProductCard } from './product-card';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

const ad: AdCard = {
    id: 1, title: 'Диван', price: '0.00', is_free: true,
    image_url: null, city: 'Москва', has_delivery: false, created_at: '2026-10-01T10:00:00Z',
};

describe('ProductCard', () => {
    it('у бесплатного объявления пишет «Даром»', () => {
        render(root, <ProductCard {...ad} />);
        expect(root.querySelector('.product-card__price')?.textContent).toBe('Даром');
    });

    it('у платного — цену в рублях', () => {
        render(root, <ProductCard {...ad} is_free={false} price="15000.00" />);
        expect(root.querySelector('.product-card__price')?.textContent?.replace(/\s/g, ' ')).toBe('15 000 ₽');
    });

    it('со ссылкой делает название ссылкой, а избранное оставляет вне неё', () => {
        render(root, <ProductCard {...ad} href="/listing/1" />);
        expect(root.querySelector('.product-card__link')?.getAttribute('href')).toBe('/listing/1');
        expect(root.querySelector('a .product-card__favorite')).toBeNull();
        expect(root.querySelector('.product-card__rating')).toBeNull();
    });

    it('показывает рейтинг продавца, если он передан', () => {
        render(root, <ProductCard {...ad} rating={4.8} />);
        expect(root.querySelector('.product-card__rating')?.textContent).toBe('4,8');
        expect(root.querySelector('.product-card__link')).toBeNull();
    });
});
