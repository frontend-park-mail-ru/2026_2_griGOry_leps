import { ToastTimer, type ToastAction, type ToastState, type ToastType } from '@/components/toast/toast';

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
