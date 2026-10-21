import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import { Breadcrumbs } from './breadcrumbs';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('Breadcrumbs', () => {
    it('рисует ссылки, текущую страницу и разделители между ними', () => {
        render(root, <Breadcrumbs items={[
            { label: 'Главная', href: '/' },
            { label: 'Все категории', href: '/categories' },
            { label: 'Авто' },
        ]} />);

        expect(root.innerHTML).toBe(
            '<nav class="breadcrumbs" aria-label="Хлебные крошки">'
            + '<a class="breadcrumbs__link" href="/" data-link="">Главная</a>'
            + '<span class="breadcrumbs__sep" aria-hidden="true">/</span>'
            + '<a class="breadcrumbs__link" href="/categories" data-link="">Все категории</a>'
            + '<span class="breadcrumbs__sep" aria-hidden="true">/</span>'
            + '<span aria-current="page">Авто</span>'
            + '</nav>',
        );
    });

    it('добавляет модификатор flush', () => {
        render(root, <Breadcrumbs flush items={[{ label: 'Главная', href: '/' }]} />);

        expect(root.querySelector('nav')?.className).toBe('breadcrumbs breadcrumbs--flush');
    });
});
