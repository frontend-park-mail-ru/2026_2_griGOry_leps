import { ToastTimer, type ToastState, type ToastType } from '@/components/toast/toast';

let current: ToastState | null = null;
const listeners = new Set<() => void>();

const timer = new ToastTimer((toast) => {
    current = toast;
    listeners.forEach((fn) => fn());
});

export function showToast(message: string, type: ToastType = 'success'): void {
    timer.show(type, message);
}

export function getToast(): ToastState | null {
    return current;
}

export function subscribeToast(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
