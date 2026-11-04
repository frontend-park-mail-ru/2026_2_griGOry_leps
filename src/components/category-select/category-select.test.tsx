import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'goget-vdom';
import type { CategoryNode } from '@/lib/api';
import { CategorySelect } from './category-select';

const tree: CategoryNode[] = [
    { id: 1, name: 'Электроника', slug: 'e', delivery_allowed: true, children: [
        { id: 11, name: 'Ноутбуки', slug: 'n', delivery_allowed: true, children: [] },
        { id: 12, name: 'Телефоны', slug: 't', delivery_allowed: true, children: [] },
    ] },
    { id: 2, name: 'Недвижимость', slug: 'r', delivery_allowed: true, children: [] },
];

let root: HTMLElement;
const tick = () => new Promise((resolve) => setTimeout(resolve));
const items = () => [...root.querySelectorAll<HTMLButtonElement>('.category-select__item')];
const item = (name: string) => items().find((el) => el.textContent === name)!;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('CategorySelect', () => {
    it('без выбора показывает корни, по клику на раздел открывает следующую колонку', async () => {
        const onChange = vi.fn();
        render(root, <CategorySelect categories={tree} value="" onChange={onChange} />);

        expect(items().map((el) => el.textContent)).toEqual(['Электроника', 'Недвижимость']);

        item('Электроника').click();
        await tick();

        expect(root.querySelectorAll('.category-select__column')).toHaveLength(2);
        expect(onChange).not.toHaveBeenCalled();

        item('Ноутбуки').click();
        expect(onChange).toHaveBeenCalledWith('11');
    });

    it('с выбранной категорией показывает путь, «Изменить» раскрывает колонки до неё', async () => {
        render(root, <CategorySelect categories={tree} value="12" onChange={vi.fn()} />);

        expect(root.querySelector('.category-select__path')?.textContent).toBe('Электроника → Телефоны');
        expect(items()).toHaveLength(0);

        root.querySelector<HTMLButtonElement>('.category-select__change')!.click();
        await tick();

        expect(root.querySelectorAll('.category-select__column')).toHaveLength(2);
        expect(item('Телефоны').classList.contains('category-select__item--active')).toBe(true);
    });

    it('показывает ошибку', () => {
        render(root, <CategorySelect categories={tree} value="" error="Выберите категорию" onChange={vi.fn()} />);

        expect(root.querySelector('.category-select--error')).not.toBeNull();
        expect(root.querySelector('[data-error-for="category_id"]')?.textContent).toBe('Выберите категорию');
    });
});
