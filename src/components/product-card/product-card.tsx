import type { AdCard } from '@/lib/api';
import './product-card.scss';

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
});

function formatPrice(price: string | number): string {
    const value = Number(String(price).replace(/\s/g, '').replaceAll(',', '.'));
    return Number.isFinite(value) ? priceFormatter.format(value) : String(price);
}

export const ProductCard = ({ id, title, price, image_url: imageUrl, has_delivery: hasDelivery }: AdCard) => (
    <article class="product-card" data-ad-id={id}>
        <div class="product-card__img">
            {imageUrl && <img class="product-card__photo" src={imageUrl} alt={title} loading="lazy" />}
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
