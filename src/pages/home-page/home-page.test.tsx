import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import { HomePage } from './home-page';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

const categories = [
    { slug: 'auto', name: 'Авто', image: '/img/categories/auto.jpg', subcategories: [] },
    { slug: 'pets', name: 'Животные', image: '/img/categories/pets.jpg', subcategories: [] },
];

describe('HomePage', () => {
    it('оборачивает каждую карточку карусели в элемент home-section__item', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[]} user={null} />);

        expect(root.querySelectorAll('.home-categories > .home-section__item > .category-card')).toHaveLength(2);
        expect(root.querySelectorAll('.home-products--empty > .home-section__item > .empty-state')).toHaveLength(1);
    });

    it('размечает заголовки секций и иконки стрелок элементами блоков', () => {
        render(root, <HomePage categories={categories} promos={[]} products={[]} user={null} />);

        expect(root.querySelector('.home-section__title')?.textContent).toBe('Выберите категорию');
        expect(root.querySelectorAll('.arrow__icon')).toHaveLength(4);
    });
});
