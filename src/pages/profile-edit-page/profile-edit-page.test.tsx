import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError, type Profile } from '@/lib/api';
import { AVATAR_COLORS, getAvatarColor } from '@/components/user-avatar/user-avatar';
import { ProfileEditPage } from './profile-edit-page';

const api = vi.hoisted(() => ({
    getMe: vi.fn(),
    cancelEmailChange: vi.fn(),
    resendVerification: vi.fn(),
    getCities: vi.fn(),
    getMyListingsCount: vi.fn(),
    getAddresses: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const profile: Profile = {
    id: 7,
    email: 'ivan@example.com',
    first_name: 'иван',
    phone: '+79990000000',
    email_verified: true,
    pending_email: null,
    phone_verified: true,
    city: { id: 1, name: 'Москва' },
    about: 'Продаю вещи после переезда',
    avatar_url: null,
    rating: 4.9,
    reviews_count: 12,
    created_at: '2024-03-05T10:00:00Z',
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function renderPage(data: Profile = profile) {
    render(root, <ProfileEditPage profile={data} onLogout={async () => {}} />);
}

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

async function submit() {
    query<HTMLButtonElement>('.profile-edit__save').click();
    await tick();
}

function chooseFile(file: File) {
    const input = query<HTMLInputElement>('.avatar-uploader__file');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
    vi.clearAllMocks();
    api.getCities.mockResolvedValue([{ id: 1, name: 'Москва' }, { id: 2, name: 'Казань' }]);
    api.getMyListingsCount.mockResolvedValue(4);
    api.getAddresses.mockResolvedValue([
        { id: 1, street: 'Москва, ул. Тверская', house: 'д. 12, кв. 34', comment: '', is_default: true },
    ]);
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('ProfileEditPage', () => {
    it('заполняет форму данными профиля и показывает букву вместо фото', async () => {
        renderPage();
        await tick();

        expect(query<HTMLInputElement>('#profile-first-name').value).toBe('иван');
        expect(query<HTMLInputElement>('#profile-phone').value).toBe('+79990000000');
        expect(query('#profile-city').textContent).toBe('Москва');
        expect(query('#profile-about ~ .textarea-field__counter').textContent).toBe('26 / 500');
        expect(query('.profile-sidebar__menu-item--active').textContent).toBe('Настройки');
        expect(query('.profile-sidebar__menu-count').textContent).toBe('4');

        const avatar = query('.avatar-uploader__avatar');
        expect(avatar.textContent).toBe('И');
        expect(avatar.style.backgroundColor).not.toBe('');
    });

    it('сохраняет изменения и показывает уведомление', async () => {
        api.updateProfile.mockResolvedValue({ ...profile, first_name: 'Пётр', city: { id: 2, name: 'Казань' } });
        renderPage();
        await tick();

        type('#profile-first-name', '  Пётр  ');
        query<HTMLButtonElement>('#profile-city').click();
        await tick();
        [...root.querySelectorAll<HTMLElement>('.select__option')].find((el) => el.textContent === 'Казань')!.click();
        await tick();
        await submit();

        expect(api.updateProfile).toHaveBeenCalledWith({
            first_name: 'Пётр',
            phone: '+79990000000',
            email: 'ivan@example.com',
            about: 'Продаю вещи после переезда',
            city_id: 2,
        });
        expect(query('.toast--success .toast__icon').textContent).toBe('✓');
        expect(query('.toast--success .toast__message').textContent).toBe('Изменения сохранены');
        expect(query('.profile-sidebar__name').textContent).toBe('Пётр');
        expect(query<HTMLInputElement>('#profile-first-name').value).toBe('Пётр');
    });

    it('блокирует кнопку, пока профиль сохраняется', async () => {
        api.updateProfile.mockReturnValue(new Promise(() => {}));
        renderPage();
        await tick();

        await submit();

        const save = query<HTMLButtonElement>('.profile-edit__save');
        expect(save.disabled).toBe(true);
        expect(save.textContent).toBe('Сохраняем…');
        expect(query<HTMLButtonElement>('.profile-edit__cancel').disabled).toBe(true);
    });

    it('прячет уведомление через 4 секунды', async () => {
        vi.useFakeTimers();
        try {
            api.updateProfile.mockResolvedValue(profile);
            renderPage();
            await vi.advanceTimersByTimeAsync(0);

            query<HTMLButtonElement>('.profile-edit__save').click();
            await vi.advanceTimersByTimeAsync(0);
            expect(root.querySelector('.toast--success')).not.toBeNull();

            await vi.advanceTimersByTimeAsync(3999);
            expect(root.querySelector('.toast--success')).not.toBeNull();

            await vi.advanceTimersByTimeAsync(1);
            expect(root.querySelector('.toast')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('не отправляет форму с ошибками и подсвечивает поля', async () => {
        renderPage();
        await tick();

        type('#profile-first-name', '');
        type('#profile-email', 'ivan@');
        await submit();

        expect(api.updateProfile).not.toHaveBeenCalled();
        expect(query('[data-error-for="first_name"]').textContent).toBe('Введите имя');
        expect(query('[data-error-for="email"]').textContent).toBe('Введите корректный email');
        expect(root.querySelector('.toast')).toBeNull();
    });

    it('показывает ошибку бэка под полем', async () => {
        api.updateProfile.mockRejectedValue(new ApiError(409, { field: 'email', reason: 'email is taken' }));
        renderPage();
        await tick();

        await submit();

        expect(query('[data-error-for="email"]').textContent).toBe('Этот email уже занят другим пользователем');
    });

    it('показывает уведомление об ошибке сервера', async () => {
        api.updateProfile.mockRejectedValue(new ApiError(500));
        renderPage();
        await tick();

        await submit();

        expect(query('.toast--error .toast__icon').textContent).toBe('!');
        expect(query('.toast--error .toast__message').textContent).toBe('Не удалось сохранить изменения. Попробуйте ещё раз');
        expect(query('.toast--error').getAttribute('role')).toBe('alert');
        expect(query<HTMLButtonElement>('.profile-edit__save').disabled).toBe(false);
        expect(query<HTMLInputElement>('#profile-first-name').value).toBe('иван');
    });

    it('показывает уведомление, если нет связи с сервером', async () => {
        api.updateProfile.mockRejectedValue(new ApiError(0, { network: true }));
        renderPage();
        await tick();

        await submit();

        expect(query('.toast--error .toast__message').textContent).toBe('Нет соединения с сервером. Проверьте интернет');
    });

    it('после ошибки повторное сохранение заменяет уведомление на успешное', async () => {
        api.updateProfile.mockRejectedValueOnce(new ApiError(500)).mockResolvedValueOnce(profile);
        renderPage();
        await tick();

        await submit();
        expect(root.querySelector('.toast--error')).not.toBeNull();

        await submit();
        expect(root.querySelector('.toast--error')).toBeNull();
        expect(root.querySelectorAll('.toast')).toHaveLength(1);
        expect(query('.toast--success .toast__message').textContent).toBe('Изменения сохранены');
    });

    it('«Отмена» возвращает исходные значения', async () => {
        renderPage();
        await tick();

        type('#profile-first-name', 'Другое имя');
        query<HTMLButtonElement>('.profile-edit__cancel').click();
        await tick();

        expect(query<HTMLInputElement>('#profile-first-name').value).toBe('иван');
    });

    it('загружает новую аватарку', async () => {
        api.uploadAvatar.mockResolvedValue({ avatar_url: '/uploads/avatar.png' });
        renderPage();
        await tick();

        chooseFile(new File(['png'], 'avatar.png', { type: 'image/png' }));
        await tick();

        expect(api.uploadAvatar).toHaveBeenCalledTimes(1);
        expect(query<HTMLImageElement>('img.avatar-uploader__avatar').getAttribute('src')).toBe('http://localhost:8080/uploads/avatar.png');
        expect(query<HTMLImageElement>('img.profile-sidebar__avatar').getAttribute('src')).toBe('http://localhost:8080/uploads/avatar.png');
    });

    it('не загружает файл неподходящего формата', async () => {
        renderPage();
        await tick();

        chooseFile(new File(['gif'], 'avatar.gif', { type: 'image/gif' }));
        await tick();

        expect(api.uploadAvatar).not.toHaveBeenCalled();
        expect(query('.avatar-uploader__hint--error').textContent).toBe('Можно загрузить только JPG или PNG');
    });
});

describe('ProfileEditPage: город и адреса', () => {
    it('открывает список городов и отмечает выбранный', async () => {
        renderPage();
        await tick();

        const control = query<HTMLButtonElement>('#profile-city');
        control.click();
        await tick();

        expect(control.getAttribute('aria-expanded')).toBe('true');
        expect(root.querySelectorAll('.select__option')).toHaveLength(2);
        expect(query('.select__option--selected').textContent).toBe('Москва');
        expect(root.querySelector('.select__option--selected .select__check')).not.toBeNull();

        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await tick();

        expect(root.querySelector('.select__list')).toBeNull();
        expect(control.textContent).toBe('Казань');
    });

    it('закрывает список по Escape и по клику мимо', async () => {
        renderPage();
        await tick();

        const control = query<HTMLButtonElement>('#profile-city');
        control.click();
        await tick();
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await tick();
        expect(root.querySelector('.select__list')).toBeNull();

        control.click();
        await tick();
        document.body.click();
        await tick();
        expect(root.querySelector('.select__list')).toBeNull();
        expect(control.textContent).toBe('Москва');
    });

    it('показывает основной адрес и ведёт на страницу адресов', async () => {
        renderPage();
        await tick();

        const sections = [...root.querySelectorAll('.profile-edit__section')];
        const addresses = sections.find((el) => el.textContent?.includes('Адреса доставки'))!;
        expect(addresses.querySelector('.profile-edit__section-caption')?.textContent)
            .toBe('Москва, ул. Тверская, д. 12, кв. 34 (основной)');
        expect(addresses.querySelector('a.profile-edit__section-action')?.getAttribute('href')).toBe('/profile/addresses');
    });

    it('предлагает добавить адрес, если адресов нет', async () => {
        api.getAddresses.mockResolvedValue([]);
        renderPage();
        await tick();

        expect(root.textContent).toContain('Пока нет сохранённых адресов');
        expect(query('a.profile-edit__section-action').textContent).toBe('Добавить адрес');
    });
});

describe('ProfileEditPage: ошибки загрузки фото', () => {
    it('показывает ошибку бэка, если файл слишком большой', async () => {
        api.uploadAvatar.mockRejectedValue(new ApiError(413));
        renderPage();
        await tick();

        chooseFile(new File(['png'], 'avatar.png', { type: 'image/png' }));
        await tick();

        expect(query('.avatar-uploader__hint--error').textContent).toBe('Файл больше 5 МБ. Выберите фото поменьше');
        expect(query('.avatar-uploader__avatar').textContent).toBe('И');
    });

    it('не отправляет файл больше 5 МБ', async () => {
        renderPage();
        await tick();

        const file = new File(['png'], 'big.png', { type: 'image/png' });
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
        chooseFile(file);
        await tick();

        expect(api.uploadAvatar).not.toHaveBeenCalled();
        expect(query('.avatar-uploader__hint--error').textContent).toBe('Файл больше 5 МБ. Выберите фото поменьше');
    });
});

describe('getAvatarColor', () => {
    it('даёт один и тот же цвет из палитры для одного пользователя', () => {
        expect(getAvatarColor(7)).toBe(getAvatarColor(7));
        expect(AVATAR_COLORS).toContain(getAvatarColor(123));
        expect(AVATAR_COLORS.length).toBeLessThanOrEqual(10);
    });

    it('показывает, что новая почта ждёт подтверждения, и отменяет смену', async () => {
        const pending = { ...profile, pending_email: 'new@example.com' };
        api.cancelEmailChange.mockResolvedValue(undefined);
        api.getMe.mockResolvedValue(profile);
        renderPage(pending);
        await tick();

        expect(query<HTMLInputElement>('#profile-email').value).toBe('new@example.com');
        expect(root.textContent).toContain('Подтвердите новую почту: отправили письмо на new@example.com');
        expect(root.textContent).toContain('уведомления приходят на ivan@example.com');

        const cancel = [...root.querySelectorAll<HTMLButtonElement>('.profile-edit__email-action')].find((b) => b.textContent?.includes('Отменить'));
        cancel!.click();
        await tick();
        await tick();

        expect(api.cancelEmailChange).toHaveBeenCalled();
        expect(query<HTMLInputElement>('#profile-email').value).toBe('ivan@example.com');
        expect(root.querySelector('.alert-banner')).toBeNull();
    });

    it('просит подтвердить почту и отправляет письмо ещё раз', async () => {
        api.resendVerification.mockResolvedValue('ivan@example.com');
        renderPage({ ...profile, email_verified: false });
        await tick();

        expect(root.textContent).toContain('Подтвердите почту: отправили письмо на ivan@example.com');
        query<HTMLButtonElement>('.profile-edit__email-action').click();
        await tick();

        expect(api.resendVerification).toHaveBeenCalled();
        expect(root.textContent).toContain('Отправили письмо на ivan@example.com');
    });

    it('после подтверждения новой почты показывает подсказку', async () => {
        history.replaceState({}, '', '/profile/edit?email=confirmed');
        renderPage();
        await tick();

        expect(query('.profile-edit__email-confirmed').textContent).toContain('Почта подтверждена');
        history.replaceState({}, '', '/');
    });
});
