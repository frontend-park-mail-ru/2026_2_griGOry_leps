import { beforeEach, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { searchListings } from '@/lib/api';
import { SearchPage } from './search-page';

vi.mock('@/lib/api', async (importOriginal) => {
    const api = await importOriginal<typeof import('@/lib/api')>();
    return {
        ...api,
        searchListings: vi.fn(),
        getCategoryTree: vi.fn().mockResolvedValue([]),
    };
});

const search = vi.mocked(searchListings);
let root: HTMLElement;

beforeEach(() => {
    search.mockReset();
    root = document.createElement('div');
});

it('показывает загрузку, затем карточку со ссылкой на объявление', async () => {
    search.mockResolvedValueOnce({
        items: [{
            id: 7,
            title: 'Горный велосипед',
            price: '15000.00',
            image_url: null,
            city: 'Москва',
            has_delivery: false,
            created_at: '2026-11-01T10:00:00Z',
        }],
        total: 1,
        limit: 24,
        offset: 0,
    });

    history.replaceState(null, '', '/search?q=горный+велосипед');
    render(root, <SearchPage />);

    expect(root.querySelector('h1')?.textContent).toBe('«горный велосипед»');
    expect(root.querySelector('[role="status"]')?.textContent)
        .toContain('Ищем объявления');

    await vi.waitFor(() => {
        expect(root.querySelector('a[href="/listing/7"]')).not.toBeNull();
    });

    expect(root.textContent).toContain('Горный велосипед');
    expect(search).toHaveBeenCalledWith({
        q: 'горный велосипед',
        limit: 24,
        offset: 0,
        filters: {},
    });
});

it('показывает сообщение, когда совпадений нет', async () => {
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });

    history.replaceState(null, '', '/search?q=несуществующий+товар');
    render(root, <SearchPage />);

    await vi.waitFor(() => {
        expect(root.textContent).toContain('Ничего не найдено');
    });

    expect(root.querySelector('[role="alert"]')).toBeNull();
});

it('после ошибки позволяет повторить запрос', async () => {
    search.mockRejectedValueOnce(new Error('Ошибка сети'));
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });

    history.replaceState(null, '', '/search?q=велосипед');
    render(root, <SearchPage />);

    await vi.waitFor(() => {
        expect(root.querySelector('[role="alert"]')?.textContent)
            .toContain('Не удалось загрузить объявления');
    });

    root.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();

    await vi.waitFor(() => {
        expect(root.textContent).toContain('Ничего не найдено');
    });

    expect(search).toHaveBeenCalledTimes(2);
});

it('передаёт фильтры в API и сохраняет их в ссылках между страницами', async () => {
    const params = new URLSearchParams({
        q: 'велосипед',
        category_id: '14',
        city: 'Москва',
        price_min: '5000',
        price_max: '20000',
        has_delivery: 'true',
        page: '2',
    });

    history.replaceState(null, '', `/search?${params}`);
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 24 });

    render(root, <SearchPage />);

    await vi.waitFor(() => {
        expect(root.querySelector('.search-page__pages a')).not.toBeNull();
    });

    expect(search).toHaveBeenCalledWith({
        q: 'велосипед',
        limit: 24,
        offset: 24,
        filters: {
            category_id: 14,
            city: 'Москва',
            price_min: '5000',
            price_max: '20000',
            has_delivery: true,
        },
    });

    const previous = root.querySelector<HTMLAnchorElement>('.search-page__pages a')!;
    expect(previous.textContent).toBe('Назад');

    params.delete('page');
    expect(new URL(previous.href).searchParams.toString()).toBe(params.toString());
});

it('снимает диапазон цены целиком и возвращается на первую страницу с остальными условиями', async () => {
    history.replaceState(
        null,
        '',
        '/search?q=велосипед&city=Москва&price_min=5000&price_max=20000&sort=price_asc&page=2',
    );
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 24 });

    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    try {
        render(root, <SearchPage />);

        await vi.waitFor(() => {
            expect(root.textContent).toContain('На этой странице объявлений нет.');
        });

        root.querySelector<HTMLButtonElement>('button[aria-label^="Убрать: Цена"]')!.click();

        expect(Object.fromEntries(new URLSearchParams(location.search))).toEqual({
            q: 'велосипед',
            city: 'Москва',
            sort: 'price_asc',
        });
    } finally {
        scroll.mockRestore();
    }
});
