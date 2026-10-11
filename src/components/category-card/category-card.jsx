import './category-card.scss';

/**
 * @param {{slug: string, name: string, image: string}} props
 */
export const CategoryCard = ({ slug, name, image }) => (
    <a class="category-card" href={`/category/${slug}`} data-link>
        <div class="category-card__img">
            <img src={image} alt="" loading="lazy" />
        </div>
        <span class="category-card__title">{name}</span>
    </a>
);
