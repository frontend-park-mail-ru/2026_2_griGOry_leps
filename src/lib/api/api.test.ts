import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    ApiError, addToCart, approveModerationListing, assetUrl, checkResetToken, createOrder, deleteListing,
    getListing, getMe, getModerationListing, getModerationQueue, login, logout, rejectModerationListing,
    newIdempotencyKey, onSessionExpired, requestPasswordReset, resetCsrfToken, resetPassword, uploadListingPhoto,
} from '.';

interface Call {
    url: string;
    method: string;
    headers: Headers;
    body: unknown;
}

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };

let calls: Call[];
let replies: Array<(call: Call) => Reply | Promise<Reply>>;

function jsonResponse({ status = 200, body, headers }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

beforeEach(() => {
    calls = [];
    replies = [];
    resetCsrfToken();
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
        const call = {
            url: url.replace(/^.*\/api/, ''),
            method: init.method ?? 'GET',
            headers: new Headers(init.headers),
            body: init.body,
        };
        calls.push(call);
        const reply = replies.shift();
        if (!reply) throw new Error(`Нет ответа для ${call.method} ${call.url}`);
        return jsonResponse(await reply(call));
    }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const csrf = (token: string) => () => ({ body: { csrf_token: token } });
const ok = (body: unknown = { status: 'ok' }) => () => ({ body });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('модерация', () => {
    it('загружает очередь и карточку объявления', async () => {
        replies.push(ok({ items: [{ id: 31, title: 'Велосипед', revision: 2 }], limit: 20 }));
        replies.push(ok({ listing: { id: 31, title: 'Велосипед', photos: [] }, revision: 2 }));

        const queue = await getModerationQueue();
        const detail = await getModerationListing(queue.items[0].id);

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'GET /admin/moderation/listings?after_id=0&limit=20',
            'GET /admin/moderation/listings/31',
        ]);
        expect(detail.revision).toBe(2);
    });

    it('передаёт текущую ревизию и причину отклонения', async () => {
        replies.push(csrf('moderator'), () => ({ status: 204 }), () => ({ status: 204 }));

        await approveModerationListing(31, 2);
        await rejectModerationListing(32, 4, 'Исправьте описание');

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'GET /csrf',
            'POST /admin/moderation/listings/31/approve',
            'POST /admin/moderation/listings/32/reject',
        ]);
        expect(JSON.parse(calls[1].body as string)).toEqual({ revision: 2 });
        expect(JSON.parse(calls[2].body as string)).toEqual({ revision: 4, reason: 'Исправьте описание' });
        expect(calls[2].headers.get('X-CSRF-Token')).toBe('moderator');
    });

    it('передаёт конфликт ревизий вызывающему коду', async () => {
        replies.push(csrf('moderator'), () => ({ status: 409, body: { error: 'listing changed' } }));

        await expect(approveModerationListing(31, 1)).rejects.toMatchObject({ status: 409 });
    });
});

describe('CSRF', () => {
    it('GET уходит без токена и без запроса /csrf', async () => {
        replies.push(ok({ id: 1, title: 'Велосипед' }));

        await getListing(1);

        expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /listings/1']);
        expect(calls[0].headers.has('X-CSRF-Token')).toBe(false);
    });

    it('перед изменяющим запросом получает токен и кладёт его в заголовок', async () => {
        replies.push(csrf('t1'), ok({ items_count: 1 }));

        await addToCart(5);

        expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /csrf', 'POST /cart/items']);
        expect(calls[1].headers.get('X-CSRF-Token')).toBe('t1');
        expect(calls[1].headers.get('Content-Type')).toBe('application/json');
    });

    it('переиспользует токен для следующих запросов', async () => {
        replies.push(csrf('t1'), ok({ items_count: 1 }), ok({ items_count: 2 }));

        await addToCart(5);
        await addToCart(6);

        expect(calls.filter((c) => c.url === '/csrf')).toHaveLength(1);
        expect(calls[2].headers.get('X-CSRF-Token')).toBe('t1');
    });

    it('параллельные запросы ждут один и тот же токен', async () => {
        replies.push(csrf('t1'), ok({ items_count: 1 }), ok({ items_count: 2 }));

        await Promise.all([addToCart(5), addToCart(6)]);

        expect(calls.filter((c) => c.url === '/csrf')).toHaveLength(1);
    });

    it('после входа сбрасывает токен — он привязан к сессии', async () => {
        replies.push(csrf('guest'), ok({ id: 1 }), csrf('user'), ok({ items_count: 1 }));

        await login({ login: 'a@b.ru', password: 'Secret123' });
        await addToCart(5);

        expect(calls[1].headers.get('X-CSRF-Token')).toBe('guest');
        expect(calls[3].headers.get('X-CSRF-Token')).toBe('user');
    });

    it('после выхода тоже сбрасывает токен', async () => {
        replies.push(csrf('user'), ok(), csrf('guest'), ok({ id: 1 }));

        await logout();
        await login({ login: 'a@b.ru', password: 'Secret123' });

        expect(calls[3].headers.get('X-CSRF-Token')).toBe('guest');
    });

    it('токен, загруженный до сброса, не кешируется и не отдаётся новым запросам', async () => {
        let answerOld!: () => void;
        replies.push(() => new Promise<Reply>((resolve) => {
            answerOld = () => resolve({ body: { csrf_token: 'old' } });
        }));
        replies.push(csrf('new'), ok({ items_count: 1 }), ok({ items_count: 2 }), ok({ items_count: 3 }));

        const first = addToCart(1);
        await flush();
        resetCsrfToken();
        const second = addToCart(2);
        await flush();
        answerOld();
        await Promise.all([first, second]);
        await addToCart(3);

        const tokens = calls.filter((c) => c.url === '/cart/items').map((c) => c.headers.get('X-CSRF-Token'));
        expect(tokens.sort()).toEqual(['new', 'new', 'old']);
        expect(calls.filter((c) => c.url === '/csrf')).toHaveLength(2);
    });

    it('если бэк отверг токен, берёт новый и повторяет запрос один раз', async () => {
        replies.push(
            csrf('old'),
            () => ({ status: 403, body: { error: 'invalid csrf token' } }),
            csrf('new'),
            () => ({ status: 204 }),
        );

        await deleteListing(7);

        expect(calls.map((c) => `${c.method} ${c.url}`))
            .toEqual(['GET /csrf', 'DELETE /listings/7', 'GET /csrf', 'DELETE /listings/7']);
        expect(calls[3].headers.get('X-CSRF-Token')).toBe('new');
    });

    it('не повторяет запрос при обычном 403 (не автор)', async () => {
        replies.push(csrf('t1'), () => ({ status: 403, body: { error: 'forbidden' } }));

        await expect(deleteListing(7)).rejects.toMatchObject({ status: 403, reason: 'forbidden' });
        expect(calls).toHaveLength(2);
    });

    it('если бэк ещё без CSRF (/csrf — 404), шлёт запрос без токена', async () => {
        replies.push(() => ({ status: 404, body: { error: 'not found' } }), ok({ id: 1 }));

        await login({ login: 'a@b.ru', password: 'Secret123' });

        expect(calls[1].headers.has('X-CSRF-Token')).toBe(false);
    });
});

describe('запросы', () => {
    it('getMe возвращает null для гостя', async () => {
        replies.push(() => ({ status: 401, body: { error: 'not authenticated' } }));
        await expect(getMe()).resolves.toBeNull();
    });

    it('ошибка бэка превращается в ApiError с полем, текстом и подробностями', async () => {
        replies.push(csrf('t1'), () => ({
            status: 409,
            body: { error: 'listing has active order', order_id: 77, order_number: 10245 },
        }));

        const err = await deleteListing(1).catch((e) => e);

        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ status: 409, reason: 'listing has active order', orderId: 77, orderNumber: 10245 });
    });

    it('фото уходит как multipart без JSON-заголовка', async () => {
        replies.push(csrf('t1'), ok({ id: 501, url: '/u/1.jpg', thumb_url: '/u/1_thumb.jpg' }));

        const photo = await uploadListingPhoto(new Blob(['x'], { type: 'image/jpeg' }));

        expect(photo.id).toBe(501);
        expect(calls[1].body).toBeInstanceOf(FormData);
        expect(calls[1].headers.has('Content-Type')).toBe(false);
    });

    it('createOrder передаёт Idempotency-Key', async () => {
        replies.push(csrf('t1'), ok({ id: 1 }));

        await createOrder({
            listing_ids: [1],
            delivery: { by_seller: [] },
            recipient: { first_name: 'Анна', phone: '+79990000000' },
            payment_method: 'card',
        }, 'key-1');

        expect(calls[1].headers.get('Idempotency-Key')).toBe('key-1');
        expect(calls[1].headers.get('X-CSRF-Token')).toBe('t1');
    });

    it('ключ идемпотентности работает и без crypto.randomUUID, как на http', () => {
        vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
        try {
            const key = newIdempotencyKey();
            expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            expect(newIdempotencyKey()).not.toBe(key);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('лимит запросов', () => {
    it('429 — ApiError со временем из Retry-After', async () => {
        replies.push(csrf('t1'), () => ({ status: 429, body: { error: 'too many requests' }, headers: { 'Retry-After': '42' } }));

        const err = await login({ login: 'a@b.ru', password: 'Secret123' }).catch((e: unknown) => e);

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(429);
        expect((err as ApiError).retryAfter).toBe(42);
    });

    it('без Retry-After время неизвестно', async () => {
        replies.push(csrf('t1'), () => ({ status: 429, body: { error: 'too many requests' } }));

        const err = await login({ login: 'a@b.ru', password: 'Secret123' }).catch((e: unknown) => e);

        expect((err as ApiError).retryAfter).toBe(0);
    });
});

describe('восстановление пароля', () => {
    it('запрос ссылки отправляет логин с CSRF-токеном', async () => {
        replies.push(csrf('t1'), ok());

        await requestPasswordReset('+79990000001');

        expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /csrf', 'POST /password/forgot']);
        expect(calls[1].headers.get('X-CSRF-Token')).toBe('t1');
        expect(JSON.parse(calls[1].body as string)).toEqual({ login: '+79990000001' });
    });

    it('проверка ссылки отдаёт email аккаунта', async () => {
        replies.push(ok({ email: 'anna@goget.pw' }));

        await expect(checkResetToken('abc&x')).resolves.toBe('anna@goget.pw');
        expect(calls[0].url).toBe('/password/reset?token=abc%26x');
    });

    it('устаревшая ссылка — ApiError с полем token', async () => {
        replies.push(() => ({ status: 400, body: { error: 'invalid or expired token', field: 'token' } }));

        const err = await checkResetToken('old').catch((e: unknown) => e);

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).field).toBe('token');
    });

    it('после смены пароля CSRF-токен запрашивается заново', async () => {
        replies.push(csrf('t1'), ok(), csrf('t2'), ok({ items_count: 1 }));

        await resetPassword('abc', 'NewPass123');
        await addToCart(1);

        expect(JSON.parse(calls[1].body as string)).toEqual({ token: 'abc', password: 'NewPass123' });
        expect(calls[3].headers.get('X-CSRF-Token')).toBe('t2');
    });
});

describe('assetUrl', () => {
    it('достраивает относительную ссылку до адреса бэка', () => {
        expect(assetUrl('/uploads/avatars/a.png')).toBe('http://localhost:8080/uploads/avatars/a.png');
    });

    it('оставляет статику фронта на адресе фронта', () => {
        expect(assetUrl('/img/listings/sofa.jpg')).toBe('/img/listings/sofa.jpg');
    });

    it('не трогает полную ссылку и пустое значение', () => {
        expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
        expect(assetUrl(null)).toBeNull();
        expect(assetUrl('')).toBeNull();
    });
});

describe('протухшая сессия', () => {
    const expired = () => ({ status: 401, body: { error: 'not authenticated' } });

    it('сообщает, когда бэк не узнал сессию', async () => {
        const listener = vi.fn();
        onSessionExpired(listener);
        replies.push(expired);

        await expect(getMe()).resolves.toBeNull();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('ловит и изменяющие запросы', async () => {
        const listener = vi.fn();
        onSessionExpired(listener);
        replies.push(csrf('t1'), expired);

        await expect(addToCart(3)).rejects.toMatchObject({ status: 401 });

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('неверный пароль при входе — не протухшая сессия', async () => {
        const listener = vi.fn();
        onSessionExpired(listener);
        replies.push(csrf('t1'), () => ({ status: 401, body: { error: 'invalid credentials' } }));

        await expect(login({ login: 'a@b.ru', password: 'x' })).rejects.toMatchObject({ status: 401 });

        expect(listener).not.toHaveBeenCalled();
    });
});
