import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormValidation } from './index.js';

let form: FormValidation;
let onUpdate: ReturnType<typeof vi.fn>;

beforeEach(() => {
    onUpdate = vi.fn();
    form = new FormValidation({
        name: { validate: (value) => (value.length < 2 ? 'Коротко' : ''), required: 'Введите имя' },
    }, onUpdate);
});

afterEach(() => {
    form.destroy();
});

describe('FormValidation', () => {
    it('пустое обязательное поле — ошибка при отправке', () => {
        expect(form.validateAll()).toBeNull();
        expect(form.errors.name).toBe('Введите имя');
    });

    it('проверяет значение правилом поля', () => {
        form.input('name', 'А');

        expect(form.validateAll()).toBeNull();
        expect(form.errors.name).toBe('Коротко');
    });

    it('возвращает значения, если ошибок нет', () => {
        form.input('name', 'Аня');

        expect(form.validateAll()).toEqual({ name: 'Аня' });
        expect(onUpdate).toHaveBeenCalled();
    });

    it('показывает ошибку после паузы в вводе', () => {
        vi.useFakeTimers();
        const delayed = new FormValidation({ name: { validate: () => 'Ошибка' } }, vi.fn());

        delayed.input('name', 'x');
        expect(delayed.errors.name).toBeUndefined();

        vi.advanceTimersByTime(300);
        expect(delayed.errors.name).toBe('Ошибка');
        delayed.destroy();
        vi.useRealTimers();
    });
});
