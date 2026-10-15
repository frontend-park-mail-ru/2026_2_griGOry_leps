import './categories-page.scss';

import { CategoryCardFull } from '@/components/category-card-full/category-card-full';
import type { Category } from '@/lib/data';

/** «1 категория», «3 категории», «12 категорий» */
function pluralizeCategories(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return `${count} категория`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} категории`;
    return `${count} категорий`;
}

export const CategoriesPage = ({ categories }: { categories: Category[] }) => (
    <div class="categories-page">
        <nav class="breadcrumbs" aria-label="Хлебные крошки">
            <a href="/" data-link>Главная</a>
            <span class="breadcrumbs__sep" aria-hidden="true">/</span>
            <span>Все категории</span>
        </nav>

        <div class="categories-page__head">
            <h1>Все категории</h1>
            <span class="categories-page__count">{pluralizeCategories(categories.length)}</span>
        </div>

        <div class="categories-page__grid">
            {categories.map((category) => <CategoryCardFull key={category.slug} {...category} />)}
        </div>
    </div>
);
