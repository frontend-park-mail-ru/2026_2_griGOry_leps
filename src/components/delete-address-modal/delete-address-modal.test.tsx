import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import { DeleteAddressModal } from './delete-address-modal';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('DeleteAddressModal', () => {
    it('называет удаляемый адрес', () => {
        render(root, (
            <DeleteAddressModal
                address={{ id: 1, street: 'Москва, ул. Тверская', house: 'д. 12, кв. 34', comment: '', is_default: true }}
                pending={false}
                error=""
                onConfirm={() => {}}
                onClose={() => {}}
            />
        ));

        expect(root.querySelector('.modal__title')?.textContent).toBe('Удалить адрес?');
        expect(root.querySelector('.modal__description')?.textContent)
            .toBe('«Москва, ул. Тверская, д. 12, кв. 34» пропадёт из списка адресов доставки.');
        expect(root.querySelector('.confirm-modal__confirm')?.textContent).toBe('Удалить');
    });
});
