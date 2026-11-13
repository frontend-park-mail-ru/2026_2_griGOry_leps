import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'goget-vdom';
import type { AdCard } from '@/lib/api';
import { HomePage } from './home-page';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

afterEach(() => vi.unstubAllGlobals());

const product = (id: number): AdCard => ({
    id, title: 'Велосипед', price: '15000.00', image_url: null, city: 'Москва', has_delivery: false, created_at: '2026-11-01T10:00:00Z',
});

const categories = [
    { slug: 'auto', name: 'Авто', image: '/img/categories/auto.jpg', subcategories: [] },
    { slug: 'pets', name: 'Животные', image: '/img/categories/pets.jpg', subcategories: [] },
];

describe('HomePage', () => {
    it('оборачивает каждую карточку карусели в элемент home-section__item', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[]} user={null} />);

        expect(root.querySelectorAll('.home-categories > .home-section__item > .category-card')).toHaveLength(2);
        expect(root.querySelectorAll('.home-products--empty > .home-section__item > .empty-state')).toHaveLength(1);
    });

    it('размечает заголовки секций и иконки стрелок элементами блоков', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[]} user={null} />);

        expect(root.querySelector('.home-section__title')?.textContent).toBe('Выберите категорию');
        expect(root.querySelectorAll('.arrow__icon')).toHaveLength(4);
    });

    it('ведёт каждую карточку ленты на страницу объявления', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[product(7), product(9)]} user={null} />);

        const hrefs = [...root.querySelectorAll('.home-products a[data-link]')].map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual(['/listing/7', '/listing/9']);
    });

    it('помечает карусели ключами прокрутки', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[product(7)]} user={null} />);

        expect(root.querySelector<HTMLElement>('.home-categories')?.dataset.scrollKey).toBe('categories');
        expect(root.querySelector<HTMLElement>('.home-products')?.dataset.scrollKey).toBe('products');
    });

    it('подгружает следующую страницу и после последней карточки возвращается к первой', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            items: [product(3), product(4)], total: 4, limit: 24, offset: 2,
        }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callback(0));
        render(root, <HomePage categories={categories} promos={[]} products={[product(1), product(2)]}
            productsTotal={4} user={null} />);

        const scroller = root.querySelector<HTMLElement>('.home-products')!;
        Object.defineProperty(scroller, 'clientWidth', { value: 240 });
        Object.defineProperty(scroller, 'scrollWidth', {
            get: () => scroller.querySelectorAll('.home-section__item').length * 240,
        });
        const scrollBy = vi.fn();
        const scrollTo = vi.fn();
        scroller.scrollBy = scrollBy;
        scroller.scrollTo = scrollTo;
        scroller.scrollLeft = 240;
        scroller.dispatchEvent(new Event('scroll'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        root.querySelector<HTMLButtonElement>('.home-section:last-child .arrow--next')!.click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('offset=2'), expect.anything());
        expect(root.querySelectorAll('.home-products .product-card')).toHaveLength(4);
        expect(scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });

        scroller.scrollLeft = 720;
        root.querySelector<HTMLButtonElement>('.home-section:last-child .arrow--next')!.click();
        expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
