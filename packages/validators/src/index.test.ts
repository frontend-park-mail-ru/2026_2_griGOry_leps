import { describe, expect, it } from 'vitest';
import { byteLength, sanitizePhone, validateEmail, validatePhone } from './index.js';

describe('validators', () => {
    it('приводит телефон к формату +7', () => {
        expect(sanitizePhone('8 (900) 123-45-67')).toBe('+79001234567');
        expect(sanitizePhone('900 123 45 67')).toBe('+79001234567');
    });

    it('проверяет email', () => {
        expect(validateEmail('a@b')).toBe('Введите корректный email');
        expect(validateEmail('user@mail.ru')).toBe('');
    });

    it('пустое значение не ошибка', () => {
        expect(validateEmail('')).toBe('');
        expect(validatePhone('')).toBe('');
    });

    it('считает длину в байтах UTF-8', () => {
        expect(byteLength('ж')).toBe(2);
        expect(byteLength('a')).toBe(1);
    });
});
