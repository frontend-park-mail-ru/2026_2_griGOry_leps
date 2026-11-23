import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { ApiError, type Profile } from '@/lib/api';
import { ModerationPage } from './moderation-page';

const api = vi.hoisted(() => ({
    getMyListingsCount: vi.fn(), getModerationQueue: vi.fn(), getModerationListing: vi.fn(), decideModeration: vi.fn(),
}));

vi.mock('@/lib/api', async (original) => ({
    ...(await original<typeof import('@/lib/api')>()),
    ...api,
}));

const profile: Profile = {
    id: 3, is_moderator: true, email: 'moderator@example.com', first_name: 'Иван', phone: '',
    email_verified: true, pending_email: null, phone_verified: false, city: null, about: '',
    avatar_url: null, rating: 0, reviews_count: 0, created_at: '2026-11-01T10:00:00Z',
};
const requested = '2026-11-21T10:00:00Z';
const item = { id: 7, title: 'Гитара', price: '9500.00', requested_at: requested };
const snapshot = {
    listing: { ...item, photos: [{ id: 1, url: '/uploads/listings/guitar.jpg' }],
        seller: { id: 4, first_name: 'Мария' }, description: 'В хорошем состоянии', city: 'Москва', is_free: false },
    revision: 3,
    requested_at: requested,
};

let root: HTMLDivElement;

const show = (isModerator = true) => render(root, (
    <ModerationPage profile={{ ...profile, is_moderator: isModerator }} onLogout={async () => {}} />
));

function button(label: string, scope: ParentNode = root): HTMLButtonElement {
    const control = [...scope.querySelectorAll('button')].find((el) => el.textContent === label);
    expect(control).toBeDefined();
    return control!;
}

beforeEach(() => {
    vi.resetAllMocks();
    root = document.createElement('div');
    document.body.appendChild(root);
    api.getMyListingsCount.mockResolvedValue(0);
    api.getModerationQueue.mockResolvedValue({ items: [item], next_cursor: null });
    api.getModerationListing.mockResolvedValue(snapshot);
});

afterEach(() => {
    render(root, null);
    root.remove();
});

describe('ModerationPage', () => {
    it('показывает отсутствие доступа и не запрашивает очередь у обычного пользователя', () => {
        show(false);
        expect(root.textContent).toContain('нет доступа к модерации');
        expect(root.querySelector('a[href="/profile/moderation"]')).toBeNull();
        expect(api.getModerationQueue).not.toHaveBeenCalled();
    });

    it('требует причину и передаёт версию объявления при отклонении', async () => {
        api.decideModeration.mockResolvedValue(undefined);
        show();
        await vi.waitFor(() => expect(root.textContent).toContain('В хорошем состоянии'));
        button('Отклонить').click();
        await vi.waitFor(() => expect(root.querySelector('[role="dialog"]')).not.toBeNull());

        const dialog = root.querySelector('[role="dialog"]')!;
        const confirm = button('Отклонить', dialog);
        expect(confirm.disabled).toBe(true);
        const reason = dialog.querySelector('textarea')!;
        reason.value = '  Добавьте общий план  ';
        reason.dispatchEvent(new Event('input', { bubbles: true }));
        await vi.waitFor(() => expect(button('Отклонить', dialog).disabled).toBe(false));
        button('Отклонить', dialog).click();

        await vi.waitFor(() => expect(root.textContent).toContain('Новых объявлений пока нет'));
        expect(api.decideModeration).toHaveBeenCalledWith(7, 3, 'Добавьте общий план');
        expect(api.getModerationQueue).toHaveBeenCalledTimes(1);
        expect(root.querySelector('[role="dialog"]')).toBeNull();
    });

    it('после одобрения удаляет заявку из видимой очереди и открывает соседнюю', async () => {
        const next = { ...item, id: 8, title: 'Палатка' };
        api.getModerationQueue.mockResolvedValue({ items: [item, next], next_cursor: null });
        api.getModerationListing.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({
            ...snapshot, listing: { ...snapshot.listing, ...next, description: 'Палатка на троих' },
        });
        api.decideModeration.mockResolvedValue(undefined);
        show();
        await vi.waitFor(() => expect(root.textContent).toContain('В хорошем состоянии'));
        const queue = root.querySelector('[aria-label="Очередь объявлений"]');
        expect(queue).not.toBeNull();
        button('Одобрить').click();

        await vi.waitFor(() => expect(root.textContent).toContain('Палатка на троих'));
        expect(root.querySelector('[aria-label="Очередь объявлений"]')).toBe(queue);
        expect(queue?.textContent).not.toContain('Гитара');
        expect(api.getModerationQueue).toHaveBeenCalledTimes(1);
    });

    it('после последней видимой заявки догружает очередь с текущего курсора', async () => {
        const next = { ...item, id: 8, title: 'Палатка' };
        api.getModerationQueue.mockResolvedValueOnce({ items: [item], next_cursor: 'next-page' })
            .mockResolvedValueOnce({ items: [next], next_cursor: null });
        api.getModerationListing.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({
            ...snapshot, listing: { ...snapshot.listing, ...next, description: 'Палатка на троих' },
        });
        api.decideModeration.mockResolvedValue(undefined);
        show();
        await vi.waitFor(() => expect(root.textContent).toContain('В хорошем состоянии'));
        button('Одобрить').click();

        await vi.waitFor(() => expect(root.textContent).toContain('Палатка на троих'));
        expect(api.getModerationQueue).toHaveBeenNthCalledWith(2, 'next-page');
    });

    it('убирает ссылку на оригинал, когда у выбранного фото нет адреса', async () => {
        api.getModerationListing.mockResolvedValueOnce({
            ...snapshot,
            listing: { ...snapshot.listing, photos: [...snapshot.listing.photos, { id: 2, url: '' }] },
        });
        show();
        await vi.waitFor(() => expect(root.querySelector('.listing-gallery__original')?.getAttribute('href')).toMatch(/\/guitar\.jpg$/));
        root.querySelector<HTMLButtonElement>('[aria-label="Следующее фото"]')!.click();

        await vi.waitFor(() => expect(root.querySelector('.listing-gallery__original')).toBeNull());
        expect(root.querySelector('.listing-gallery__empty')?.textContent).toBe('Нет фото');
    });

    it('после конфликта открывает новую версию и не повторяет решение автоматически', async () => {
        api.getModerationListing.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({
            ...snapshot, revision: 4, listing: { ...snapshot.listing, description: 'Описание изменилось' },
        });
        api.decideModeration.mockRejectedValueOnce(new ApiError(409));
        show();
        await vi.waitFor(() => expect(root.textContent).toContain('В хорошем состоянии'));
        button('Одобрить').click();

        await vi.waitFor(() => expect(root.textContent).toContain('Описание изменилось'));
        expect(root.textContent).toContain('его уже проверили');
        expect(api.decideModeration).toHaveBeenCalledTimes(1);
        expect(api.decideModeration).toHaveBeenCalledWith(7, 3, undefined);
    });
});
