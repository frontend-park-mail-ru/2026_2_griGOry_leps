import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@/vdom';
import { Skeleton } from './skeleton';

let root: HTMLElement;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('Skeleton', () => {
    it('задаёт размер и скругление из пропов', () => {
        render(root, <Skeleton width={144} height={108} radius={12} />);
        const el = root.querySelector<HTMLElement>('.skeleton')!;

        expect(el.style.width).toBe('144px');
        expect(el.style.height).toBe('108px');
        expect(el.style.borderRadius).toBe('12px');
        expect(el.getAttribute('aria-hidden')).toBe('true');
    });

    it('принимает ширину в процентах и класс для смешивания', () => {
        render(root, <Skeleton width="100%" height={16} class="my-block__bar" />);
        const el = root.querySelector<HTMLElement>('.skeleton')!;

        expect(el.style.width).toBe('100%');
        expect(el.className).toBe('skeleton my-block__bar');
    });

    it('круглый, если передан circle', () => {
        render(root, <Skeleton width={120} height={120} circle />);

        expect(root.querySelector<HTMLElement>('.skeleton')!.style.borderRadius).toBe('50%');
    });
});
