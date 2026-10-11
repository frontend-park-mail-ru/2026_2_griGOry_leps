import './promo-card.scss';

/**
 * @param {{title: string, subtitle: string, image: string}} props
 */
export const PromoCard = ({ title, subtitle, image }) => (
    <div class="promo-card">
        <h3 class="promo-card__title">{title}</h3>
        <p class="promo-card__subtitle">{subtitle}</p>
        <img src={image} alt="" loading="lazy" class="promo-card__img" />
    </div>
);
