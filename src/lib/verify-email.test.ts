import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { resendVerificationEmail } from '@/lib/verify-email';

const api = vi.hoisted(() => ({ resendVerification: vi.fn() }));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));
vi.mock('@/lib/toast', () => toast);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('resendVerificationEmail', () => {
    it('отправляет письмо сразу и говорит, куда', async () => {
        api.resendVerification.mockResolvedValue('ivan@mail.ru');

        await resendVerificationEmail();

        expect(toast.showToast).toHaveBeenCalledWith('Отправили письмо на ivan@mail.ru. Перейдите по ссылке и вернитесь к заказу');
    });

    it('при ошибке показывает её', async () => {
        api.resendVerification.mockRejectedValue(new ApiError(0, { network: true }));

        await resendVerificationEmail();

        expect(toast.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
});
