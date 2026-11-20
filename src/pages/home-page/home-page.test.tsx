import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'goget-vdom';
import type { AdCard } from '@/lib/api';
import { HomePage } from './home-page';

const api = vi.hoisted(() => ({ getListings: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

beforeEach(() => {
    vi.clearAllMocks();
    history.replaceState({}, '', '/');
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

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

    it('догружает страницу по курсору без повторных карточек', async () => {
        api.getListings.mockResolvedValue({
            items: [product(2), product(3)], total: 3, limit: 24, offset: 0,
        });
        render(root, <HomePage categories={categories} promos={[]} products={[product(1), product(2)]}
            productsTotal={3} nextCursor="cursor-1" user={null} />);

        root.querySelector<HTMLButtonElement>('.home-feed-tail button')!.click();
        await tick();

        expect(api.getListings).toHaveBeenCalledWith({ cursor: 'cursor-1' });
        expect([...root.querySelectorAll('.home-products a[data-link]')].map((a) => a.getAttribute('href')))
            .toEqual(['/listing/1', '/listing/2', '/listing/3']);
        expect(root.querySelector('.home-feed-tail')?.textContent).toContain('Все объявления просмотрены');

        render(root, <div />);
        history.replaceState({ scrollers: { products: 500 } }, '', '/');
        render(root, <HomePage categories={categories} promos={[]} products={[product(1)]}
            productsTotal={3} nextCursor="cursor-1" user={null} />);
        expect(root.querySelectorAll('.home-products a[data-link]')).toHaveLength(3);
    });

    it('догружает объявления при прокрутке к концу карусели', async () => {
        api.getListings.mockResolvedValue({ items: [product(2)], total: 2, limit: 24, offset: 0 });
        render(root, <HomePage categories={categories} promos={[]} products={[product(1)]}
            productsTotal={2} nextCursor="cursor-1" user={null} />);
        const scroller = root.querySelector<HTMLElement>('.home-products')!;
        Object.defineProperties(scroller, {
            scrollWidth: { value: 600 },
            clientWidth: { value: 200 },
            scrollLeft: { value: 250, writable: true },
        });
        scroller.dispatchEvent(new Event('scroll'));
        await tick();

        expect(api.getListings).toHaveBeenCalledWith({ cursor: 'cursor-1' });
        expect(root.querySelectorAll('.home-products a[data-link]')).toHaveLength(2);
    });

    it('показывает ошибку догрузки и повторяет запрос', async () => {
        api.getListings.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
            items: [product(2)], total: 2, limit: 24, offset: 0,
        });
        render(root, <HomePage categories={categories} promos={[]} products={[product(1)]}
            productsTotal={2} nextCursor="cursor-1" user={null} />);

        root.querySelector<HTMLButtonElement>('.home-feed-tail button')!.click();
        await tick();
        expect(root.querySelector('.home-feed-tail')?.textContent).toContain('Повторить');
        root.querySelector<HTMLButtonElement>('.home-feed-tail button')!.click();
        await tick();
        expect(root.querySelectorAll('.home-products a[data-link]')).toHaveLength(2);
        expect(api.getListings).toHaveBeenCalledTimes(2);
    });
});
