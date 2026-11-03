import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError, type AdCard, type Review, type ReviewPage, type SellerAdPage, type SellerProfile } from '@/lib/api';
import { formatPosted } from '@/lib/format';
import { clearUser, setUser } from '@/store';
import { SellerPage, type SellerTab } from './seller-page';

const api = vi.hoisted(() => ({
    getSeller: vi.fn(),
    getSellerListings: vi.fn(),
    getSellerReviews: vi.fn(),
    reportSeller: vi.fn(),
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock('@/lib/toast', () => toast);

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const seller: SellerProfile = {
    id: 5,
    first_name: 'Тимур',
    avatar_url: null,
    rating: 4.8,
    reviews_count: 56,
    created_at: '2022-04-10T10:00:00Z',
    location: 'Москва, м. Сокол',
    phone_verified: true,
    completed_sales_count: 140,
    active_listings_count: 12,
};

function ad(id: number): AdCard {
    return {
        id,
        title: `Велосипед ${id}`,
        price: '25000.00',
        image_url: null,
        city: 'Москва',
        has_delivery: true,
        created_at: new Date().toISOString(),
    };
}

function listingsPage(items: AdCard[], total = items.length): SellerAdPage {
    return {
        items,
        total,
        limit: 24,
        offset: 0,
        categories: items.length ? [{ id: 1, name: 'Спорт и отдых', count: 10 }, { id: 2, name: 'Детские товары', count: 2 }] : [],
    };
}

function review(id: number, rating = 5): Review {
    return {
        id,
        author: { id: 100 + id, first_name: `Автор ${id}`, avatar_url: null },
        rating,
        text: 'Всё отлично, рекомендую',
        listing_title: 'Велосипед Stels',
        photos: [],
        created_at: '2026-10-12T10:00:00Z',
    };
}

function reviewsPage(items: Review[], total = items.length): ReviewPage {
    return { items, total, limit: 10, offset: 0, rating: 4.8, distribution: { 5: 44, 4: 8, 3: 2, 2: 1, 1: 1 } };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function renderPage(tab: SellerTab = 'listings', sellerId = 5, authorized = true) {
    render(root, <SellerPage sellerId={sellerId} tab={tab} authorized={authorized} />);
}

function query<T extends HTMLElement>(selector: string): T {
    const el = root.querySelector<T>(selector);
    expect(el).not.toBeNull();
    return el!;
}

function texts(selector: string): string[] {
    return [...root.querySelectorAll(selector)].map((el) => el.textContent ?? '');
}

function clickText(selector: string, text: string) {
    const el = [...root.querySelectorAll<HTMLElement>(selector)].find((node) => node.textContent === text);
    expect(el).toBeDefined();
    el!.click();
}

beforeEach(() => {
    vi.clearAllMocks();
    clearUser();
    api.getSeller.mockResolvedValue(seller);
    api.getSellerListings.mockResolvedValue(listingsPage(Array.from({ length: 12 }, (_, i) => ad(i + 1))));
    api.getSellerReviews.mockResolvedValue(reviewsPage([review(1), review(2, 4), review(3, 3)], 56));
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

afterEach(() => {
    clearUser();
});

describe('SellerPage', () => {
    it('показывает скелетон, пока продавец грузится', () => {
        api.getSeller.mockReturnValue(new Promise(() => {}));
        renderPage();

        expect(root.querySelector('.seller-page__header-skeleton')).not.toBeNull();
        expect(root.querySelectorAll('.seller-page__card-skeleton')).toHaveLength(6);
        expect(texts('.seller-page__tab')).toEqual(['Объявления', 'Отзывы']);
    });

    it('показывает шапку продавца, вкладки и объявления', async () => {
        renderPage();
        await tick();

        expect(query('.seller-header__name').textContent).toBe('Тимур');
        expect(query('.seller-header__stars').textContent).toBe('★ 4,8');
        expect(query<HTMLAnchorElement>('.seller-header__reviews').getAttribute('href')).toBe('/seller/5/reviews');
        expect(query('.seller-header__reviews').textContent).toBe('56 отзывов');
        expect(query('.seller-header__details').textContent).toBe('На GoGET с 2022 года · Москва, м. Сокол');
        expect(texts('.seller-header__badge')).toEqual(['Телефон подтверждён', '140 завершённых продаж']);
        expect(texts('.seller-page__tab')).toEqual(['Объявления · 12', 'Отзывы · 56']);
        expect(texts('.breadcrumbs > *')).toEqual(['Главная', '/', `Продавец ${seller.first_name}`]);
        expect(texts('.seller-page__chip')).toEqual(['Все · 12', 'Спорт и отдых · 10', 'Детские товары · 2']);
        expect(query('#seller-sort').textContent).toBe('Сначала новые');
        expect(root.querySelectorAll('.product-card')).toHaveLength(12);
        expect(query('.product-card__meta').textContent).toBe('Москва · размещено сегодня');
        expect(query<HTMLAnchorElement>('.product-card__link').getAttribute('href')).toBe(`/listing/${ad(1).id}`);
        expect(query('.product-card__rating').textContent).toBe('4,8');
        expect(api.getSellerListings).toHaveBeenCalledWith(5, { limit: 60, sort: 'newest', category_id: undefined });
    });

    it('у продавца с одной категорией два чипа', async () => {
        api.getSellerListings.mockResolvedValue({
            ...listingsPage([ad(1), ad(2), ad(3)]),
            categories: [{ id: 1, name: 'Спорт и отдых', count: 3 }],
        });
        renderPage();
        await tick();

        expect(texts('.seller-page__chip')).toEqual(['Все · 3', 'Спорт и отдых · 3']);
    });

    it('без отзывов пишет, что их пока нет', async () => {
        api.getSeller.mockResolvedValue({ ...seller, rating: 0, reviews_count: 0 });
        renderPage();
        await tick();

        expect(root.querySelector('.seller-header__stars')).toBeNull();
        expect(query('.seller-header__no-reviews').textContent).toBe('Пока нет отзывов');
    });

    it('показывает длинное имя продавца целиком', async () => {
        const longName = 'Александр-Константин Величайший Продавец Велосипедов';
        api.getSeller.mockResolvedValue({ ...seller, first_name: longName });
        renderPage();
        await tick();

        expect(query('.seller-header__name').textContent).toBe(longName);
        expect(root.querySelector('.seller-header__actions')).not.toBeNull();
        expect(query('.breadcrumbs').className).toContain('breadcrumbs--strong');
    });

    it('фильтрует по категории и меняет сортировку', async () => {
        renderPage();
        await tick();

        clickText('.seller-page__chip', 'Спорт и отдых · 10');
        await tick();
        expect(api.getSellerListings).toHaveBeenLastCalledWith(5, expect.objectContaining({ category_id: 1 }));
        expect(query('.seller-page__chip--active').textContent).toBe('Спорт и отдых · 10');

        query<HTMLButtonElement>('#seller-sort').click();
        await tick();
        clickText('.select__option', 'Сначала дешевле');
        await tick();
        expect(api.getSellerListings).toHaveBeenLastCalledWith(5, expect.objectContaining({ sort: 'price_asc', category_id: 1 }));
    });

    it('показывает пустое состояние, если у продавца нет объявлений', async () => {
        api.getSeller.mockResolvedValue({ ...seller, active_listings_count: 0 });
        api.getSellerListings.mockResolvedValue(listingsPage([]));
        renderPage();
        await tick();

        expect(query('.seller-page__empty-title').textContent).toBe('У продавца сейчас нет активных объявлений');
        expect(query<HTMLButtonElement>('.seller-page__empty-action').textContent).toBe('Подписаться на продавца');
        expect(texts('.seller-page__tab')[0]).toBe('Объявления · 0');
    });

    it('сообщает, что продавец не найден', async () => {
        api.getSeller.mockRejectedValue(new ApiError(404, { reason: 'seller not found' }));
        renderPage();
        await tick();

        expect(query('.not-found__title').textContent).toBe('Страница не найдена');
        expect(api.getSellerListings).not.toHaveBeenCalled();
    });

    it('при ошибке загрузки показывает ошибку с повтором', async () => {
        api.getSeller.mockRejectedValueOnce(new ApiError(500));
        renderPage();
        await tick();

        query<HTMLButtonElement>('.page-error .empty-state__action').click();
        await tick();

        expect(query('.seller-header__name').textContent).toBe('Тимур');
    });

    it('показывает отзывы со сводкой рейтинга', async () => {
        renderPage('reviews');
        await tick();

        expect(api.getSellerListings).not.toHaveBeenCalled();
        expect(query('.rating-summary__value').textContent).toBe('4,8');
        expect(query('.rating-summary__caption').textContent).toBe('★★★★★ на основе 56 отзывов');
        expect(texts('.rating-summary__count')).toEqual(['44', '8', '2', '1', '1']);
        expect(query<HTMLElement>('[data-stars="5"] .rating-summary__fill').style.width).toBe('100%');
        expect(root.querySelectorAll('.review-card')).toHaveLength(3);
        expect(query('[data-review-id="2"] .review-card__stars').textContent).toBe('★★★★☆');
        expect(query('[data-review-id="1"] .review-card__meta').textContent).toBe('Велосипед Stels · 12 октября');
        expect(query('.seller-page__more').textContent).toBe('Показать ещё отзывы');
    });

    it('отзыв без объявления показывает только дату', async () => {
        api.getSellerReviews.mockResolvedValue(reviewsPage([{ ...review(4), listing_title: null }]));
        renderPage('reviews');
        await tick();

        expect(query('[data-review-id="4"] .review-card__meta').textContent).toBe('12 октября');
    });

    it('фильтрует отзывы с фото', async () => {
        renderPage('reviews');
        await tick();

        query<HTMLButtonElement>('.seller-page__photo-filter').click();
        await tick();

        expect(api.getSellerReviews).toHaveBeenLastCalledWith(5, expect.objectContaining({ with_photos: true, offset: 0 }));
        expect(query('.seller-page__photo-filter').getAttribute('aria-pressed')).toBe('true');
    });

    it('без отзывов показывает нулевую сводку и пустой список', async () => {
        api.getSellerReviews.mockResolvedValue({ ...reviewsPage([]), rating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
        renderPage('reviews');
        await tick();

        expect(query('.rating-summary__caption').textContent).toBe('☆☆☆☆☆ на основе 0 отзывов');
        expect(root.querySelectorAll('.review-card')).toHaveLength(0);
        expect(root.querySelector('.seller-page__more')).toBeNull();
    });

    it('копирует ссылку на продавца из меню', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        renderPage();
        await tick();

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();
        expect(texts('.seller-header__menu-item')).toEqual(['Поделиться профилем', 'Скопировать ссылку', 'Пожаловаться на продавца']);

        clickText('.seller-header__menu-item', 'Скопировать ссылку');
        await tick();

        expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/seller/5`);
        expect(root.querySelector('.seller-header__menu')).toBeNull();
        expect(toast.showToast).toHaveBeenCalledWith('Ссылка скопирована');
    });

    it('гостю не предлагает пожаловаться на продавца', async () => {
        renderPage('listings', 5, false);
        await tick();

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();

        expect(texts('.seller-header__menu-item')).toEqual(['Поделиться профилем', 'Скопировать ссылку']);
        expect(root.querySelector('.seller-header__menu-divider')).toBeNull();
    });

    it('при ошибке загрузки откатывает выбранную категорию и сортировку', async () => {
        renderPage();
        await tick();

        const failed = deferred<SellerAdPage>();
        api.getSellerListings.mockReturnValueOnce(failed.promise);
        clickText('.seller-page__chip', 'Спорт и отдых · 10');
        await tick();
        expect(query('.seller-page__chip--active').textContent).toBe('Спорт и отдых · 10');
        failed.reject(new ApiError(500));
        await tick();

        expect(query('.seller-page__chip--active').textContent).toBe('Все · 12');
        expect(toast.showToast).toHaveBeenCalledWith('Не удалось загрузить объявления. Попробуйте ещё раз', 'error');

        api.getSellerListings.mockRejectedValueOnce(new ApiError(500));
        query<HTMLButtonElement>('#seller-sort').click();
        await tick();
        clickText('.select__option', 'Сначала дешевле');
        await tick();

        expect(query('#seller-sort').textContent).toContain('Сначала новые');
        expect(root.querySelectorAll('.product-card')).toHaveLength(12);
    });

    it('при ошибке загрузки отзывов откатывает фильтр и сортировку', async () => {
        renderPage('reviews');
        await tick();

        const failed = deferred<ReviewPage>();
        api.getSellerReviews.mockReturnValueOnce(failed.promise);
        query<HTMLButtonElement>('.seller-page__photo-filter').click();
        await tick();
        expect(query('.seller-page__photo-filter').getAttribute('aria-pressed')).toBe('true');
        failed.reject(new ApiError(500));
        await tick();

        expect(query('.seller-page__photo-filter').getAttribute('aria-pressed')).toBe('false');

        api.getSellerReviews.mockRejectedValueOnce(new ApiError(500));
        query<HTMLButtonElement>('#seller-review-sort').click();
        await tick();
        clickText('.select__option', 'Сначала отрицательные');
        await tick();

        expect(query('#seller-review-sort').textContent).toContain('Сначала новые');
        expect(toast.showToast).toHaveBeenCalledWith('Не удалось загрузить отзывы. Попробуйте ещё раз', 'error');
    });

    it('отправляет жалобу на продавца', async () => {
        api.reportSeller.mockResolvedValue(undefined);
        renderPage();
        await tick();

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();
        clickText('.seller-header__menu-item', 'Пожаловаться на продавца');
        await tick();

        expect(query('.modal__title').textContent).toBe('Пожаловаться на продавца');
        expect(query<HTMLButtonElement>('.report-seller-modal__confirm').disabled).toBe(true);

        const radio = query<HTMLInputElement>('.report-seller-modal__radio[value="rude"]');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        const textarea = query<HTMLTextAreaElement>('#report-comment');
        textarea.value = '  Хамил в переписке ';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await tick();
        expect(query('#report-comment ~ .textarea-field__counter').textContent).toBe('20 / 500');

        query<HTMLButtonElement>('.report-seller-modal__confirm').click();
        await tick();

        expect(api.reportSeller).toHaveBeenCalledWith(5, { reason: 'rude', comment: 'Хамил в переписке' });
        expect(root.querySelector('.modal')).toBeNull();
        expect(toast.showToast).toHaveBeenCalledWith('Жалоба отправлена. Спасибо!');
    });

    it('оставляет модалку жалобы открытой при ошибке', async () => {
        api.reportSeller.mockRejectedValue(new ApiError(500));
        renderPage();
        await tick();

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();
        clickText('.seller-header__menu-item', 'Пожаловаться на продавца');
        await tick();
        const radio = query<HTMLInputElement>('.report-seller-modal__radio[value="fraud"]');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();
        query<HTMLButtonElement>('.report-seller-modal__confirm').click();
        await tick();

        expect(query('.report-seller-modal__error').textContent).toBe('Не удалось отправить жалобу. Попробуйте ещё раз');
    });

    it('показывает лимит запросов в ошибке жалобы', async () => {
        api.reportSeller.mockRejectedValue(new ApiError(429, { reason: 'too many requests', retryAfter: 120 }));
        renderPage();
        await tick();

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();
        clickText('.seller-header__menu-item', 'Пожаловаться на продавца');
        await tick();
        const radio = query<HTMLInputElement>('.report-seller-modal__radio[value="fraud"]');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();
        query<HTMLButtonElement>('.report-seller-modal__confirm').click();
        await tick();

        expect(query('.report-seller-modal__error').textContent).toBe('Слишком много попыток. Попробуйте через 2 минуты');
    });

    it('не даёт пожаловаться на себя', async () => {
        setUser({ id: 5, email: 'timur@mail.ru', first_name: 'Тимур', phone: '+79990000000', email_verified: true });
        renderPage();
        await tick();

        expect(root.querySelector('.seller-header__message')).toBeNull();
        expect(query<HTMLAnchorElement>('.seller-header__follow').getAttribute('href')).toBe('/profile/edit');

        query<HTMLButtonElement>('.seller-header__more-button').click();
        await tick();

        expect(texts('.seller-header__menu-item')).toEqual(['Поделиться профилем', 'Скопировать ссылку']);
    });

    it('перезагружает данные при переходе к другому продавцу', async () => {
        renderPage('listings', 5);
        await tick();

        api.getSeller.mockResolvedValue({ ...seller, id: 6, first_name: 'Анна' });
        renderPage('listings', 6);
        await tick();
        await tick();

        expect(api.getSeller).toHaveBeenLastCalledWith(6);
        expect(query('.seller-header__name').textContent).toBe('Анна');
        expect(api.getSellerListings).toHaveBeenLastCalledWith(6, expect.anything());
    });
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

describe('SellerPage: гонки запросов', () => {
    it('ошибка объявлений старого продавца не попадает на страницу нового', async () => {
        const stale = deferred<SellerAdPage>();
        api.getSellerListings.mockImplementation((id: number) => (id === 5
            ? stale.promise
            : Promise.resolve(listingsPage([ad(61), ad(62)]))));
        renderPage('listings', 5);
        await tick();

        api.getSeller.mockResolvedValue({ ...seller, id: 6, first_name: 'Анна' });
        renderPage('listings', 6);
        await tick();
        await tick();

        stale.reject(new ApiError(500));
        await tick();

        expect(root.querySelector('.page-error')).toBeNull();
        expect(toast.showToast).not.toHaveBeenCalled();
        expect([...root.querySelectorAll<HTMLElement>('.product-card')].map((el) => el.dataset.adId)).toEqual(['61', '62']);
    });

    it('показывает ответ на последнюю выбранную сортировку', async () => {
        renderPage();
        await tick();

        const slow = deferred<SellerAdPage>();
        api.getSellerListings
            .mockReturnValueOnce(slow.promise)
            .mockResolvedValueOnce(listingsPage([ad(99)]));

        query<HTMLButtonElement>('#seller-sort').click();
        await tick();
        clickText('.select__option', 'Сначала дешевле');
        await tick();
        query<HTMLButtonElement>('#seller-sort').click();
        await tick();
        clickText('.select__option', 'Сначала дороже');
        await tick();

        slow.resolve(listingsPage([ad(50)]));
        await tick();

        expect([...root.querySelectorAll<HTMLElement>('.product-card')].map((el) => el.dataset.adId)).toEqual(['99']);
        expect(query('#seller-sort').textContent).toBe('Сначала дороже');
    });

    it('блокирует «Показать ещё отзывы», пока список отзывов обновляется', async () => {
        renderPage('reviews');
        await tick();

        const refresh = deferred<ReviewPage>();
        api.getSellerReviews.mockReturnValueOnce(refresh.promise);
        query<HTMLButtonElement>('.seller-page__photo-filter').click();
        await tick();

        expect(query<HTMLButtonElement>('.seller-page__more').disabled).toBe(true);
    });
});

class FakeObserver {
    static instances: FakeObserver[] = [];

    callback: IntersectionObserverCallback;

    targets: Element[] = [];

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        FakeObserver.instances.push(this);
    }

    observe(target: Element) {
        this.targets.push(target);
    }

    unobserve(target: Element) {
        this.targets = this.targets.filter((el) => el !== target);
    }

    disconnect() {
        this.targets = [];
    }

    reveal() {
        const entries = this.targets.map((target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry);
        this.callback(entries, this as unknown as IntersectionObserver);
    }
}

function revealEnd() {
    FakeObserver.instances.forEach((observer) => observer.reveal());
}

const many = (from: number, count: number) => Array.from({ length: count }, (_, i) => ad(from + i));

describe('SellerPage: бесконечная лента объявлений', () => {
    beforeEach(() => {
        FakeObserver.instances = [];
        vi.stubGlobal('IntersectionObserver', FakeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('догружает следующую страницу, когда конец списка виден', async () => {
        api.getSellerListings
            .mockResolvedValueOnce(listingsPage(many(1, 60), 70))
            .mockResolvedValueOnce(listingsPage(many(61, 10), 70));
        renderPage();
        await tick();

        expect(root.querySelectorAll('.product-card')).toHaveLength(60);
        revealEnd();
        await tick();

        expect(api.getSellerListings).toHaveBeenLastCalledWith(5, expect.objectContaining({ limit: 60, offset: 60 }));
        expect(root.querySelectorAll('.product-card')).toHaveLength(70);
        expect(root.querySelector('.seller-page__sentinel')).toBeNull();
    });

    it('догружает с текущими категорией и сортировкой', async () => {
        api.getSellerListings
            .mockResolvedValueOnce(listingsPage(many(1, 60), 70))
            .mockResolvedValueOnce(listingsPage(many(1, 60), 65))
            .mockResolvedValueOnce(listingsPage(many(61, 5), 65));
        renderPage();
        await tick();

        clickText('.seller-page__chip', 'Спорт и отдых · 10');
        await tick();
        revealEnd();
        await tick();

        expect(api.getSellerListings).toHaveBeenLastCalledWith(5, expect.objectContaining({ offset: 60, category_id: 1 }));
        expect(root.querySelectorAll('.product-card')).toHaveLength(65);
    });

    it('при ошибке догрузки показывает повтор', async () => {
        api.getSellerListings
            .mockResolvedValueOnce(listingsPage(many(1, 60), 70))
            .mockRejectedValueOnce(new ApiError(500))
            .mockResolvedValueOnce(listingsPage(many(61, 10), 70));
        renderPage();
        await tick();

        revealEnd();
        await tick();
        expect(root.querySelectorAll('.product-card')).toHaveLength(60);
        query<HTMLButtonElement>('.page-error button').click();
        await tick();

        expect(root.querySelectorAll('.product-card')).toHaveLength(70);
    });
});

describe('formatPosted', () => {
    const now = new Date(2026, 9, 25, 15, 0);

    it('пишет «сегодня», «вчера» и число дней', () => {
        expect(formatPosted(new Date(2026, 9, 25, 9, 0).toISOString(), now)).toBe('размещено сегодня');
        expect(formatPosted(new Date(2026, 9, 24, 23, 0).toISOString(), now)).toBe('размещено вчера');
        expect(formatPosted(new Date(2026, 9, 22, 12, 0).toISOString(), now)).toBe('размещено 3 дня назад');
        expect(formatPosted(new Date(2026, 9, 1, 12, 0).toISOString(), now)).toBe('размещено 1 октября');
    });
});
