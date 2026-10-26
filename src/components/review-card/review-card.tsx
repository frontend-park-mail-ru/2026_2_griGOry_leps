import { assetUrl, type Review } from '@/lib/api';
import { formatDay, formatStars } from '@/lib/format';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import './review-card.scss';

export const ReviewCard = ({ review }: { review: Review }) => {
    const { author, rating, text, listing_title: listingTitle, photos, created_at: createdAt } = review;
    const meta = [listingTitle, formatDay(createdAt)].filter(Boolean).join(' · ');

    return (
        <article class="review-card" data-review-id={review.id}>
            <div class="review-card__author">
                <UserAvatar user={{ ...author, email: '' }} class="review-card__avatar" />
                <div class="review-card__info">
                    <span class="review-card__name">{author.first_name}</span>
                    {meta && <span class="review-card__meta">{meta}</span>}
                </div>
                <span class="review-card__stars" aria-label={`Оценка ${rating} из 5`}>{formatStars(rating)}</span>
            </div>
            {text && <p class="review-card__text">{text}</p>}
            {photos?.length ? (
                <div class="review-card__photos">
                    {photos.map((photo) => (
                        <img key={photo} class="review-card__photo" src={assetUrl(photo) ?? ''} alt="Фото к отзыву" loading="lazy" />
                    ))}
                </div>
            ) : null}
        </article>
    );
};
