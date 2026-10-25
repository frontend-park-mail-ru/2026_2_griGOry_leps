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

        expect(root.firstElementChild).toMatchSnapshot();
    });

    it('добавляет модификатор flush', () => {
        render(root, <Breadcrumbs flush items={[{ label: 'Главная', href: '/' }]} />);

        expect(root.firstElementChild).toMatchSnapshot();
    });

    it('с strong добавляет модификатор', () => {
        render(root, <Breadcrumbs strong flush items={[{ label: 'Главная', href: '/' }, { label: 'Все категории' }]} />);

        expect(root.firstElementChild?.className).toBe('breadcrumbs breadcrumbs--flush breadcrumbs--strong');
    });
});
