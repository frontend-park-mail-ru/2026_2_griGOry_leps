const enabled = import.meta.env.DEV;

export function logError(...args: unknown[]): void {
    if (!enabled) return;
    console.error(...args);
}

export function logWarn(...args: unknown[]): void {
    if (!enabled) return;
    console.warn(...args);
}

export function logInfo(...args: unknown[]): void {
    if (!enabled) return;
    console.info(...args);
}
