import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError } from '@/lib/api';
import { AvatarUploader } from './avatar-uploader';

const api = vi.hoisted(() => ({ uploadAvatar: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const user = { id: 7, first_name: 'иван', email: 'ivan@example.com', avatar_url: null };

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function chooseFile(file: File) {
    const input = root.querySelector<HTMLInputElement>('.avatar-uploader__file')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
    vi.clearAllMocks();
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('AvatarUploader', () => {
    it('показывает букву, кнопку и подсказку', () => {
        render(root, <AvatarUploader user={user} onUploaded={() => {}} />);

        expect(root.querySelector('.avatar-uploader__avatar')?.textContent).toBe('И');
        expect(root.querySelector('.avatar-uploader__button')?.textContent).toBe('Изменить фото');
        expect(root.querySelector('.avatar-uploader__hint')?.textContent).toBe('JPG или PNG, до 5 МБ');
    });

    it('загружает фото и отдаёт новую ссылку', async () => {
        const onUploaded = vi.fn();
        api.uploadAvatar.mockResolvedValue({ avatar_url: '/uploads/avatars/7.png' });
        render(root, <AvatarUploader user={user} onUploaded={onUploaded} />);

        chooseFile(new File(['png'], 'a.png', { type: 'image/png' }));
        await tick();

        expect(api.uploadAvatar).toHaveBeenCalledTimes(1);
        expect(onUploaded).toHaveBeenCalledWith('/uploads/avatars/7.png');
    });

    it('не отправляет файл не того формата', async () => {
        render(root, <AvatarUploader user={user} onUploaded={() => {}} />);

        chooseFile(new File(['gif'], 'a.gif', { type: 'image/gif' }));
        await tick();

        expect(api.uploadAvatar).not.toHaveBeenCalled();
        expect(root.querySelector('.avatar-uploader__hint--error')?.textContent).toBe('Можно загрузить только JPG или PNG');
    });

    it('показывает ошибку бэка', async () => {
        api.uploadAvatar.mockRejectedValue(new ApiError(413));
        render(root, <AvatarUploader user={user} onUploaded={() => {}} />);

        chooseFile(new File(['png'], 'a.png', { type: 'image/png' }));
        await tick();

        expect(root.querySelector('.avatar-uploader__hint--error')?.textContent).toBe('Файл больше 5 МБ. Выберите фото поменьше');
    });
});
