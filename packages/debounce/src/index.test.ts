import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './index.js';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('debounce', () => {
    it('вызывает функцию один раз после паузы с последними аргументами', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 300);

        debounced('a');
        debounced('b');
        vi.advanceTimersByTime(299);
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('b');
    });

    it('cancel отменяет отложенный вызов', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 300);

        debounced('a');
        debounced.cancel();
        vi.advanceTimersByTime(300);

        expect(fn).not.toHaveBeenCalled();
    });
});
