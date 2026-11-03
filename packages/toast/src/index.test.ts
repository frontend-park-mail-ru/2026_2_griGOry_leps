import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, getToast, hideToast, showToast, subscribeToast } from './index.js';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    hideToast();
    vi.useRealTimers();
});

describe('toast', () => {
    it('показывает тост и оповещает подписчиков', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToast(listener);

        showToast('Сохранено');

        expect(getToast()).toMatchObject({ type: 'success', message: 'Сохранено' });
        expect(listener).toHaveBeenCalled();
        unsubscribe();
    });

    it('прячет тост через TOAST_DURATION_MS', () => {
        showToast('Ошибка', 'error');

        vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
        expect(getToast()).toMatchObject({ type: 'error' });

        vi.advanceTimersByTime(1);
        expect(getToast()).toBeNull();
    });

    it('hideToast прячет сразу', () => {
        showToast('Готово');
        hideToast();

        expect(getToast()).toBeNull();
    });
});
