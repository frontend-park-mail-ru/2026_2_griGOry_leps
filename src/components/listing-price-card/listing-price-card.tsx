import { Button } from '@/components/button/button';
import { ListingCard } from '@/components/listing-card/listing-card';
import type { Listing } from '@/lib/api';
import { STATUS_LABELS, priceText } from '@/lib/listing';
import './listing-price-card.scss';

export interface ListingPriceCardProps {
    listing: Listing;
    busy: boolean;
    cartError: string;
    onAddToCart: () => void;
    onBuyNow: () => void;
    onClose: () => void;
    onDelete: () => void;
}

export const ListingPriceCard = ({ listing, busy, cartError, onAddToCart, onBuyNow, onClose, onDelete }: ListingPriceCardProps) => {
    const negotiable = listing.is_negotiable && !listing.is_free;

    return (
        <ListingCard class="listing-price-card">
            {listing.is_owner && (
                <span class={`listing-price-card__status listing-price-card__status--${listing.status}`}>
                    {STATUS_LABELS[listing.status]}
                </span>
            )}
            <span class="listing-price-card__price">{priceText(listing)}</span>
            {(negotiable || listing.has_delivery) && (
                <div class="listing-price-card__tags">
                    {negotiable && <span class="listing-price-card__tag">Торг уместен</span>}
                    {listing.has_delivery && (
                        <span class="listing-price-card__tag listing-price-card__tag--delivery">Доставка</span>
                    )}
                </div>
            )}

            {listing.is_owner ? (
                <div class="listing-price-card__actions">
                    {listing.status !== 'sold' && (
                        <a href={`/listing/${listing.id}/edit`} data-link class="listing-price-card__link">Редактировать</a>
                    )}
                    {listing.status === 'active' && (
                        <Button text="Снять с продажи" variant="secondary" block disabled={busy} onClick={onClose} />
                    )}
                    <Button text="Удалить" variant="secondary" block disabled={busy} onClick={onDelete} />
                </div>
            ) : listing.status === 'active' && (
                <div class="listing-price-card__actions">
                    <Button text="Купить сейчас" block disabled={busy} onClick={onBuyNow} />
                    {listing.in_cart
                        ? <a href="/cart" data-link class="listing-price-card__to-cart">✓ Перейти в корзину</a>
                        : (
                            <button type="button" class="listing-price-card__to-cart" disabled={busy} onClick={onAddToCart}>
                                Добавить в корзину
                            </button>
                        )}
                    {cartError && <p class="listing-price-card__error" role="alert">{cartError}</p>}
                </div>
            )}
        </ListingCard>
    );
};
