import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import { DeleteListingModal } from './delete-listing-modal';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

const noop = () => {};

describe('DeleteListingModal', () => {
    it('подставляет «Без названия», если название пустое', () => {
        render(root, <DeleteListingModal title="" pending={false} error="" onConfirm={noop} onClose={noop} />);
        expect(root.querySelector('.modal__description')?.textContent).toContain('«Без названия»');
    });

    it('показывает название объявления', () => {
        render(root, <DeleteListingModal title="Диван" pending={false} error="" onConfirm={noop} onClose={noop} />);
        expect(root.querySelector('.modal__description')?.textContent).toContain('«Диван»');
    });
});
