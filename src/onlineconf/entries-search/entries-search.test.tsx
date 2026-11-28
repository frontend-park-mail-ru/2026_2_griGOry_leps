import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { ApiError } from '@/lib/api';
import { deleteEntry, getEntryHistory, saveEntry, searchEntries, type Entry, type Kind } from '../api';
import { readHash } from '../hash';
import { EntriesSearch } from './entries-search';

vi.mock('../api', async (importOriginal) => ({
    ...await importOriginal<typeof import('../api')>(),
    searchEntries: vi.fn(),
    saveEntry: vi.fn(),
    deleteEntry: vi.fn(),
    getEntryHistory: vi.fn(),
}));

const search = vi.mocked(searchEntries);
const save = vi.mocked(saveEntry);
const remove = vi.mocked(deleteEntry);
const { showModal, close } = HTMLDialogElement.prototype;
let root: HTMLElement;

const mount = (kind: Kind) => render(root, <EntriesSearch key={kind} {...readHash(location.hash)} kind={kind} />);
const flush = () => vi.advanceTimersByTimeAsync(0);
const input = () => root.querySelector<HTMLInputElement>('input[name="name"]')!;
const alert = () => root.querySelector('[role="alert"]');
const enter = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
};
const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const chooseScope = async (label: string) => {
    root.querySelector<HTMLButtonElement>('#onlineconf-scope')!.click();
    await flush();
    [...root.querySelectorAll<HTMLElement>('[role="option"]')].find(option => option.textContent === label)!.click();
    await flush();
};

const priceSort: Entry = {
    id: 3,
    scope: 'search',
    name: 'price_sort',
    kind: 'flag',
    value: { rollout_percent: 25, included_user_ids: [4], excluded_user_ids: [] },
};

beforeEach(() => {
    vi.useFakeTimers();
    search.mockReset().mockResolvedValue([]);
    save.mockReset().mockResolvedValue(undefined);
    remove.mockReset().mockResolvedValue(undefined);
    vi.mocked(getEntryHistory).mockReset().mockResolvedValue([]);
    history.replaceState({}, '', '/admin/');
    root = document.createElement('div');
    document.body.append(root);
});

afterEach(() => {
    render(root, null);
    root.remove();
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    vi.useRealTimers();
});

it('берёт фильтр из URL и обновляет его без новой записи истории', async () => {
    history.replaceState({}, '', '/admin/?tab=1#configs?name=max&scope=web');
    const length = history.length;
    mount('config');
    await flush();

    expect(search).toHaveBeenCalledWith({ kind: 'config', name: 'max' });
    expect(input().value).toBe('max');
    expect(root.querySelector('#onlineconf-scope')?.textContent).toContain('Все скоупы');

    await chooseScope('search');

    expect(search).toHaveBeenLastCalledWith({ kind: 'config', name: 'max', scope: 'search' });
    expect(location.search).toBe('?tab=1');
    expect(location.hash).toBe('#configs?scope=search&name=max');
    expect(history.length).toBe(length);
});

it('ищет через 300 мс после ввода', async () => {
    mount('config');
    await flush();
    search.mockClear();

    enter('a');
    enter('ab');
    enter('abc');
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ kind: 'config', name: 'abc' });
});

it('Enter ищет сразу и отменяет отложенный поиск', async () => {
    mount('flag');
    await flush();
    search.mockClear();

    enter('  sort ');
    submit();
    await flush();
    expect(search).toHaveBeenCalledWith({ kind: 'flag', name: 'sort' });

    await vi.advanceTimersByTimeAsync(1000);
    expect(search).toHaveBeenCalledTimes(1);
});

it('показывает найденные записи с подсветкой', async () => {
    history.replaceState({}, '', '/admin/#flags?name=sort');
    search.mockResolvedValue([priceSort]);
    mount('flag');
    await flush();

    expect(root.textContent).toContain('Найдено 1');
    const row = root.querySelector('li[data-entry-id="3"]')!;
    expect(row.textContent).toContain('search');
    expect(row.textContent).toContain('25% · вкл. 1');
    expect(row.querySelector('mark')?.textContent).toBe('sort');
});

it('различает пустой список и пустой результат', async () => {
    mount('config');
    await flush();
    expect(root.textContent).toContain('Пока нет конфигов');

    render(root, null);
    mount('flag');
    await flush();
    expect(root.textContent).toContain('Пока нет флагов');

    enter('nope');
    submit();
    await flush();
    expect(root.textContent).toContain('Ничего не найдено');
});

it('показывает отсутствие прав и скрывает управление записями', async () => {
    search.mockRejectedValueOnce(new ApiError(403, { reason: 'forbidden' }));
    mount('config');
    await flush();
    expect(alert()?.textContent).toContain('Нет доступа к OnlineConf');
    expect(root.querySelector('form')).toBeNull();
});

it('предлагает войти, если сессия закончилась', async () => {
    search.mockRejectedValueOnce(new ApiError(401, { reason: 'not authenticated' }));
    mount('config');
    await flush();
    expect(alert()?.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(root.textContent).not.toContain('Попробовать ещё раз');
});

it('показывает некорректный фильтр', async () => {
    search.mockRejectedValueOnce(new ApiError(400, { reason: 'invalid filter' }));
    mount('config');
    await flush();
    expect(alert()?.textContent).toBe('Некорректный фильтр');
    expect(root.textContent).not.toContain('Попробовать ещё раз');
});

it('повторяет поиск после ошибки', async () => {
    search.mockRejectedValueOnce(new ApiError(0, { network: true }));
    mount('flag');
    await flush();
    expect(alert()?.textContent).toContain('Не удалось загрузить список');

    search.mockResolvedValueOnce([priceSort]);
    [...root.querySelectorAll('button')].find(button => button.textContent === 'Попробовать ещё раз')!.click();
    await flush();

    expect(search).toHaveBeenCalledTimes(2);
    expect(root.querySelector('li[data-entry-id="3"]')).not.toBeNull();
});

it('не применяет устаревший ответ', async () => {
    let finishFirst!: (entries: Entry[]) => void;
    search.mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve; }));
    search.mockResolvedValueOnce([{ ...priceSort, id: 2, name: 'b' }]);
    mount('flag');
    await flush();

    enter('b');
    await vi.advanceTimersByTimeAsync(300);
    finishFirst([{ ...priceSort, id: 1, name: 'a' }]);
    await flush();

    expect(root.querySelector('li[data-entry-id="2"]')).not.toBeNull();
    expect(root.querySelector('li[data-entry-id="1"]')).toBeNull();
});

it('размонтирование отменяет отложенный поиск', async () => {
    mount('config');
    await flush();
    enter('abc');

    render(root, <div />);
    await vi.advanceTimersByTimeAsync(300);

    expect(search).toHaveBeenCalledTimes(1);
});

it('при смене вкладки сразу убирает записи предыдущего типа', async () => {
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();
    search.mockReturnValueOnce(new Promise(() => {}));

    mount('config');
    await flush();

    expect(search).toHaveBeenLastCalledWith({ kind: 'config' });
    expect(root.querySelector('li[data-entry-id="3"]')).toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Ищем…');
});

it('редактирует найденный флаг и обновляет список с текущим фильтром', async () => {
    Object.assign(HTMLDialogElement.prototype, { showModal: vi.fn(), close: vi.fn() });
    history.replaceState({}, '', '/admin/#flags?scope=search&name=sort');
    search.mockResolvedValue([priceSort]);
    mount('flag');
    await flush();

    root.querySelector<HTMLButtonElement>('.oc-list button')!.click();
    await flush();
    const percent = root.querySelector<HTMLInputElement>('#oc-percent')!;
    expect(percent.value).toBe('25');
    percent.value = '70';
    percent.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();

    expect(save).toHaveBeenCalledWith('flag', {
        scope: 'search', name: 'price_sort',
        value: { rollout_percent: 70, included_user_ids: [4], excluded_user_ids: [] },
    }, 3);
    expect(root.querySelector('dialog')).toBeNull();
    expect(search).toHaveBeenLastCalledWith({ kind: 'flag', scope: 'search', name: 'sort' });
});

it('не убирает список во время поиска и сообщает итог в одном live-регионе', async () => {
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();
    const status = root.querySelector('[role="status"]');
    expect(status?.textContent).toBe('Найдено 1');

    search.mockReturnValueOnce(new Promise(() => {}));
    enter('price');
    submit();
    await flush();

    expect(root.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent).toBe('Ищем…');
    expect(root.querySelector('li[data-entry-id="3"]')).not.toBeNull();
});

const clickButton = (label: string) => [...root.querySelectorAll('button')].find(button => button.textContent === label)!.click();

it('оставляет историю доступной рядом с удалением записи', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();

    clickButton('История');
    await flush();
    expect(getEntryHistory).toHaveBeenCalledWith(priceSort.id);
    expect(root.querySelector('.oc-history')?.textContent).toContain('Изменений пока нет');
    clickButton('Закрыть');
    await flush();
    expect(root.querySelector('.oc-history')).toBeNull();

    clickButton('Удалить');
    await flush();
    expect(root.querySelector('.modal__title')?.textContent).toBe('Удалить фича-флаг?');
    expect(remove).not.toHaveBeenCalled();
});

it('удаляет конфиг после подтверждения и обновляет список', async () => {
    const config: Entry = { id: 5, scope: 'frontend', name: 'limit', kind: 'config', value: 24 };
    search.mockResolvedValueOnce([config]);
    mount('config');
    await flush();

    clickButton('Удалить');
    await flush();
    expect(root.querySelector('.modal__title')?.textContent).toBe('Удалить конфиг?');
    expect(root.querySelector('.modal__description')?.textContent).toContain('«limit»');
    expect(remove).not.toHaveBeenCalled();

    search.mockResolvedValueOnce([]);
    root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.click();
    await flush();

    expect(remove).toHaveBeenCalledWith(5);
    expect(root.querySelector('.modal')).toBeNull();
    expect(root.querySelector('li[data-entry-id="5"]')).toBeNull();
    expect(root.querySelector('.oc-saved')?.textContent).toBe('Запись удалена.');
    expect(search).toHaveBeenCalledTimes(2);
});

it('удаляет фича-флаг с вопросом про флаг', async () => {
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();

    clickButton('Удалить');
    await flush();

    expect(root.querySelector('.modal__title')?.textContent).toBe('Удалить фича-флаг?');
});

it('отмена удаления ничего не удаляет', async () => {
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();

    clickButton('Удалить');
    await flush();
    clickButton('Отмена');
    await flush();

    expect(remove).not.toHaveBeenCalled();
    expect(root.querySelector('.modal')).toBeNull();
    expect(root.querySelector('li[data-entry-id="3"]')).not.toBeNull();
});

it('показывает ошибку удаления и оставляет окно открытым', async () => {
    remove.mockRejectedValueOnce(new ApiError(500, { reason: 'Не удалось выполнить операцию.' }));
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();

    clickButton('Удалить');
    await flush();
    root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.click();
    await flush();

    expect(root.querySelector('.confirm-modal__error')?.textContent).toBe('Не удалось выполнить операцию.');
    expect(root.querySelector('li[data-entry-id="3"]')).not.toBeNull();
    expect(search).toHaveBeenCalledTimes(1);
});

it('если запись уже удалена, закрывает окно и обновляет список', async () => {
    remove.mockRejectedValueOnce(new ApiError(404, { reason: 'Запись не найдена.' }));
    search.mockResolvedValueOnce([priceSort]).mockResolvedValueOnce([]);
    mount('flag');
    await flush();

    clickButton('Удалить');
    await flush();
    root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.click();
    await flush();

    expect(root.querySelector('.modal')).toBeNull();
    expect(root.querySelector('li[data-entry-id="3"]')).toBeNull();
});

it('при отказе в доступе во время удаления показывает «Нет доступа»', async () => {
    remove.mockRejectedValueOnce(new ApiError(403, { reason: 'forbidden' }));
    search.mockResolvedValueOnce([priceSort]);
    mount('flag');
    await flush();

    clickButton('Удалить');
    await flush();
    root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.click();
    await flush();

    expect(alert()?.textContent).toContain('Нет доступа к OnlineConf');
    expect(root.querySelector('.modal')).toBeNull();
});
