import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type AdCard, type Listing } from '@/lib/api';
import { loadListing, loadListingPage, loadSimilar } from '@/app/loaders/listings';

const api = vi.hoisted(() => ({
    getListing: vi.fn(),
    getListings: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const card = (id: number) => ({ id }) as AdCard;
const listing = (overrides: Partial<Listing> = {}) => ({
    id: 3,
    is_owner: false,
    category: { id: 5 },
    ...overrides,
}) as Listing;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('loadListing', () => {
    it('не ходит в API за нечисловым id', async () => {
        await expect(loadListing('abc')).resolves.toBeNull();
        expect(api.getListing).not.toHaveBeenCalled();
    });

    it('на 404 отдаёт null', async () => {
        api.getListing.mockRejectedValue(new ApiError(404));
        await expect(loadListing('3')).resolves.toBeNull();
        expect(api.getListing).toHaveBeenCalledWith(3, false);
    });

    it('остальные ошибки пробрасывает', async () => {
        api.getListing.mockRejectedValue(new ApiError(500));
        await expect(loadListing('3')).rejects.toBeInstanceOf(ApiError);
    });
});

it('учитывает открытие только для выбранного объявления', async () => {
    api.getListing.mockResolvedValue(listing());
    api.getListings.mockResolvedValue({ items: [card(4), card(5)] });
    await loadListingPage({ id: '3' });
    expect(api.getListing.mock.calls).toEqual([[3, true]]);
});

describe('loadSimilar', () => {
    it('похожие без самого объявления и не больше шести', async () => {
        api.getListings.mockResolvedValue({ items: [1, 2, 3, 4, 5, 6, 7].map(card) });

        const similar = await loadSimilar(listing());

        expect(similar.map((item) => item.id)).toEqual([1, 2, 4, 5, 6, 7]);
        expect(api.getListings).toHaveBeenCalledWith({ category_id: 5, limit: 7 });
    });

    it('владельцу и без категории похожие не грузит', async () => {
        await expect(loadSimilar(listing({ is_owner: true }))).resolves.toEqual([]);
        await expect(loadSimilar(listing({ category: null }))).resolves.toEqual([]);
        expect(api.getListings).not.toHaveBeenCalled();
    });

    it('ошибка похожих не ломает страницу', async () => {
        api.getListings.mockRejectedValue(new ApiError(500));
        await expect(loadSimilar(listing())).resolves.toEqual([]);
    });
});
