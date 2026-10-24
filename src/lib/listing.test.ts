import { describe, it, expect } from 'vitest';
import type { Listing } from '@/lib/api';
import { priceText, statusNotice } from './listing';
import { formatMonthSince, formatPrice, plural } from './format';

const listing = (patch: Partial<Listing>) => ({
    is_owner: false, status: 'active', close_reason: null, is_free: false, price: '15000.00', ...patch,
}) as Listing;

describe('statusNotice', () => {
    it('у активного объявления плашки нет', () => {
        expect(statusNotice(listing({}))).toBe('');
        expect(statusNotice(listing({ is_owner: true }))).toBe('');
    });

    it('автор видит причину снятия, покупатель — нет', () => {
        expect(statusNotice(listing({ is_owner: true, status: 'closed', close_reason: 'changed_mind' })))
            .toContain('Передумал продавать');
        expect(statusNotice(listing({ status: 'closed' }))).toBe('Продавец снял объявление с продажи');
    });

    it('черновик и проверка — только для автора', () => {
        expect(statusNotice(listing({ is_owner: true, status: 'draft' }))).toContain('Черновик');
        expect(statusNotice(listing({ is_owner: true, status: 'moderation' }))).toContain('на проверке');
    });
});

describe('priceText', () => {
    it('цена, «Даром» и не указанная цена', () => {
        expect(priceText(listing({})).replace(/\s/g, ' ')).toBe('15 000 ₽');
        expect(priceText(listing({ is_free: true, price: '0.00' }))).toBe('Даром');
        expect(priceText(listing({ price: null }))).toBe('Цена не указана');
    });
});

describe('format', () => {
    it('копейки показываются, только если они есть', () => {
        expect(formatPrice('15000.00').replace(/\s/g, ' ')).toBe('15 000');
        expect(formatPrice('13500.5').replace(/\s/g, ' ')).toBe('13 500,50');
    });

    it('склоняет слова', () => {
        expect([1, 2, 5, 11, 21, 23].map((n) => plural(n, ['отзыв', 'отзыва', 'отзывов'])))
            .toEqual(['отзыв', 'отзыва', 'отзывов', 'отзывов', 'отзыв', 'отзыва']);
    });

    it('месяц в родительном падеже', () => {
        expect(formatMonthSince('2025-03-14T10:00:00Z')).toBe('марта 2025');
    });
});
