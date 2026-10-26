import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { TextareaField } from './textarea-field';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('TextareaField', () => {
    it('рисует подпись, значение, счётчик и высоту поля', () => {
        render(root, <TextareaField id="about" name="about" label="О себе" value="Привет" maxLength={500} height={140} />);

        expect(root.querySelector('label')?.getAttribute('for')).toBe('about');
        expect(root.querySelector('label')?.textContent).toBe('О себе');
        expect(root.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('Привет');
        expect(root.querySelector('textarea')?.getAttribute('maxlength')).toBe('500');
        expect(root.querySelector('.textarea-field__counter')?.textContent).toBe('6 / 500');
        expect(root.querySelector<HTMLElement>('.textarea-field__box')!.style.height).toBe('140px');
        expect(root.querySelector('.textarea-field__error')).toBeNull();
    });

    it('показывает ошибку и помечает поле', () => {
        render(root, <TextareaField id="c" name="comment" label="Комментарий" value="" maxLength={200} height={112} error="Не более 200 символов" />);

        expect(root.querySelector('.textarea-field')?.classList.contains('textarea-field--error')).toBe(true);
        expect(root.querySelector('.textarea-field__error')?.textContent).toBe('Не более 200 символов');
        expect(root.querySelector('textarea')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('передаёт ввод наружу', () => {
        const onInput = vi.fn();
        render(root, <TextareaField id="c" name="comment" label="Комментарий" value="" maxLength={200} height={112} onInput={onInput} />);

        const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
        textarea.value = 'Домофон 34';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onInput).toHaveBeenCalledTimes(1);
    });

    it('без подписи берёт aria-label и умеет блокироваться', () => {
        render(root, <TextareaField id="r" name="comment" ariaLabel="Комментарий к жалобе" value="" maxLength={500} height={100} disabled />);

        const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
        expect(root.querySelector('.textarea-field__label')).toBeNull();
        expect(textarea.getAttribute('aria-label')).toBe('Комментарий к жалобе');
        expect(textarea.disabled).toBe(true);
    });
});
