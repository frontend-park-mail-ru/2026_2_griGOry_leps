import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { listEntries, saveEntry } from './api';

vi.mock('./api', async (importOriginal) => ({
    ...await importOriginal<typeof import('./api')>(),
    listEntries: vi.fn().mockResolvedValue([]),
    saveEntry: vi.fn(),
}));
vi.mock('@/lib/api', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/api')>(),
    getMe: vi.fn().mockRejectedValue(new Error('нет сессии')),
}));

const list = vi.mocked(listEntries);
const select = () => document.querySelector<HTMLSelectElement>('.oc-filters select')!;
const input = () => document.querySelector<HTMLInputElement>('.oc-filters input[type="search"]')!;
const listen = vi.spyOn(window, 'addEventListener');

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    list.mockReset().mockResolvedValue([]);
    vi.mocked(saveEntry).mockReset();
    document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
    render(document.getElementById('app')!, null);
    for (const [type, listener] of listen.mock.calls) {
        if (type === 'hashchange') window.removeEventListener(type, listener);
    }
});

it('держит вкладку и фильтры в решётке', async () => {
    history.replaceState(null, '', '/admin/#flags?scope=search&name=sort');
    const length = history.length;
    await import('./main');

    await vi.waitFor(() => expect(list).toHaveBeenCalledWith('flag', 'search', 'sort'));
    expect(document.querySelector('h1')?.textContent).toBe('Фича-флаги');
    expect(select().value).toBe('search');
    expect(input().value).toBe('sort');

    input().value = 'price';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.oc-filters')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(list).toHaveBeenLastCalledWith('flag', 'search', 'price'));
    expect(location.pathname + location.hash).toBe('/admin/#flags?scope=search&name=price');
    expect(history.length).toBe(length);

    location.hash = '#configs?name=limit';
    await vi.waitFor(() => expect(list).toHaveBeenLastCalledWith('config', '', 'limit'));
    expect(document.querySelector('h1')?.textContent).toBe('Параметры');
    expect(input().value).toBe('limit');
});

it.each([
    ['flags', 'flag', 'Фича-флаги'],
    ['configs', 'config', 'Параметры'],
])('сбрасывает фильтры при нажатии на активную вкладку %s', async (tab, kind, title) => {
    history.replaceState(null, '', `/admin/#${tab}`);
    await import('./main');
    await vi.waitFor(() => expect(list).toHaveBeenCalledWith(kind, '', ''));

    input().value = 'price';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    select().value = 'search';
    select().dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(list).toHaveBeenLastCalledWith(kind, 'search', 'price'));
    const calls = list.mock.calls.length;
    document.querySelector<HTMLAnchorElement>(`.oc-nav__link[href="#${tab}"]`)!.click();

    await vi.waitFor(() => {
        expect(list).toHaveBeenCalledTimes(calls + 1);
        expect(list).toHaveBeenLastCalledWith(kind, '', '');
        expect(input().value).toBe('');
        expect(select().value).toBe('');
    });
    expect(location.hash).toBe(`#${tab}`);
    expect(document.querySelector('h1')?.textContent).toBe(title);
});

it.each([true, false])('не меняет URL после сохранения на покинутой вкладке (размонтирована: %s)', async unmounted => {
    const dialog = HTMLDialogElement.prototype;
    const { showModal, close } = dialog;
    Object.assign(dialog, { showModal: vi.fn(), close: vi.fn() });
    let finish!: () => void;
    vi.mocked(saveEntry).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));

    try {
        history.replaceState(null, '', '/admin/#configs');
        await import('./main');
        await vi.waitFor(() => expect(list).toHaveBeenCalledWith('config', '', ''));
        document.querySelector<HTMLAnchorElement>('.oc-nav__link[href="#flags"]')!.click();
        await vi.waitFor(() => expect(document.querySelector('.oc-board__heading button')?.textContent)
            .toBe('+ Создать фича-флаг'));
        document.querySelector<HTMLButtonElement>('.oc-board__heading button')!.click();
        await vi.waitFor(() => expect(document.querySelector('dialog')).not.toBeNull());
        const name = document.querySelector<HTMLInputElement>('#oc-name')!;
        name.value = 'price_sort';
        name.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await vi.waitFor(() => expect(saveEntry).toHaveBeenCalledWith('flag', {
            name: 'price_sort',
            scope: 'frontend',
            value: { rollout_percent: 0, included_user_ids: [], excluded_user_ids: [] },
        }, undefined));

        if (unmounted) {
            history.back();
            await vi.waitFor(() => expect(document.querySelector('h1')?.textContent).toBe('Параметры'));
        } else {
            // Между сменой URL браузером и событием hashchange ответ уже может прийти.
            history.replaceState({ destination: true }, '', '/admin/#configs');
        }
        const state = history.state;
        const length = history.length;
        const calls = list.mock.calls.length;
        finish();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(location.hash).toBe('#configs');
        expect(history.state).toEqual(state);
        expect(history.length).toBe(length);
        expect(list).toHaveBeenCalledTimes(calls);
        if (!unmounted) window.dispatchEvent(new HashChangeEvent('hashchange'));
        await vi.waitFor(() => expect(document.querySelector('h1')?.textContent).toBe('Параметры'));
    } finally {
        render(document.getElementById('app')!, null);
        Object.assign(dialog, { showModal, close });
    }
});
