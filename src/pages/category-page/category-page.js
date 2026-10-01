import template from './category-page.hbs';
import './category-page.scss';
import { CategoryNames } from '@/lib/data.js';

export const CategoryPage = (root) => (params) => {
    const name = CategoryNames[params.slug] ?? 'Неизвестная категория';

    root.innerHTML = template({ name });
};
