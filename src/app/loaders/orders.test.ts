import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { loadCheckout } from '@/app/loaders/orders';

const api = vi.hoisted(() => ({
    getCheckoutQuote: vi.fn(),
    getOrder: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

beforeEach(() => {
    vi.clearAllMocks();
    history.replaceState(null, '', '/checkout?ids=3,5');
});

describe('loadCheckout', () => {
    it('на 403 email not verified просит подтвердить почту', async () => {
        api.getCheckoutQuote.mockRejectedValue(new ApiError(403, { reason: 'email not verified' }));

        await expect(loadCheckout()).resolves.toEqual({ problem: 'unverified' });
        expect(api.getCheckoutQuote).toHaveBeenCalledWith([3, 5]);
    });

    it('другой 403 не прячет', async () => {
        api.getCheckoutQuote.mockRejectedValue(new ApiError(403, { reason: 'invalid csrf token' }));

        await expect(loadCheckout()).rejects.toBeInstanceOf(ApiError);
    });
});
