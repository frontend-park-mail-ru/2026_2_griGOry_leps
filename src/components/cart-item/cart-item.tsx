import { assetUrl, type CartItem as CartItemData } from '@/lib/api';
import { UNAVAILABLE_TEXT, isAvailable } from '@/lib/cart';
import { formatPrice, formatRating } from '@/lib/format';
import './cart-item.scss';

export interface CartItemProps {
    item: CartItemData;
    sellerName: string;
    sellerRating: number;
    selected: boolean;
    disabled: boolean;
    onToggle: (listingId: number, selected: boolean) => void;
    onRemove: (listingId: number) => void;
}

function metaText(item: CartItemData, selected: boolean): string {
    if (!selected) return 'Не выбран, не войдёт в заказ';
    const delivery = item.delivery_from ? `Доставка от ${formatPrice(item.delivery_from)} ₽` : 'Только самовывоз';
    return [item.address, delivery].filter(Boolean).join(' · ');
}

export const CartItem = ({ item, sellerName, sellerRating, selected, disabled, onToggle, onRemove }: CartItemProps) => {
    const available = isAvailable(item);
    const checked = available && selected;
    const title = item.title || 'Объявление удалено';
    const image = assetUrl(item.image_url);
    const classes = ['cart-item'];
    if (!available) classes.push('cart-item--unavailable');

    return (
        <li class={classes.join(' ')}>
            <input
                class="cart-item__check"
                type="checkbox"
                aria-label={`Выбрать «${title}»`}
                checked={checked}
                disabled={!available || disabled}
                onChange={(e: Event) => onToggle(item.listing_id, (e.target as HTMLInputElement).checked)}
            />
            <a class="cart-item__photo" href={`/listing/${item.listing_id}`} data-link tabindex="-1" aria-hidden="true">
                {image && <img class="cart-item__image" src={image} alt="" loading="lazy" />}
            </a>
            <div class="cart-item__body">
                <a class="cart-item__title" href={`/listing/${item.listing_id}`} data-link>{title}</a>
                <span class="cart-item__seller">
                    Продавец: {sellerName} · <span class="cart-item__rating">★ {formatRating(sellerRating)}</span>
                </span>
                {available
                    ? <span class="cart-item__meta">{metaText(item, selected)}</span>
                    : <span class="cart-item__warning">{UNAVAILABLE_TEXT[item.unavailable_reason ?? 'sold']}</span>}
                <button
                    type="button"
                    class="cart-item__remove"
                    disabled={disabled}
                    onClick={() => onRemove(item.listing_id)}
                >Удалить</button>
            </div>
            <span class="cart-item__price">{available && item.price ? `${formatPrice(item.price)} ₽` : '—'}</span>
        </li>
    );
};
