import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError, type Profile } from '@/lib/api';
import { setUser } from '@/store';
import { VerifyEmailPage, loadVerifyEmail, type VerifyEmailProps } from './verify-email-page';

const api = vi.hoisted(() => ({
    getMe: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    resendVerificationByLink: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const profile: Profile = {
    id: 7,
    email: 'timur@mail.ru',
    first_name: 'Тимур',
    phone: '+79990000000',
    email_verified: false,
    pending_email: null,
    phone_verified: false,
    city: null,
    about: '',
    avatar_url: null,
    rating: 0,
    reviews_count: 0,
    created_at: '2026-10-01T10:00:00Z',
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function open(url: string) {
    history.replaceState({}, '', url);
}

function renderPage(props: VerifyEmailProps) {
    render(root, <VerifyEmailPage {...props} />);
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    setUser(null);
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('loadVerifyEmail', () => {
    it('подтверждает почту по ссылке', async () => {
        open('/verify-email?token=abc');
        api.verifyEmail.mockResolvedValue({ email: 'timur@mail.ru', changed: false });

        const props = await loadVerifyEmail();

        expect(api.verifyEmail).toHaveBeenCalledWith('abc');
        expect(props).toMatchObject({ status: 'verified', email: 'timur@mail.ru', token: 'abc' });
    });

    it('устаревшая ссылка — экран с почтой для новой ссылки', async () => {
        open('/verify-email?token=old');
        api.verifyEmail.mockRejectedValue(new ApiError(400, { field: 'token', email: 'timur@mail.ru' }));

        expect(await loadVerifyEmail()).toMatchObject({ status: 'expired', email: 'timur@mail.ru' });
    });

    it('уже подтверждённая почта и занятая почта', async () => {
        open('/verify-email?token=used');
        api.verifyEmail.mockRejectedValueOnce(new ApiError(409, { reason: 'email already verified' }));
        expect(await loadVerifyEmail()).toMatchObject({ status: 'already' });

        api.verifyEmail.mockRejectedValueOnce(new ApiError(409, { field: 'email', reason: 'email already registered' }));
        expect(await loadVerifyEmail()).toMatchObject({ status: 'taken' });
    });

    it('без ссылки показывает, куда ушло письмо', async () => {
        open('/verify-email?sent=1');
        setUser(profile);
        api.getMe.mockResolvedValue({ ...profile, email_verified: true, pending_email: 'new@mail.ru' });

        expect(await loadVerifyEmail()).toMatchObject({ status: 'pending', email: 'new@mail.ru', emailChange: true, justSent: true });
    });
});

describe('VerifyEmailPage', () => {
    const pending: VerifyEmailProps = { token: '', status: 'pending', email: 'timur@mail.ru', emailChange: false, justSent: true };

    it('после регистрации кнопка ждёт минуту, потом отправляет письмо ещё раз', async () => {
        vi.useFakeTimers();
        setUser(profile);
        api.resendVerification.mockResolvedValue('timur@mail.ru');
        renderPage(pending);
        await vi.advanceTimersByTimeAsync(0);

        expect(root.textContent).toContain('Отправили письмо на timur@mail.ru');
        const button = () => root.querySelector<HTMLButtonElement>('.verify-email-page__actions .button')!;
        expect(button().textContent).toBe('Отправить ещё раз через 1:00');
        expect(button().disabled).toBe(true);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(button().textContent).toBe('Отправить письмо ещё раз');

        button().click();
        await vi.advanceTimersByTimeAsync(0);

        expect(api.resendVerification).toHaveBeenCalled();
        expect(root.textContent).toContain('Письмо отправлено ещё раз');
        expect(button().textContent).toBe('Отправить ещё раз через 1:00');
    });

    it('без входа новая ссылка уходит по старой', async () => {
        api.resendVerificationByLink.mockResolvedValue('timur@mail.ru');
        renderPage({ token: 'old', status: 'expired', email: 'timur@mail.ru', emailChange: false, justSent: false });

        expect(root.textContent).toContain('Отправим новую на timur@mail.ru');
        root.querySelector<HTMLButtonElement>('.verify-email-page__actions .button')!.click();
        await tick();

        expect(api.resendVerificationByLink).toHaveBeenCalledWith('old');
        expect(root.textContent).toContain('Письмо отправлено ещё раз');
    });

    it('при лимите запускает таймер с временем от сервера', async () => {
        setUser(profile);
        api.resendVerification.mockRejectedValue(new ApiError(429, { retryAfter: 42 }));
        renderPage({ ...pending, justSent: false });

        root.querySelector<HTMLButtonElement>('.verify-email-page__actions .button')!.click();
        await tick();

        expect(root.querySelector('.verify-email-page__actions .button')!.textContent).toBe('Отправить ещё раз через 0:42');
    });
});
