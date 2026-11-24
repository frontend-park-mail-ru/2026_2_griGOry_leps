import type { Category } from '@/lib/catalog';
import './category-card-full.scss';

export const CategoryCardFull = ({ slug, name, image, subcategories = [] }: Category) => (
    <article class="category-card-full">
        <header class="category-card-full__head">
            <div class="category-card-full__icon">
                {image && <img class="category-card-full__icon-image" src={image} alt="" loading="lazy" />}
            </div>
            <h3 class="category-card-full__title">{name}</h3>
        </header>

        <ul class="category-card-full__list">
            {subcategories.map((sub) => (
                <li key={sub.slug}>
                    <a class="category-card-full__link" href={`/category/${encodeURIComponent(sub.slug)}`} data-link>
                        {sub.name}
                    </a>
                </li>
            ))}
        </ul>

        <a class="category-card-full__all" href={`/category/${encodeURIComponent(slug)}`} data-link>
            Все объявления →
        </a>
    </article>
);
