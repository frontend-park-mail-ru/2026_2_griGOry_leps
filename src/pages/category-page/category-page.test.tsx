import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { CategoryCardFull } from '@/components/category-card-full/category-card-full';
import type { AdCard, AdPage, CategoryNode } from '@/lib/api';
import { CategoryPage } from './category-page';

const api = vi.hoisted(() => ({ getCategoryTree: vi.fn(), getListings: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const bikes: CategoryNode = { id: 25, slug: 'sport-bikes', name: 'Велосипеды', delivery_allowed: true, children: [] };
const sport: CategoryNode = { id: 14, slug: 'sport', name: 'Спорт и отдых', delivery_allowed: true, children: [bikes] };

const ad = (id: number): AdCard => ({
    id, title: `Объявление ${id}`, city: 'Москва', price: '500.00',
    image_url: null, has_delivery: false, created_at: '2026-11-01T10:00:00Z',
});
const page = (ids: number[], total = ids.length, cursor?: string): AdPage => ({
    items: ids.map(ad), total, limit: 18, offset: 0, next_cursor: cursor,
});

let root: HTMLElement;

beforeEach(() => {
    vi.resetAllMocks();
    api.getCategoryTree.mockResolvedValue([sport]);
    root = document.createElement('div');
    document.body.replaceChildren(root);
});

const listings = () => [...root.querySelectorAll('.product-card')].map((card) => card.getAttribute('data-ad-id'));
const tailButton = () => root.querySelector<HTMLButtonElement>('.category-page__tail button')!;

describe('CategoryPage', () => {
    it('открывает подкатегорию по slug и ссылается на родительскую категорию', async () => {
        api.getListings.mockResolvedValue(page([2]));
        render(root, <CategoryPage slug={bikes.slug} />);

        await vi.waitFor(() => expect(listings()).toEqual(['2']));
        expect(api.getListings).toHaveBeenCalledWith(expect.objectContaining({ category_id: bikes.id }));
        expect(root.querySelector('.breadcrumbs a[href="/category/sport"]')?.textContent).toBe(sport.name);
        expect(root.querySelector('h1')?.textContent).toBe(bikes.name);
    });

    it('показывает ошибку подгрузки и повторяет запрос с тем же курсором и категорией', async () => {
        api.getListings.mockResolvedValueOnce(page([1], 2, 'next'))
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(page([1, 3], 2));
        render(root, <CategoryPage slug={sport.slug} />);
        await vi.waitFor(() => expect(listings()).toEqual(['1']));
        expect(root.querySelector('.category-page__subcategories a[href="/category/sport-bikes"]')).not.toBeNull();

        tailButton().click();
        await vi.waitFor(() => expect(tailButton().textContent).toBe('Повторить'));
        expect(listings()).toEqual(['1']);
        tailButton().click();

        await vi.waitFor(() => expect(listings()).toEqual(['1', '3']));
        expect(api.getListings).toHaveBeenNthCalledWith(3, expect.objectContaining({ category_id: sport.id, cursor: 'next' }));
        expect(tailButton()).toBeNull();
    });

    it('показывает пустое состояние и ссылается на подкатегорию из каталога', async () => {
        render(root, <CategoryCardFull slug={sport.slug} name={sport.name} subcategories={[bikes]} />);
        expect(root.querySelector('.category-card-full__link')?.getAttribute('href')).toBe('/category/sport-bikes');

        api.getListings.mockResolvedValue(page([]));
        render(root, <CategoryPage slug={bikes.slug} />);
        await vi.waitFor(() => expect(root.textContent).toContain('Здесь пока нет объявлений'));
        expect(listings()).toEqual([]);
    });
});
