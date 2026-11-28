import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/lib/api';
import { searchEntries, type Entry } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/api')>(),
    request: vi.fn(),
}));

const send = vi.mocked(request);
const entry: Entry = { id: 3, scope: 'search', name: 'price_sort', kind: 'flag', value: true };

beforeEach(() => {
    send.mockReset();
});

it('ищет записи по типу, скоупу и названию', async () => {
    // Формат как у GET /v1/entries сервиса OnlineConf (PR #60): массив записей.
    send.mockResolvedValueOnce(new Response(JSON.stringify([entry])));

    await expect(searchEntries({ kind: 'flag', scope: 'search', name: 'sort' })).resolves.toEqual([entry]);
    expect(send).toHaveBeenCalledWith('/onlineconf/admin/entries?kind=flag&scope=search&name=sort', { cache: 'no-store' });
});

it('не передаёт пустое название и скоуп', async () => {
    send.mockResolvedValueOnce(new Response(JSON.stringify([])));

    await expect(searchEntries({ kind: 'config', name: '' })).resolves.toEqual([]);
    expect(send).toHaveBeenCalledWith('/onlineconf/admin/entries?kind=config', { cache: 'no-store' });
});

it('отклоняется ApiError при отказе в доступе', async () => {
    send.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }));

    const error = await searchEntries({ kind: 'config' }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
});

it('сохраняет текст ошибки OnlineConf', async () => {
    send.mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: 'invalid_request', message: 'Недопустимые параметры запроса.' } }),
        { status: 400 },
    ));

    const error = await searchEntries({ kind: 'config', name: 'x' }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, reason: 'Недопустимые параметры запроса.' });
});
