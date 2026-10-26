import { formatRating, formatStars, plural } from '@/lib/format';
import './rating-summary.scss';

export interface RatingSummaryProps {
    rating: number;
    total: number;
    distribution: Record<string, number>;
}

const STARS = [5, 4, 3, 2, 1];

export const RatingSummary = ({ rating, total, distribution }: RatingSummaryProps) => {
    const max = Math.max(1, ...STARS.map((star) => distribution[star] ?? 0));

    return (
        <aside class="rating-summary">
            <span class="rating-summary__value">{formatRating(rating)}</span>
            <span class="rating-summary__caption">
                {formatStars(rating)} на основе {total} {plural(total, ['отзыва', 'отзывов', 'отзывов'])}
            </span>
            <ul class="rating-summary__bars">
                {STARS.map((star) => {
                    const count = distribution[star] ?? 0;
                    return (
                        <li key={star} class="rating-summary__row" data-stars={star}>
                            <span class="rating-summary__label">{star} ★</span>
                            <span class="rating-summary__track">
                                <span class="rating-summary__fill" style={{ width: `${(count / max) * 100}%` }} />
                            </span>
                            <span class="rating-summary__count">{count}</span>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
};
