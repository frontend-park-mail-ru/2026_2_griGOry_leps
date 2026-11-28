import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { ApiError, getCategoryTree, searchListings } from '@/lib/api';
import { searchSettings, refreshSearchSettings } from '@/lib/search';
import { SearchPage } from './search-page';

vi.mock('@/lib/api', async (importOriginal) => {
    const api = await importOriginal<typeof import('@/lib/api')>();
    return {
        ...api,
        searchListings: vi.fn(),
        getCategoryTree: vi.fn().mockResolvedValue([]),
    };
});

vi.mock('@/lib/search', async (orig) => ({
    ...await orig<typeof import('@/lib/search')>(),
    searchSettings: vi.fn(),
    refreshSearchSettings: vi.fn(),
}));
const settings = vi.mocked(searchSettings);

const search = vi.mocked(searchListings);
let root: HTMLElement;

beforeEach(() => {
    search.mockReset();
    vi.mocked(getCategoryTree).mockResolvedValue([]);
    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: true });
    vi.mocked(refreshSearchSettings).mockReset().mockResolvedValue();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
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

it.each([
    ['100', '0', {}],
    ['-1', '20', {}],
    ['abc', '', {}],
    ['1.234', '', {}],
    ['', '10000000000', {}],
    ['0', '0', { price_min: '0', price_max: '0' }],
    ['', '10,50', { price_max: '10.50' }],
])('проверяет границы цены из URL: %s / %s', (min, max, prices) => {
    const params = new URLSearchParams({
        city: 'Москва',
        price_min: min,
        price_max: max,
    });
    history.replaceState(null, '', `/search?${params}`);
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });

    render(root, <SearchPage />);

    expect(search).toHaveBeenCalledWith({
        q: '',
        limit: 24,
        offset: 0,
        filters: { city: 'Москва', ...prices },
    });
});

it('показывает загрузку вместо старой выдачи при смене фильтра', async () => {
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
        total: 25,
        limit: 24,
        offset: 0,
    });
    search.mockImplementationOnce(() => new Promise(() => {}));

    history.replaceState(null, '', '/search?city=Москва');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('a[href="/listing/7"]')).not.toBeNull());

    history.replaceState(null, '', '/search?city=Тула');
    render(root, <SearchPage />);

    await vi.waitFor(() => expect(root.querySelector('[role="status"]')).not.toBeNull());
    expect(root.querySelector('a[href="/listing/7"]')).toBeNull();
    expect(root.querySelector('.search-page__count')).toBeNull();
    expect(root.querySelector('.search-page__pages')).toBeNull();
    expect(search).toHaveBeenLastCalledWith({
        q: '',
        limit: 24,
        offset: 0,
        filters: { city: 'Тула' },
    });
});

it('закрывает панель фильтров при переходе по истории браузера', async () => {
    const dialog = HTMLDialogElement.prototype;
    const { showModal, close } = dialog;
    Object.assign(dialog, { showModal: vi.fn(), close: vi.fn() });
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });

    try {
        history.replaceState(null, '', '/search?city=Тула');
        render(root, <SearchPage />);
        root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click();
        await vi.waitFor(() => {
            expect(root.querySelector<HTMLInputElement>('dialog input[name="city"]')?.value).toBe('Тула');
        });

        history.replaceState(null, '', '/search?city=Москва');
        render(root, <SearchPage />);
        window.dispatchEvent(new PopStateEvent('popstate'));

        await vi.waitFor(() => expect(root.querySelector('dialog')).toBeNull());
        root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click();
        await vi.waitFor(() => {
            expect(root.querySelector<HTMLInputElement>('dialog input[name="city"]')?.value).toBe('Москва');
        });
    } finally {
        render(root, null);
        Object.assign(dialog, { showModal, close });
    }
});

afterEach(() => {
    render(root, null);
    vi.restoreAllMocks();
});

async function sortOptions() {
    root.querySelector<HTMLButtonElement>('#search-sort')!.click();
    await vi.waitFor(() => expect(root.querySelector('#search-sort-list')).not.toBeNull());
    return [...root.querySelectorAll('#search-sort-list [role="option"]')].map(option => option.textContent);
}

it('флаг выключен — только «Сначала новые»', async () => {
    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: false });
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?q=велосипед');
    render(root, <SearchPage />);
    expect(await sortOptions()).toEqual(['Сначала новые']);
});

it('ссылка с price_desc при выключенном флаге сбрасывается без запроса с сортировкой', async () => {
    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: false });
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?q=велосипед&city=Тула&sort=price_desc&page=3');
    render(root, <SearchPage />);
    expect(root.querySelector('#search-sort')?.textContent).toContain('Сначала новые');
    expect(Object.fromEntries(new URLSearchParams(location.search))).toEqual({ q: 'велосипед', city: 'Тула' });
    expect(search).not.toHaveBeenCalled();

    render(root, <SearchPage />); // роутер перерисовал страницу по новому URL
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search).toHaveBeenCalledWith(expect.objectContaining({
        q: 'велосипед',
        offset: 0,
        filters: { city: 'Тула' },
    }));
    expect(root.querySelector('.search-page__notice')?.textContent)
        .toBe('Сортировка по цене сейчас недоступна — показываем сначала новые.');
});

it('при недоступных настройках отправляет выбранную сортировку и сохраняет ссылку', async () => {
    settings.mockReturnValue(null);
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?sort=price_asc&page=3');
    render(root, <SearchPage />);

    expect(search).toHaveBeenCalledWith(expect.objectContaining({ offset: 48, filters: { sort: 'price_asc' } }));
    await vi.waitFor(() => expect(root.querySelector('#search-sort')?.textContent).toContain('Сначала дешевле'));
    expect(location.search).toBe('?sort=price_asc&page=3');
    expect(history.state).toBeNull();
});

it('флаг включён — price_asc уходит в API', async () => {
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?sort=price_asc');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(search).toHaveBeenCalledWith(expect.objectContaining({ filters: { sort: 'price_asc' } })));
    expect(await sortOptions()).toEqual(['Сначала новые', 'Сначала дешевле', 'Сначала дороже']);
});

it('403 price sorting disabled сбрасывает сортировку даже до загрузки настроек', async () => {
    settings.mockReturnValue(null);
    search.mockRejectedValueOnce(new ApiError(403, { reason: 'price sorting disabled' }));
    history.replaceState(null, '', '/search?q=стол&sort=price_asc');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(location.search).toBe('?q=%D1%81%D1%82%D0%BE%D0%BB'));
    expect(history.state).toEqual({ priceSortReset: true });
    expect(refreshSearchSettings).toHaveBeenCalled();
});

it('403 с другой причиной — обычная ошибка с повтором, URL не меняется', async () => {
    search.mockRejectedValueOnce(new ApiError(403, { reason: 'forbidden' }));
    history.replaceState(null, '', '/search?sort=price_asc');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"] button')).not.toBeNull());
    expect(location.search).toBe('?sort=price_asc');
});

it.each([null, 50])('400 q при неизвестном или устаревшем лимите %s', async limit => {
    settings.mockReturnValue({ max_query_length: limit, price_sort_enabled: true });
    search.mockRejectedValueOnce(new ApiError(400, { field: 'q', reason: 'search query too long' }));
    history.replaceState(null, '', '/search?q=очень+длинный');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent)
        .toBe('Запрос слишком длинный — сократите его.'));
    expect(root.querySelector('[role="alert"] button')).toBeNull();
    expect(refreshSearchSettings).toHaveBeenCalled();
});

it('после 400 q повторяет поиск, когда лимит вырос', async () => {
    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: true });
    search.mockRejectedValueOnce(new ApiError(400, { field: 'q', reason: 'search query too long' }));
    search.mockResolvedValueOnce({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?q=очень+длинный');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')).not.toBeNull());

    settings.mockReturnValue({ max_query_length: 5, price_sort_enabled: true });
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent)
        .toBe('Запрос слишком длинный — сократите его до 5 символов.'));
    expect(search).toHaveBeenCalledTimes(1);

    settings.mockReturnValue({ max_query_length: 50, price_sort_enabled: true });
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(root.textContent).toContain('Ничего не найдено'));
    expect(root.querySelector('[role="alert"]')).toBeNull();
});

it('подтверждённый запрет сортировки убирает её из ссылки и ищет с первой страницы', async () => {
    settings.mockReturnValue(null);
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?q=стол&city=Тула&sort=price_asc&page=3');
    const length = history.length;
    render(root, <SearchPage />);
    expect(search).toHaveBeenCalledWith({ q: 'стол', limit: 24, offset: 48, filters: { city: 'Тула', sort: 'price_asc' } });

    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: false });
    render(root, <SearchPage />);
    expect(history.length).toBe(length);
    expect(history.state).toEqual({ priceSortReset: true });
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(search).toHaveBeenLastCalledWith({ q: 'стол', limit: 24, offset: 0, filters: { city: 'Тула' } });
});

it('снижение лимита скрывает текущую выдачу и пагинацию без отправки запрещённого запроса', async () => {
    settings.mockReturnValue({ max_query_length: 30, price_sort_enabled: true });
    search.mockResolvedValueOnce({
        items: [{
            id: 7, title: 'Велосипед', price: '1000.00', image_url: null,
            city: 'Москва', has_delivery: false, created_at: '2026-11-01T10:00:00Z',
        }],
        total: 50,
        limit: 24,
        offset: 0,
    });
    history.replaceState(null, '', '/search?q=велосипед');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('a[href="/listing/7"]')).not.toBeNull());
    expect(root.querySelector('.search-page__pages')).not.toBeNull();

    settings.mockReturnValue({ max_query_length: 3, price_sort_enabled: true });
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent)
        .toBe('Запрос слишком длинный — сократите его до 3 символов.'));
    expect(root.querySelector('a[href="/listing/7"]')).toBeNull();
    expect(root.querySelector('.search-page__pages')).toBeNull();
    expect(search).toHaveBeenCalledTimes(1);
});

it('ответ на запрос со старым лимитом не заменяет сообщение о новом лимите', async () => {
    settings.mockReturnValue({ max_query_length: 30, price_sort_enabled: true });
    let answer!: (value: Awaited<ReturnType<typeof searchListings>>) => void;
    search.mockReturnValueOnce(new Promise(resolve => { answer = resolve; }));
    history.replaceState(null, '', '/search?q=велосипед');
    render(root, <SearchPage />);

    settings.mockReturnValue({ max_query_length: 3, price_sort_enabled: true });
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')).not.toBeNull());

    answer({ items: [], total: 0, limit: 24, offset: 0 });
    await Promise.resolve();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('до 3 символов');
    expect(search).toHaveBeenCalledTimes(1);
});

it.each([
    new ApiError(403, { reason: 'price sorting disabled' }),
    new ApiError(400, { field: 'q', reason: 'search query too long' }),
])('после ухода со страницы устаревшая ошибка %s не меняет URL и настройки', async error => {
    let reject!: (error: unknown) => void;
    search.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    history.replaceState(null, '', '/search?q=стол&sort=price_asc');
    render(root, <SearchPage />);
    render(root, null);
    history.replaceState(null, '', '/categories');
    reject(error);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(location.pathname).toBe('/categories');
    expect(history.state).toBeNull();
    expect(refreshSearchSettings).not.toHaveBeenCalled();
});

it('400 другого поля оставляет обычную ошибку с повтором', async () => {
    search.mockRejectedValueOnce(new ApiError(400, { field: 'city', reason: 'invalid city' }));
    history.replaceState(null, '', '/search?q=стол');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('[role="alert"] button')).not.toBeNull());
    expect(refreshSearchSettings).not.toHaveBeenCalled();
});

it.each([
    new ApiError(403, { reason: 'price sorting disabled' }),
    new ApiError(400, { field: 'q', reason: 'search query too long' }),
])('поздняя ошибка %s не влияет на новый URL до размонтирования поиска', async error => {
    let reject!: (error: unknown) => void;
    search.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    history.replaceState(null, '', '/search?q=стол&sort=price_asc');
    render(root, <SearchPage />);
    history.replaceState({ destination: true }, '', '/categories?sort=price_desc&page=2');
    reject(error);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(location.pathname + location.search).toBe('/categories?sort=price_desc&page=2');
    expect(history.state).toEqual({ destination: true });
    expect(refreshSearchSettings).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')).toBeNull();
});

it('смена флага на прежней странице во время загрузки нового маршрута не меняет новый URL', async () => {
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?sort=price_asc');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(root.querySelector('.search-page__count')).not.toBeNull());
    history.replaceState(null, '', '/categories?sort=price_desc&page=2');
    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: false });
    render(root, <SearchPage />);
    expect(location.pathname + location.search).toBe('/categories?sort=price_desc&page=2');
    expect(history.state).toBeNull();
});

it('флаг выключили на открытой странице с price_desc — сброс', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    search.mockResolvedValue({ items: [], total: 0, limit: 24, offset: 0 });
    history.replaceState(null, '', '/search?q=стол&sort=price_desc');
    render(root, <SearchPage />);
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));

    settings.mockReturnValue({ max_query_length: null, price_sort_enabled: false });
    render(root, <SearchPage />);
    expect(location.search).toBe('?q=%D1%81%D1%82%D0%BE%D0%BB');
    expect(history.state).toEqual({ priceSortReset: true });
});
