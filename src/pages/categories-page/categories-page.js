import template from './categories-page.hbs';
import './categories-page.scss';

import { CategoryCardFull } from '@/components/category-card-full/category-card-full.js';
import { getCategories } from '@/lib/api.js';

export const CategoriesPage = async (root) => {
    const categories = await getCategories();
    const cardsHtml = categories.map(CategoryCardFull).join('');

    root.innerHTML = template({
        countText: pluralizeCategories(categories.length),
        cardsHtml,
    });
};

function pluralizeCategories(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return `${count} категория`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} категории`;
    return `${count} категорий`;
}
