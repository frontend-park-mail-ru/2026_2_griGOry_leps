import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './index.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createLogger', () => {
    it('пишет в консоль по умолчанию', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const logger = createLogger();

        logger.error('e', 1);
        logger.warn('w', 2);
        logger.info('i', 3);

        expect(error).toHaveBeenCalledWith('e', 1);
        expect(warn).toHaveBeenCalledWith('w', 2);
        expect(info).toHaveBeenCalledWith('i', 3);
    });

    it('выключенный молчит', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const logger = createLogger({ enabled: false });

        logger.error('e');
        logger.warn('w');
        logger.info('i');

        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        expect(info).not.toHaveBeenCalled();
    });
});
