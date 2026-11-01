import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

const plain = (s: string) => s.replace(/\s/g, ' ');

describe('formatPrice', () => {
    it('целую цену пишет без копеек', () => {
        expect(plain(formatPrice('15000.00'))).toBe('15 000');
        expect(plain(formatPrice(42000))).toBe('42 000');
    });

    it('копейки всегда двумя знаками', () => {
        expect(plain(formatPrice('13500.5'))).toBe('13 500,50');
        expect(plain(formatPrice('99.99'))).toBe('99,99');
    });

    it('нечисловую строку возвращает как есть', () => {
        expect(formatPrice('abc')).toBe('abc');
    });
});
