import { Button } from '@/components/button/button';
import { ProductCard } from '@/components/product-card/product-card';
import type { Listing } from '@/lib/api';
import './listing-published.scss';

export interface ListingPublishedProps {
    listing: Listing;
    onCreateAnother: () => void;
}

export const ListingPublished = ({ listing, onCreateAnother }: ListingPublishedProps) => {
    const onModeration = listing.status === 'moderation';

    return (
        <section class="listing-published">
            <span class="listing-published__icon" aria-hidden="true">✓</span>
            <h1 class="listing-published__title">
                {onModeration ? 'Объявление отправлено на проверку' : 'Объявление опубликовано'}
            </h1>
            <p class="listing-published__text">
                {onModeration
                    ? 'Обычно проверка занимает до 30 минут. Как только она пройдёт, объявление появится в поиске.'
                    : 'Объявление уже в поиске — покупатели могут его найти.'}
            </p>
            <div class="listing-published__card">
                <ProductCard
                    id={listing.id}
                    link={false}
                    title={listing.title}
                    price={listing.price ?? '0'}
                    is_free={listing.is_free}
                    image_url={listing.photos[0]?.thumb_url ?? null}
                    city={listing.city}
                    has_delivery={listing.has_delivery}
                    created_at={listing.created_at}
                    meta={`${listing.city} · размещено сегодня`}
                />
            </div>
            <div class="listing-published__actions">
                <a href={`/listing/${listing.id}`} data-link class="listing-published__primary">Перейти к объявлению</a>
                <Button text="Разместить ещё" variant="secondary" onClick={onCreateAnother} />
            </div>
        </section>
    );
};
