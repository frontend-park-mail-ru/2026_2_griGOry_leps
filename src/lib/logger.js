const enabled = import.meta.env.DEV;

export function logError(...args) {
    if (!enabled) return;
    console.error(...args);
}

export function logWarn(...args) {
    if (!enabled) return;
    console.warn(...args);
}

export function logInfo(...args) {
    if (!enabled) return;
    console.info(...args);
}
