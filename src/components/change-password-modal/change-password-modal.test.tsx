import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError } from '@/lib/api';
import { ChangePasswordModal } from './change-password-modal';

const api = vi.hoisted(() => ({
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;
let onChanged: ReturnType<typeof vi.fn>;

function query<T extends HTMLElement>(selector: string): T {
    const el = root.querySelector<T>(selector);
    expect(el).not.toBeNull();
    return el!;
}

function type(selector: string, value: string) {
    const input = query<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function fillForm(current: string) {
    type('#change-password-current', current);
    type('#change-password-new', 'NewPass123');
    type('#change-password-repeat', 'NewPass123');
}

async function submit() {
    query<HTMLFormElement>('#change-password-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();
}

beforeEach(() => {
    vi.clearAllMocks();
    onChanged = vi.fn();
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
    render(root, <ChangePasswordModal email="ivan@example.com" onChanged={onChanged} onClose={() => {}} />);
});

describe('ChangePasswordModal', () => {
    it('меняет пароль и сообщает об успехе', async () => {
        api.changePassword.mockResolvedValue(undefined);

        fillForm('OldPass123');
        await submit();

        expect(api.changePassword).toHaveBeenCalledWith({ current_password: 'OldPass123', new_password: 'NewPass123' });
        expect(onChanged).toHaveBeenCalled();
    });

    it('неверный текущий пароль показывает ошибку под полем', async () => {
        api.changePassword.mockRejectedValue(new ApiError(400, { field: 'current_password', reason: 'wrong current password' }));

        fillForm('Wrong1234');
        await submit();

        expect(onChanged).not.toHaveBeenCalled();
        expect(root.textContent).toContain('Неверный текущий пароль');
    });

    it('не отправляет форму, если пароли не совпадают', async () => {
        type('#change-password-current', 'OldPass123');
        type('#change-password-new', 'NewPass123');
        type('#change-password-repeat', 'NewPass124');
        await submit();

        expect(api.changePassword).not.toHaveBeenCalled();
        expect(root.textContent).toContain('Пароли не совпадают');
    });

    it('«Забыли текущий пароль?» отправляет ссылку на почту профиля', async () => {
        api.requestPasswordReset.mockResolvedValue(undefined);

        query<HTMLButtonElement>('.change-password-modal__forgot').click();
        await tick();
        expect(root.textContent).toContain('Отправим ссылку для сброса пароля на ivan@example.com');

        query<HTMLButtonElement>('.change-password-modal__confirm').click();
        await tick();

        expect(api.requestPasswordReset).toHaveBeenCalledWith('ivan@example.com');
        expect(root.textContent).toContain('Проверьте почту');
    });

    it('при превышении лимита показывает время ожидания', async () => {
        api.requestPasswordReset.mockRejectedValue(new ApiError(429, { reason: 'too many requests', retryAfter: 120 }));

        query<HTMLButtonElement>('.change-password-modal__forgot').click();
        await tick();
        query<HTMLButtonElement>('.change-password-modal__confirm').click();
        await tick();

        expect(root.textContent).toContain('Слишком много попыток. Попробуйте через 2 минуты');
    });
});
