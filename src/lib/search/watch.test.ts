import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { refreshSearchSettings } from './settings';
import { watchSearchSettings } from './watch';

vi.mock('./settings', () => ({
    refreshSearchSettings: vi.fn().mockResolvedValue(undefined),
}));

let visibility: DocumentVisibilityState;
const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(refreshSearchSettings).mockReset().mockResolvedValue(undefined);
    visibility = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibility,
    });
});

afterEach(() => {
    vi.useRealTimers();
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
    else Reflect.deleteProperty(document, 'visibilityState');
});

it('опрашивает раз в 30 с только видимую вкладку', () => {
    const stop = watchSearchSettings();
    visibility = 'visible';
    vi.advanceTimersByTime(29_999);
    expect(refreshSearchSettings).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refreshSearchSettings).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(refreshSearchSettings).toHaveBeenCalledTimes(2);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(30_000);
    expect(refreshSearchSettings).toHaveBeenCalledTimes(2);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSearchSettings).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(30_000);
    expect(refreshSearchSettings).toHaveBeenCalledTimes(4);
    stop();
});

it('при возврате на вкладку запрашивает сразу', () => {
    const stop = watchSearchSettings();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSearchSettings).toHaveBeenCalledTimes(1);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSearchSettings).toHaveBeenCalledTimes(1);
    stop();
});

it('остановка снимает таймер и обработчик', () => {
    visibility = 'visible';
    watchSearchSettings()();
    vi.advanceTimersByTime(60_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSearchSettings).not.toHaveBeenCalled();
});
