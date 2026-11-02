const listeners: (() => void)[] = [];

export function onSessionExpired(listener: () => void): void {
    listeners.push(listener);
}

export function notifySessionExpired(): void {
    listeners.forEach((listener) => listener());
}
