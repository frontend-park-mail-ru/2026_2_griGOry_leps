import { assetUrl, type AdCard } from '@/lib/api';
import { formatPosted, formatPrice } from '@/lib/format';
import './product-card.scss';

const HeartIcon = () => (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
        <path d="M10 16.7 3.9 10.6a3.75 3.75 0 0 1 5.3-5.3l.8.8.8-.8a3.75 3.75 0 0 1 5.3 5.3L10 16.7Z" />
    </svg>
);

export const ProductCard = ({
    id, title, price, is_free: isFree, image_url: imageUrl, has_delivery: hasDelivery, city, created_at: createdAt,
}: AdCard) => {
    const src = assetUrl(imageUrl);
    const meta = [city, createdAt ? formatPosted(createdAt) : ''].filter(Boolean).join(' · ');

    return (
        <article class="product-card" data-ad-id={id}>
            <div class="product-card__img">
                {src && <img class="product-card__photo" src={src} alt={title} loading="lazy" />}
                <button type="button" class="product-card__favorite" aria-label="В избранное" disabled>
                    <HeartIcon />
                </button>
            </div>
            <div class="product-card__body">
                <div class="product-card__price-row">
                    <span class="product-card__price">{isFree ? 'Даром' : `${formatPrice(price)} ₽`}</span>
                    {hasDelivery && (
                        <span class="product-card__delivery">
                            <img src="/img/truck.svg" alt="" aria-hidden="true" />
                            Доставка
                        </span>
                    )}
                </div>
                <h3 class="product-card__title">{title}</h3>
                {meta && <p class="product-card__meta">{meta}</p>}
            </div>
        </article>
    );
};
