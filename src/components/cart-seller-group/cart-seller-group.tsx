import { CartItem } from '@/components/cart-item/cart-item';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import type { Cart } from '@/lib/api';
import { formatRating } from '@/lib/format';
import './cart-seller-group.scss';

export interface CartSellerGroupProps {
    group: Cart['groups'][number];
    unselected: ReadonlySet<number>;
    disabled: boolean;
    onToggle: (listingId: number, selected: boolean) => void;
    onRemove: (listingId: number) => void;
}

export const CartSellerGroup = ({ group, unselected, disabled, onToggle, onRemove }: CartSellerGroupProps) => {
    const { seller } = group;

    return (
        <section class="cart-seller-group" aria-label={`Продавец ${seller.first_name}`}>
            <div class="cart-seller-group__head">
                <UserAvatar user={{ ...seller, email: '' }} class="cart-seller-group__avatar" />
                <span class="cart-seller-group__name">{seller.first_name}</span>
                <span class="cart-seller-group__rating">· ★ {formatRating(seller.rating)}</span>
            </div>
            <ul class="cart-seller-group__items">
                {group.items.map((item) => (
                    <CartItem
                        key={item.listing_id}
                        item={item}
                        sellerName={seller.first_name}
                        sellerRating={seller.rating}
                        selected={!unselected.has(item.listing_id)}
                        disabled={disabled}
                        onToggle={onToggle}
                        onRemove={onRemove}
                    />
                ))}
            </ul>
        </section>
    );
};
