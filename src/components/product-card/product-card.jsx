import './product-card.scss';

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
});

/**
 * @param {(string|number)} price Например, "15000.00"
 * @returns {string} «15 000»
 */
function formatPrice(price) {
    const value = Number(String(price).replace(/\s/g, '').replaceAll(',', '.'));
    return Number.isFinite(value) ? priceFormatter.format(value) : String(price);
}

/**
 * Карточка объявления в ленте.
 * @param {Object} props
 * @param {number} [props.id]
 * @param {string} props.title
 * @param {(string|number)} props.price
 * @param {string} [props.image_url]
 * @param {boolean} [props.has_delivery]
 */
export const ProductCard = ({ id, title, price, image_url: imageUrl, has_delivery: hasDelivery }) => (
    <article class="product-card" data-ad-id={id}>
        <div class="product-card__img">
            {imageUrl && <img src={imageUrl} alt={title} loading="lazy" />}
        </div>
        <div class="product-card__body">
            <div class="product-card__price-row">
                <span class="product-card__price">{formatPrice(price)} ₽</span>
                {hasDelivery && (
                    <span class="product-card__delivery">
                        <img src="/img/truck.svg" alt="" aria-hidden="true" />
                        Доставка
                    </span>
                )}
            </div>
            <h3 class="product-card__title">{title}</h3>
        </div>
    </article>
);
