const enabled = import.meta.env.DEV;

/**
 * @param {...unknown} args
 */
export function logError(...args) {
    if (!enabled) return;
    console.error(...args);
}

/**
 * @param {...unknown} args
 */
export function logWarn(...args) {
    if (!enabled) return;
    console.warn(...args);
}

/**
 * @param {...unknown} args
 */
export function logInfo(...args) {
    if (!enabled) return;
    console.info(...args);
}
