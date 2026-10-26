import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import type { Review } from '@/lib/api';
import { formatStars } from '@/lib/format';
import { ReviewCard } from './review-card';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

const review: Review = {
    id: 1,
    author: { id: 2, first_name: 'Аня', avatar_url: null },
    rating: 4,
    text: 'Всё отлично',
    listing_title: 'Диван',
    photos: ['/uploads/reviews/1.jpg'],
    created_at: '2026-10-01T10:00:00Z',
};

describe('formatStars', () => {
    it('округляет оценку и ограничивает её от 0 до 5', () => {
        expect(formatStars(4.4)).toBe('★★★★☆');
        expect(formatStars(7)).toBe('★★★★★');
        expect(formatStars(-1)).toBe('☆☆☆☆☆');
    });
});

describe('ReviewCard', () => {
    it('показывает фото отзыва', () => {
        render(root, <ReviewCard review={review} />);
        expect(root.querySelector<HTMLImageElement>('.review-card__photo')?.src)
            .toBe('http://localhost:8080/uploads/reviews/1.jpg');
    });

    it('без фото, даже если бэк прислал null', () => {
        render(root, <ReviewCard review={{ ...review, photos: null }} />);
        expect(root.querySelector('.review-card__photos')).toBeNull();
        expect(root.querySelector('.review-card__text')?.textContent).toBe('Всё отлично');
    });
});
