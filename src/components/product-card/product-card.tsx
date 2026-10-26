import { assetUrl, type AdCard } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import './product-card.scss';

export const ProductCard = ({ id, title, price, is_free: isFree, image_url, has_delivery: hasDelivery }: AdCard) => {
    const imageUrl = assetUrl(image_url);

    return (
        <article class="product-card" data-ad-id={id}>
            <div class="product-card__img">
                {imageUrl && <img class="product-card__photo" src={imageUrl} alt={title} loading="lazy" />}
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
            </div>
        </article>
    );
};
