import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initRouter, navigate, registerRoute } from '@/router/router';

const home = vi.fn();
const listing = vi.fn();

const link = (href: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.dataset.link = '';
    document.body.appendChild(a);
    return a;
};

const scroller = (key: string, scrollLeft: number) => {
    const el = document.createElement('div');
    el.dataset.scrollKey = key;
    Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true });
    document.body.appendChild(el);
    return el;
};

const click = (el: Element, init: MouseEventInit = {}) => {
    let prevented = false;
    const stopNavigation = (e: Event) => {
        prevented = e.defaultPrevented;
        e.preventDefault();
    };
    window.addEventListener('click', stopNavigation, { once: true });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    return prevented;
};

beforeAll(() => {
    window.scrollTo = vi.fn();
    history.replaceState(null, '', '/');
    registerRoute('/', home);
    registerRoute('/listing/:id', listing);
    initRouter();
});

beforeEach(() => {
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
    vi.clearAllMocks();
});

describe('router', () => {
    it('обычный клик по ссылке переходит без перезагрузки', () => {
        expect(click(link('/listing/1'))).toBe(true);
        expect(location.pathname).toBe('/listing/1');
        expect(listing).toHaveBeenCalledWith({ id: '1' });
    });

    it.each([
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { altKey: true },
        { button: 1 },
    ])('клик %o отдаёт браузеру', (init) => {
        expect(click(link('/listing/1'), init)).toBe(false);
        expect(location.pathname).toBe('/');
        expect(listing).not.toHaveBeenCalled();
    });

    it('перед переходом запоминает прокрутку страницы и каруселей', () => {
        Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
        scroller('products', 240);
        const replaceState = vi.spyOn(history, 'replaceState');

        navigate('/listing/1');

        expect(replaceState).toHaveBeenCalledWith({ scrollY: 500, scrollers: { products: 240 } }, '');
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
        replaceState.mockRestore();
    });

    it('на «Назад» восстанавливает прокрутку после рендера', async () => {
        const products = scroller('products', 0);
        history.replaceState({ scrollY: 500, scrollers: { products: 240 } }, '', '/');

        window.dispatchEvent(new PopStateEvent('popstate'));

        await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'instant' }));
        expect(home).toHaveBeenCalled();
        expect(products.scrollLeft).toBe(240);
    });

    it('без сохранённого состояния прокручивает в начало', async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));

        await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' }));
    });

    it('не восстанавливает прокрутку, если за время загрузки ушли на другую страницу', async () => {
        let finish = () => {};
        home.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
        history.replaceState({ scrollY: 500, scrollers: {} }, '', '/');

        window.dispatchEvent(new PopStateEvent('popstate'));
        history.pushState({}, '', '/listing/2');
        finish();

        await new Promise((resolve) => setTimeout(resolve));
        expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 500, behavior: 'instant' });
    });
});
