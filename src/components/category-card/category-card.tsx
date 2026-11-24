import type { Category } from '@/lib/catalog';
import './category-card.scss';

export const CategoryCard = ({ slug, name, image }: Category) => (
    <a class="category-card" href={`/category/${encodeURIComponent(slug)}`} data-link>
        <div class="category-card__img">
            {image && <img class="category-card__photo" src={image} alt="" loading="lazy" />}
        </div>
        <span class="category-card__title">{name}</span>
    </a>
);
