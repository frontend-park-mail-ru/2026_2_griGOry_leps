import './categories-page.scss';

import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { CategoryCardFull } from '@/components/category-card-full/category-card-full';
import type { Category } from '@/lib/data';
import { plural } from '@/lib/format';

export const CategoriesPage = ({ categories }: { categories: Category[] }) => (
    <div class="categories-page">
        <Breadcrumbs flush strong items={[{ label: 'Главная', href: '/' }, { label: 'Все категории' }]} />

        <div class="categories-page__head">
            <h1 class="categories-page__title">Все категории</h1>
            <span class="categories-page__count">{`${categories.length} ${plural(categories.length, ['категория', 'категории', 'категорий'])}`}</span>
        </div>

        <div class="categories-page__grid">
            {categories.map((category) => <CategoryCardFull key={category.slug} {...category} />)}
        </div>
    </div>
);
