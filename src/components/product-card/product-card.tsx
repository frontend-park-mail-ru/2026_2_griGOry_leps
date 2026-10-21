import type { AdCard } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import './product-card.scss';

export type ProductCardProps = AdCard & {
    meta?: string;
    link?: boolean;
};

export const ProductCard = ({
    id, title, price, is_free: isFree, image_url: imageUrl, has_delivery: hasDelivery, meta, link = true,
}: ProductCardProps) => {
    const content = [
        <div class="product-card__img">
            {imageUrl && <img src={imageUrl} alt={title} loading="lazy" />}
        </div>,
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
        </div>,
    ];

    return link
        ? <a href={`/listing/${id}`} data-link class="product-card" data-ad-id={id}>{content}</a>
        : <div class="product-card">{content}</div>;
};
