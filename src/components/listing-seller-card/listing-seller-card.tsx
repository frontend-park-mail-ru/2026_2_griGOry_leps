import { ListingCard } from '@/components/listing-card/listing-card';
import type { SellerShort } from '@/lib/api';
import { plural } from '@/lib/format';
import './listing-seller-card.scss';

export const ListingSellerCard = ({ seller }: { seller: SellerShort }) => {
    const initials = seller.first_name.trim().slice(0, 2).toUpperCase();
    const since = new Date(seller.created_at).getFullYear();
    const reviews = seller.reviews_count;

    return (
        <ListingCard class="listing-seller-card" label="Продавец">
            <div class="listing-seller-card__avatar">
                {seller.avatar_url ? <img src={seller.avatar_url} alt="" /> : initials}
            </div>
            <div class="listing-seller-card__info">
                <span class="listing-seller-card__name">{seller.first_name}</span>
                <span class="listing-seller-card__rating">
                    {reviews > 0
                        ? `★ ${seller.rating.toFixed(1)} · ${reviews} ${plural(reviews, ['отзыв', 'отзыва', 'отзывов'])}`
                        : 'Пока нет отзывов'}
                </span>
                {Number.isFinite(since) && <span class="listing-seller-card__since">На GoGET с {since}</span>}
            </div>
        </ListingCard>
    );
};
