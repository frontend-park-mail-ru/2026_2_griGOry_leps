import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (orig) => ({
    ...await orig<typeof import('@/lib/api')>(),
    getSearchSettings: vi.fn(),
}));
vi.mock('@/lib/core', async (orig) => ({
    ...await orig<typeof import('@/lib/core')>(),
    logWarn: vi.fn(),
}));

vi.mock('@/lib/user', () => ({ getUser: vi.fn().mockReturnValue(null) }));

let store: typeof import('./settings');
let api: { getSearchSettings: ReturnType<typeof vi.fn> };

beforeEach(async () => {
    vi.resetModules();
    const { getUser } = await import('@/lib/user');
    vi.mocked(getUser).mockReturnValue(null);
    store = await import('./settings');
    const imported = await import('@/lib/api');
    api = { getSearchSettings: vi.mocked(imported.getSearchSettings).mockReset() };
});

it('до первой загрузки — null', () => {
    expect(store.searchSettings()).toBeNull();
});

it('склеивает параллельные вызовы и делает новый запрос после завершения', async () => {
    api.getSearchSettings.mockResolvedValue({ max_query_length: 5, price_sort_enabled: true });
    await Promise.all([store.refreshSearchSettings(), store.refreshSearchSettings()]);
    expect(api.getSearchSettings).toHaveBeenCalledTimes(1);
    await store.refreshSearchSettings();
    expect(api.getSearchSettings).toHaveBeenCalledTimes(2);
});

it.each([
    [{ max_query_length: 0, price_sort_enabled: true }, { max_query_length: null, price_sort_enabled: true }],
    [{ max_query_length: -1, price_sort_enabled: true }, { max_query_length: null, price_sort_enabled: true }],
    [{ max_query_length: 1.5, price_sort_enabled: true }, { max_query_length: null, price_sort_enabled: true }],
    [{ max_query_length: '100', price_sort_enabled: true }, { max_query_length: null, price_sort_enabled: true }],
    [{ max_query_length: 100, price_sort_enabled: 'true' }, { max_query_length: 100, price_sort_enabled: false }],
    [null, { max_query_length: null, price_sort_enabled: false }],
])('нормализует %j', async (raw, expected) => {
    api.getSearchSettings.mockResolvedValue(raw as never);
    await store.refreshSearchSettings();
    expect(store.searchSettings()).toEqual(expected);
});

it('первая ошибка — осторожные значения, повторная — прежнее значение', async () => {
    api.getSearchSettings.mockRejectedValueOnce(new Error('network'));
    await expect(store.refreshSearchSettings()).resolves.toBeUndefined();
    expect(store.searchSettings()).toEqual(store.CAUTIOUS_SEARCH_SETTINGS);

    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 7, price_sort_enabled: true });
    await store.refreshSearchSettings();
    api.getSearchSettings.mockRejectedValueOnce(new Error('network'));
    await store.refreshSearchSettings();
    expect(store.searchSettings()).toEqual({ max_query_length: 7, price_sort_enabled: true });
});

it('уведомляет подписчиков только при изменении', async () => {
    const fn = vi.fn();
    store.subscribeSearchSettings(fn);
    api.getSearchSettings.mockResolvedValue({ max_query_length: 7, price_sort_enabled: true });
    await store.refreshSearchSettings();
    await store.refreshSearchSettings();
    expect(fn).toHaveBeenCalledTimes(1);
});

it('queryLength считает кодовые точки после trim', () => {
    expect(store.queryLength('  🚲 вел  ')).toBe(5);
});

it('возвращает тот же промис во время запроса', async () => {
    let answer!: (value: unknown) => void;
    api.getSearchSettings.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    const first = store.refreshSearchSettings();
    expect(store.refreshSearchSettings()).toBe(first);
    answer({ max_query_length: 5, price_sort_enabled: true });
    await first;
});

it.each([null, [], 'broken', {}])('кривое тело %j сохраняет последнее значение и пишет предупреждение', async raw => {
    const { logWarn } = await import('@/lib/core');
    vi.mocked(logWarn).mockClear();
    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 7, price_sort_enabled: true });
    await store.refreshSearchSettings();
    api.getSearchSettings.mockResolvedValueOnce(raw);
    await expect(store.refreshSearchSettings()).resolves.toBeUndefined();
    expect(store.searchSettings()).toEqual({ max_query_length: 7, price_sort_enabled: true });
    expect(logWarn).toHaveBeenCalled();
});

it('отписка прекращает уведомления', async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeSearchSettings(listener);
    unsubscribe();
    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 7, price_sort_enabled: true });
    await store.refreshSearchSettings();
    expect(listener).not.toHaveBeenCalled();
});

const signedInUser = {
    id: 7, first_name: 'Иван', email: 'ivan@example.com',
    phone: '+79990000000', email_verified: true,
};

it('смена пользователя сразу скрывает настройки предыдущей сессии', async () => {
    const { getUser } = await import('@/lib/user');
    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 5, price_sort_enabled: false });
    await store.refreshSearchSettings();
    vi.mocked(getUser).mockReturnValue(signedInUser);
    expect(store.searchSettings()).toBeNull();
    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 20, price_sort_enabled: true });
    await store.refreshSearchSettings();
    expect(store.searchSettings()).toEqual({ max_query_length: 20, price_sort_enabled: true });
});

it('запрос новой сессии не склеивается со старым и старый ответ не перезаписывает настройки', async () => {
    const { getUser } = await import('@/lib/user');
    let answerOld!: (value: unknown) => void;
    let answerNew!: (value: unknown) => void;
    api.getSearchSettings
        .mockImplementationOnce(() => new Promise(resolve => { answerOld = resolve; }))
        .mockImplementationOnce(() => new Promise(resolve => { answerNew = resolve; }));
    const oldRequest = store.refreshSearchSettings();
    vi.mocked(getUser).mockReturnValue(signedInUser);
    const newRequest = store.refreshSearchSettings();
    expect(newRequest).not.toBe(oldRequest);
    expect(api.getSearchSettings).toHaveBeenCalledTimes(2);
    answerOld({ max_query_length: 5, price_sort_enabled: false });
    await oldRequest;
    expect(store.searchSettings()).toBeNull();
    expect(store.refreshSearchSettings()).toBe(newRequest);
    answerNew({ max_query_length: 20, price_sort_enabled: true });
    await newRequest;
    expect(store.searchSettings()).toEqual({ max_query_length: 20, price_sort_enabled: true });
});

it.each([false, true])('старый ответ после новых настроек (ошибка: %s) не меняет новую сессию', async fail => {
    const { getUser } = await import('@/lib/user');
    let answerOld!: (value: unknown) => void;
    let rejectOld!: (error: unknown) => void;
    api.getSearchSettings.mockImplementationOnce(() => new Promise((resolve, reject) => {
        answerOld = resolve;
        rejectOld = reject;
    }));
    const oldRequest = store.refreshSearchSettings();
    vi.mocked(getUser).mockReturnValue(signedInUser);
    api.getSearchSettings.mockResolvedValueOnce({ max_query_length: 20, price_sort_enabled: true });
    const newRequest = store.refreshSearchSettings();
    expect(api.getSearchSettings).toHaveBeenCalledTimes(2);
    await newRequest;
    if (fail) rejectOld(new Error('old network error'));
    else answerOld({ max_query_length: 5, price_sort_enabled: false });
    await oldRequest;
    expect(store.searchSettings()).toEqual({ max_query_length: 20, price_sort_enabled: true });
});
