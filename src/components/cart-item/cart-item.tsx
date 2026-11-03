import { assetUrl, type CartItem as CartItemData } from '@/lib/api';
import { UNAVAILABLE_TEXT, isAvailable } from '@/lib/cart';
import { formatPrice, formatRating } from '@/lib/core';
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
    const deleted = item.unavailable_reason === 'deleted';
    const title = deleted ? 'Объявление удалено' : item.title || 'Без названия';
    const image = assetUrl(item.image_url);
    const href = `/listing/${item.listing_id}`;
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
            {deleted ? (
                <span class="cart-item__photo cart-item__photo--empty" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <circle cx="9" cy="10" r="1.5" />
                        <path d="M21 16l-5-5-9 9" />
                        <path d="M3 3l18 18" />
                    </svg>
                </span>
            ) : (
                <a class="cart-item__photo" href={href} data-link tabindex="-1" aria-hidden="true">
                    {image && <img class="cart-item__image" src={image} alt="" loading="lazy" />}
                </a>
            )}
            <div class="cart-item__body">
                {deleted
                    ? <span class="cart-item__title">{title}</span>
                    : <a class="cart-item__title" href={href} data-link>{title}</a>}
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
