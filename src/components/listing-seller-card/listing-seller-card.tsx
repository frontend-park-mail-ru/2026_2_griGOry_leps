import { ListingCard } from '@/components/listing-card/listing-card';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import type { SellerShort } from '@/lib/api';
import { formatRating, formatSince, plural } from '@/lib/format';
import './listing-seller-card.scss';

export const ListingSellerCard = ({ seller }: { seller: SellerShort }) => {
    const reviews = seller.reviews_count;
    const since = formatSince(seller.created_at);

    return (
        <ListingCard class="listing-seller-card" label="Продавец">
            <UserAvatar user={{ ...seller, email: '' }} class="listing-seller-card__avatar" />
            <div class="listing-seller-card__info">
                <a href={`/seller/${seller.id}`} data-link class="listing-seller-card__name">{seller.first_name}</a>
                <span class="listing-seller-card__rating">
                    {reviews > 0
                        ? `★ ${formatRating(seller.rating)} · ${reviews} ${plural(reviews, ['отзыв', 'отзыва', 'отзывов'])}`
                        : 'Пока нет отзывов'}
                </span>
                {since && <span class="listing-seller-card__since">На GoGET с {since}</span>}
            </div>
        </ListingCard>
    );
};
