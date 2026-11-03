import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'goget-vdom';
import { Select } from './select';

const options = [{ value: '1', label: 'Москва' }, { value: '2', label: 'Казань' }];
const tick = () => new Promise((resolve) => setTimeout(resolve));

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('Select', () => {
    it('открывает список, отмечает выбранный и выбирает стрелками', async () => {
        const onChange = vi.fn();
        render(root, <Select id="city" options={options} value="1" onChange={onChange} />);

        const control = root.querySelector<HTMLButtonElement>('#city')!;
        control.click();
        await tick();

        expect(control.getAttribute('aria-expanded')).toBe('true');
        expect(root.querySelectorAll('.select__option')).toHaveLength(2);
        expect(root.querySelector('.select__option--selected')?.textContent).toBe('Москва');
        expect(root.querySelector('.select__option--selected .select__check')).not.toBeNull();

        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await tick();

        expect(root.querySelector('.select__list')).toBeNull();
        expect(onChange).toHaveBeenCalledWith('2');
    });

    it('закрывается по Escape и по клику мимо', async () => {
        render(root, <Select id="city" options={options} value="1" onChange={vi.fn()} />);
        const control = root.querySelector<HTMLButtonElement>('#city')!;

        control.click();
        await tick();
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await tick();
        expect(root.querySelector('.select__list')).toBeNull();

        control.click();
        await tick();
        document.body.click();
        await tick();
        expect(root.querySelector('.select__list')).toBeNull();
        expect(control.textContent).toBe('Москва');
    });
});
