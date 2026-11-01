import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initRouter, registerRoute } from '@/router/router';

const home = vi.fn();
const listing = vi.fn();

const link = (href: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.dataset.link = '';
    document.body.appendChild(a);
    return a;
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
});
