export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastState {
    id: number;
    type: ToastType;
    message: string;
    action?: ToastAction;
}

export const TOAST_DURATION_MS = 4000;

export class ToastTimer {
    onChange: (toast: ToastState | null) => void;

    timer: ReturnType<typeof setTimeout> | null = null;

    lastId = 0;

    constructor(onChange: (toast: ToastState | null) => void) {
        this.onChange = onChange;
    }

    show(type: ToastType, message: string, action?: ToastAction): void {
        this.stop();
        this.lastId += 1;
        this.onChange({ id: this.lastId, type, message, action });
        this.timer = setTimeout(() => {
            this.timer = null;
            this.onChange(null);
        }, TOAST_DURATION_MS);
    }

    stop(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }
}

let current: ToastState | null = null;
const listeners = new Set<() => void>();

const timer = new ToastTimer((toast) => {
    current = toast;
    listeners.forEach((fn) => fn());
});

export function showToast(message: string, type: ToastType = 'success', action?: ToastAction): void {
    timer.show(type, message, action);
}

export function hideToast(): void {
    timer.stop();
    current = null;
    listeners.forEach((fn) => fn());
}

export function getToast(): ToastState | null {
    return current;
}

export function subscribeToast(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
