import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Router = typeof import('./router');

let router: Router;
let authorized: boolean;

async function setup(path: string): Promise<void> {
    // полный адрес, чтобы // не приняли за ссылку на другой сайт
    history.replaceState({}, '', location.origin + path);
    vi.resetModules();
    router = await import('./router');
    authorized = false;
    router.setAuthCheck(() => authorized);
}

function url(): string {
    return location.pathname + location.search;
}

function link(href: string, attrs: Record<string, string> = {}): HTMLAnchorElement {
    const a = document.createElement('a');
    a.href = href;
    a.dataset.link = '';
    Object.entries(attrs).forEach(([name, value]) => a.setAttribute(name, value));
    document.body.append(a);
    return a;
}

/** true, если клик перехватил роутер */
function click(el: Element, init: MouseEventInit = {}): boolean {
    let handled = false;
    // jsdom не умеет переходить по ссылкам и ругается, поэтому после роутера гасим клик сами
    document.addEventListener('click', (e) => {
        handled = e.defaultPrevented;
        e.preventDefault();
    }, { once: true });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
    return handled;
}

beforeEach(async () => {
    document.body.replaceWith(document.createElement('body'));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await setup('/');
});

afterEach(() => {
    window.removeEventListener('popstate', router.resolveRoute);
});

describe('resolveRoute', () => {
    it('передаёт параметры из пути', () => {
        const seller = vi.fn();
        router.registerRoute('/seller/:id/reviews', seller);

        router.navigate('/seller/7/reviews');

        expect(seller).toHaveBeenCalledWith({ id: '7' });
    });

    it('без подходящего роута показывает 404', () => {
        const notFound = vi.fn();
        router.registerRoute('/cart', vi.fn());
        router.registerNotFound(notFound);

        router.navigate('/cart/42');

        expect(notFound).toHaveBeenCalled();
    });

    it('убирает слэш в конце адреса', () => {
        const profile = vi.fn();
        router.registerRoute('/profile/edit', profile);

        router.navigate('/profile/edit/?tab=1');

        expect(url()).toBe('/profile/edit?tab=1');
        expect(profile).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['//', '/'],
        ['///', '/'],
        ['//profile//edit//', '/profile/edit'],
    ])('лишние слэши %s → %s без зацикливания', async (path, expected) => {
        await setup(path);
        const page = vi.fn();
        router.registerRoute('/', page);
        router.registerRoute('/profile/edit', page);
        const replace = vi.spyOn(history, 'replaceState');

        router.resolveRoute();

        expect(url()).toBe(expected);
        expect(replace).toHaveBeenCalledTimes(1);
        expect(page).toHaveBeenCalledTimes(1);
    });
});

describe('guards', () => {
    it('гостя со страницы для своих отправляет на вход с возвратом', () => {
        const cart = vi.fn();
        router.registerRoute('/cart', cart, { requireAuth: true });
        router.registerRoute('/login', vi.fn(), { guestOnly: true });

        router.navigate('/cart?from=listing');

        expect(cart).not.toHaveBeenCalled();
        expect(url()).toBe('/login?next=%2Fcart%3Ffrom%3Dlisting');
    });

    it('вошедшего со страницы входа возвращает туда, откуда пришёл', () => {
        const cart = vi.fn();
        router.registerRoute('/cart', cart, { requireAuth: true });
        router.registerRoute('/login', vi.fn(), { guestOnly: true });
        authorized = true;

        router.navigate('/login?next=%2Fcart');

        expect(url()).toBe('/cart');
        expect(cart).toHaveBeenCalled();
    });

    it('вход с главной не добавляет next', async () => {
        await setup('/');
        expect(router.loginUrl()).toBe('/login');
    });
});

describe('nextPath', () => {
    it.each([
        ['/login?next=%2Fprofile%2Flistings', '/profile/listings'],
        ['/login?next=%2Fcheckout%3Fids%3D1%2C2', '/checkout?ids=1,2'],
        ['/login', '/'],
        ['/login?next=%2F%2Fevil.com', '/'],
        ['/login?next=https%3A%2F%2Fevil.com', '/'],
        ['/login?next=%2F%5Cevil.com', '/'],
        ['/login?next=%2F%09%2Fevil.com', '/'],
        ['/login?next=%2Flisting%2F3%23photos', '/listing/3#photos'],
    ])('%s → %s', async (path, expected) => {
        await setup(path);
        expect(router.nextPath()).toBe(expected);
    });
});

describe('ссылки', () => {
    let listing: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        listing = vi.fn();
        router.registerRoute('/', vi.fn());
        router.registerRoute('/listing/:id', listing);
        router.initRouter();
    });

    it('обычный клик открывает страницу без перезагрузки', () => {
        expect(click(link('/listing/3'))).toBe(true);
        expect(url()).toBe('/listing/3');
        expect(listing).toHaveBeenCalledWith({ id: '3' });
    });

    it.each([
        ['ctrl', { ctrlKey: true }],
        ['cmd', { metaKey: true }],
        ['shift', { shiftKey: true }],
        ['средняя кнопка', { button: 1 }],
    ])('%s + клик оставляем браузеру', (_, init) => {
        expect(click(link('/listing/3'), init)).toBe(false);
        expect(url()).toBe('/');
    });

    it('не трогает ссылки в новой вкладке и на чужие сайты', () => {
        expect(click(link('/listing/3', { target: '_blank' }))).toBe(false);
        expect(click(link('https://example.com/listing/3'))).toBe(false);
    });

    it('клик по ссылке на текущую страницу не плодит историю', () => {
        click(link('/listing/3'));
        const length = history.length;

        click(link('/listing/3'));

        expect(history.length).toBe(length);
    });

    it('назад в браузере перерисовывает страницу', () => {
        history.pushState({}, '', '/listing/5');

        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(listing).toHaveBeenCalledWith({ id: '5' });
    });
});
