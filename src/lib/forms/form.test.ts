import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api';
import { describeApiError, tooManyRequestsText } from './form';

describe('tooManyRequestsText', () => {
    it('секунды и минуты со склонением', () => {
        expect(tooManyRequestsText(1)).toBe('Слишком много попыток. Попробуйте через 1 секунду');
        expect(tooManyRequestsText(42)).toBe('Слишком много попыток. Попробуйте через 42 секунды');
        expect(tooManyRequestsText(60)).toBe('Слишком много попыток. Попробуйте через 1 минуту');
        expect(tooManyRequestsText(299)).toBe('Слишком много попыток. Попробуйте через 5 минут');
    });

    it('без времени — просто позже', () => {
        expect(tooManyRequestsText(0)).toBe('Слишком много попыток. Попробуйте позже');
    });
});

describe('describeApiError', () => {
    it('429 — общая ошибка формы с временем ожидания', () => {
        const err = new ApiError(429, { reason: 'too many requests', retryAfter: 30 });

        expect(describeApiError(err, { fields: ['login'], fallback: 'Ошибка' }))
            .toEqual({ message: 'Слишком много попыток. Попробуйте через 30 секунд' });
    });
});
