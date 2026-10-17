import './category-page.scss';
import { CategoryNames } from '@/lib/data';

export const CategoryPage = ({ slug }: { slug: string }) => {
    const name = CategoryNames[slug] ?? 'Неизвестная категория';

    return (
        <div class="category-page">
            <nav class="breadcrumbs" aria-label="Хлебные крошки">
                <a href="/" data-link>Главная</a>
                <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                <a href="/categories" data-link>Все категории</a>
                <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                <span>{name}</span>
            </nav>

            <section class="category-page__section">
                <h1>{name}</h1>
                <p>Здесь будут объявления категории «{name}».</p>
            </section>
        </div>
    );
};
