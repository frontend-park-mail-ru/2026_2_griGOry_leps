import template from './categories-page.hbs';
import './categories-page.scss';

import { CategoryCardFull } from '@/components/category-card-full/category-card-full.js';
import { getCategories } from '@/lib/api.js';

export const CategoriesPage = async (root) => {
    const categories = await getCategories();
    const cardsHtml = categories.map(CategoryCardFull).join('');

    root.innerHTML = template({
        count: categories.length,
        cardsHtml,
    });
};
