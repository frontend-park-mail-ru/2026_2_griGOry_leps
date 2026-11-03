import { describe, it, expect } from 'vitest';
import { render } from 'goget-vdom';
import { FormField } from './form-field';

describe('FormField', () => {
    it('ограничивает длину ввода, если задан maxLength', () => {
        const root = document.createElement('div');
        render(root, <FormField id="title" name="title" label="Название" maxLength={80} />);

        expect(root.querySelector('input')?.maxLength).toBe(80);
    });

    it('без maxLength длина не ограничена', () => {
        const root = document.createElement('div');
        render(root, <FormField id="title" name="title" label="Название" />);

        expect(root.querySelector('input')?.hasAttribute('maxlength')).toBe(false);
    });
});
