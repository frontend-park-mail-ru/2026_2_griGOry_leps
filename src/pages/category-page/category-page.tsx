import './category-page.scss';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { CategoryNames } from '@/lib/data';

export const CategoryPage = ({ slug }: { slug: string }) => {
    const name = CategoryNames[slug] ?? 'Неизвестная категория';

    return (
        <div class="category-page">
            <Breadcrumbs items={[
                { label: 'Главная', href: '/' },
                { label: 'Все категории', href: '/categories' },
                { label: name },
            ]} />

            <section class="category-page__section">
                <h1>{name}</h1>
                <p>Здесь будут объявления категории «{name}».</p>
            </section>
        </div>
    );
};
