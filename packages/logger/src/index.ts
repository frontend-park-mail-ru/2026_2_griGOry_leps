export type LogMethod = (...args: unknown[]) => void;

export interface Logger {
    error: LogMethod;
    warn: LogMethod;
    info: LogMethod;
}

export interface LoggerOptions {
    enabled?: boolean;
}

export function createLogger({ enabled = true }: LoggerOptions = {}): Logger {
    const method = (write: LogMethod): LogMethod => (...args) => {
        if (enabled) write(...args);
    };

    return {
        error: method((...args) => console.error(...args)),
        warn: method((...args) => console.warn(...args)),
        info: method((...args) => console.info(...args)),
    };
}
