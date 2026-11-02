import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@/vdom';
import type { MyAdCard, MyListingPage, Profile } from '@/lib/api';
import { MyListingsPage, type MyListingsTab } from './my-listings-page';

const api = vi.hoisted(() => ({
    getMyListings: vi.fn(),
    closeListing: vi.fn(),
    deleteListing: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const profile: Profile = {
    id: 1,
    email: 'ivan@example.com',
    first_name: 'Иван',
    phone: '+79990000000',
    email_verified: true,
    pending_email: null,
    phone_verified: true,
    city: null,
    about: '',
    avatar_url: null,
    rating: 4.9,
    reviews_count: 12,
    created_at: '2024-03-05T10:00:00Z',
};

function ad(id: number, status: MyAdCard['status']): MyAdCard {
    return {
        id,
        title: `Объявление ${id}`,
        price: '1500.00',
        image_url: null,
        city: 'Москва',
        has_delivery: false,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-12T10:00:00Z',
        status,
        close_reason: null,
    };
}

function listingsPage(items: MyAdCard[]): MyListingPage {
    const counts = { all: items.length, draft: 0, moderation: 0, rejected: 0, active: 0, closed: 0, sold: 0 };
    items.forEach(({ status }) => { counts[status] += 1; });
    return { items, counts, total: items.length, limit: 60, offset: 0 };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function renderPage(tab: MyListingsTab = 'active') {
    render(root, <MyListingsPage tab={tab} profile={profile} onLogout={async () => {}} />);
}

function click(selector: string) {
    const el = root.querySelector<HTMLElement>(selector);
    expect(el).not.toBeNull();
    el!.click();
}

beforeEach(() => {
    vi.clearAllMocks();
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('MyListingsPage', () => {
    it('показывает скелетон, пока объявления грузятся', () => {
        api.getMyListings.mockReturnValue(new Promise(() => {}));
        renderPage();

        expect(root.querySelectorAll('.my-listings__skeleton')).toHaveLength(3);
    });

    it('во вкладке «Активные» показывает активные, на проверке и отклонённые', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([
            ad(1, 'active'), ad(2, 'moderation'), ad(3, 'rejected'), ad(4, 'draft'), ad(5, 'sold'),
        ]));
        renderPage('active');
        await tick();

        const ids = [...root.querySelectorAll<HTMLElement>('.my-ad-card')].map((el) => el.dataset.adId);
        expect(ids).toEqual(['1', '2', '3']);
        expect(root.querySelector('.my-listings__tab--active')?.textContent).toBe('Активные · 3');
        expect(root.querySelector('.profile-sidebar__menu-count')?.textContent).toBe('5');
        expect(root.querySelector('[data-ad-id="3"] .my-ad-card__status--error')?.textContent).toBe('Не прошло проверку');
    });

    it('новому пользователю показывает пустое состояние', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([]));
        renderPage();
        await tick();

        expect(root.querySelector('.empty-state__title')?.textContent).toBe('У вас пока нет объявлений');
        expect(root.querySelector('.empty-state')?.classList.contains('empty-state--card')).toBe(true);
        expect(root.querySelector('.empty-state__emoji')?.textContent).toBe('📦');
        expect(root.querySelector<HTMLButtonElement>('.empty-state__action')?.textContent).toBe('Разместить объявление');
    });

    it('при ошибке загрузки показывает ошибку с повтором', async () => {
        api.getMyListings.mockRejectedValueOnce(new Error('network'));
        renderPage();
        await tick();

        expect(root.querySelector('.page-error')).not.toBeNull();

        api.getMyListings.mockResolvedValue(listingsPage([ad(1, 'active')]));
        click('.page-error .empty-state__action');
        await tick();

        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(1);
    });

    it('удаляет объявление после подтверждения', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([ad(1, 'active'), ad(2, 'active')]));
        api.deleteListing.mockResolvedValue(undefined);
        renderPage();
        await tick();

        click('[data-ad-id="1"] .my-ad-card__delete');
        await tick();
        click('.delete-listing-modal__confirm');
        await tick();

        expect(api.deleteListing).toHaveBeenCalledWith(1);
        expect(root.querySelector('.modal')).toBeNull();
        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(1);
        expect(root.querySelector('.my-listings__tab--active')?.textContent).toBe('Активные · 1');
    });

    it('снимает с продажи с выбранной причиной', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([ad(1, 'active')]));
        api.closeListing.mockResolvedValue({ status: 'sold', close_reason: 'sold_on_goget', updated_at: '2026-10-20T10:00:00Z' });
        renderPage();
        await tick();

        click('[data-ad-id="1"] .my-ad-card__action:not(:disabled)');
        await tick();

        expect(root.querySelector<HTMLButtonElement>('.close-listing-modal__confirm')?.disabled).toBe(true);

        const radio = root.querySelector<HTMLInputElement>('.close-listing-modal__radio[value="sold_on_goget"]')!;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();
        click('.close-listing-modal__confirm');
        await tick();

        expect(api.closeListing).toHaveBeenCalledWith(1, 'sold_on_goget');
        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(0);
        expect(root.querySelector('.empty-state__title')?.textContent).toBe('Нет активных объявлений');
    });

    it('оставляет модалку открытой и показывает ошибку, если удалить не удалось', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([ad(1, 'draft')]));
        api.deleteListing.mockRejectedValue(new Error('500'));
        renderPage('drafts');
        await tick();

        click('[data-ad-id="1"] .my-ad-card__delete');
        await tick();
        click('.delete-listing-modal__confirm');
        await tick();

        expect(root.querySelector('.delete-listing-modal__error')?.textContent).toBe('Не удалось удалить объявление. Попробуйте ещё раз');
        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(1);
    });

    it('считает вкладки по реальным объявлениям, а не по counts бэка', async () => {
        api.getMyListings.mockResolvedValue({
            items: [],
            counts: { all: 6, draft: 1, moderation: 1, rejected: 0, active: 3, closed: 1, sold: 0 },
            total: 0,
            limit: 60,
            offset: 0,
        });
        renderPage();
        await tick();

        const tabs = [...root.querySelectorAll('.my-listings__tab')].map((el) => el.textContent);
        expect(tabs).toEqual(['Активные · 0', 'Снятые · 0', 'Черновики · 0']);
        expect(root.querySelector('.profile-sidebar__menu-count')?.textContent).toBe('0');
        expect(root.querySelector('.empty-state__title')?.textContent).toBe('У вас пока нет объявлений');
    });

    it('берёт counts бэка, если загружены не все объявления', async () => {
        api.getMyListings.mockResolvedValue({
            items: [ad(1, 'active')],
            counts: { all: 80, draft: 5, moderation: 0, rejected: 0, active: 70, closed: 5, sold: 0 },
            total: 80,
            limit: 60,
            offset: 0,
        });
        renderPage();
        await tick();

        expect(root.querySelector('.my-listings__tab--active')?.textContent).toBe('Активные · 70');
        expect(root.querySelector('.profile-sidebar__menu-count')?.textContent).toBe('80');
    });

    it('показывает фото по полной ссылке на бэк и «Даром» у бесплатного', async () => {
        api.getMyListings.mockResolvedValue(listingsPage([
            { ...ad(1, 'active'), image_url: '/uploads/listings/1.jpg' },
            { ...ad(2, 'active'), is_free: true, price: '0.00' },
        ]));
        renderPage();
        await tick();

        expect(root.querySelector('[data-ad-id="1"] .my-ad-card__image')?.getAttribute('src'))
            .toBe('http://localhost:8080/uploads/listings/1.jpg');
        expect(root.querySelector('[data-ad-id="2"] .my-ad-card__price')?.textContent).toBe('Даром');
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

function pageOf(items: MyAdCard[], total: number, offset = 0): MyListingPage {
    return { ...listingsPage(items), total, offset };
}

const many = (from: number, count: number) => Array.from({ length: count }, (_, i) => ad(from + i, 'active'));

describe('MyListingsPage: бесконечная лента', () => {
    beforeEach(() => {
        FakeObserver.instances = [];
        vi.stubGlobal('IntersectionObserver', FakeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('догружает следующую страницу, когда конец списка виден', async () => {
        api.getMyListings
            .mockResolvedValueOnce(pageOf(many(1, 60), 70))
            .mockResolvedValueOnce(pageOf(many(61, 10), 70, 60));
        renderPage();
        await tick();

        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(60);

        revealEnd();
        await tick();

        expect(api.getMyListings).toHaveBeenLastCalledWith({ limit: 60, offset: 60 });
        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(70);
    });

    it('показывает строку-скелетон, пока грузится следующая страница', async () => {
        api.getMyListings
            .mockResolvedValueOnce(pageOf(many(1, 60), 70))
            .mockReturnValueOnce(new Promise(() => {}));
        renderPage();
        await tick();

        revealEnd();
        await tick();

        expect(root.querySelectorAll('.my-ad-card')).toHaveLength(60);
        expect(root.querySelectorAll('.my-listings__skeleton')).toHaveLength(1);
    });

    it('не грузит дальше, когда загружено всё', async () => {
        api.getMyListings.mockResolvedValueOnce(pageOf(many(1, 5), 5));
        renderPage();
        await tick();

        revealEnd();
        await tick();

        expect(api.getMyListings).toHaveBeenCalledTimes(1);
        expect(root.querySelector('.my-listings__sentinel')).toBeNull();
    });
});

