import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ConfirmModal } from './confirm-modal';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('ConfirmModal', () => {
    it('рисует заголовок, описание и две кнопки', () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();
        render(root, (
            <ConfirmModal
                title="Удалить адрес?"
                description="Адрес пропадёт из списка."
                confirmLabel="Удалить"
                pending={false}
                error=""
                onConfirm={onConfirm}
                onClose={onClose}
            />
        ));

        expect(root.querySelector('.modal__title')?.textContent).toBe('Удалить адрес?');
        expect(root.querySelector('.modal__description')?.textContent).toBe('Адрес пропадёт из списка.');
        expect(root.querySelector('.confirm-modal__confirm')?.textContent).toBe('Удалить');
        expect(root.querySelector('.confirm-modal__cancel')?.textContent).toBe('Отмена');

        root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.click();
        root.querySelector<HTMLButtonElement>('.confirm-modal__cancel')!.click();
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('блокирует кнопки во время запроса и показывает ошибку', () => {
        render(root, (
            <ConfirmModal
                title="Удалить адрес?"
                description="Адрес пропадёт из списка."
                confirmLabel="Удалить"
                pending
                error="Не удалось удалить адрес. Попробуйте ещё раз"
                onConfirm={() => {}}
                onClose={() => {}}
            />
        ));

        expect(root.querySelector<HTMLButtonElement>('.confirm-modal__confirm')!.disabled).toBe(true);
        expect(root.querySelector<HTMLButtonElement>('.confirm-modal__cancel')!.disabled).toBe(true);
        expect(root.querySelector('.confirm-modal__error')?.textContent).toBe('Не удалось удалить адрес. Попробуйте ещё раз');
    });
});
