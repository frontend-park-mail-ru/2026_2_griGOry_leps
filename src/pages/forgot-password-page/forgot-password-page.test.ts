import { describe, it, expect } from 'vitest';
import { formatCountdown } from './forgot-password-page';

describe('formatCountdown', () => {
    it('показывает минуты и секунды с ведущим нулём', () => {
        expect(formatCountdown(60)).toBe('1:00');
        expect(formatCountdown(59)).toBe('0:59');
        expect(formatCountdown(5)).toBe('0:05');
        expect(formatCountdown(-1)).toBe('0:00');
    });
});
