import { expect, it, vi } from 'vitest';
import { listEntries } from './api';

vi.mock('./api', async (importOriginal) => ({
    ...await importOriginal<typeof import('./api')>(),
    listEntries: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/api', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/api')>(),
    getMe: vi.fn().mockRejectedValue(new Error('нет сессии')),
}));

const list = vi.mocked(listEntries);
const select = () => document.querySelector<HTMLSelectElement>('.oc-filters select')!;
const input = () => document.querySelector<HTMLInputElement>('.oc-filters input[type="search"]')!;

it('держит вкладку и фильтры в решётке', async () => {
    history.replaceState(null, '', '/admin/#flags?scope=search&name=sort');
    document.body.innerHTML = '<div id="app"></div>';
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
