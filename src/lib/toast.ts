export type ToastKind = 'success' | 'info' | 'error';

export interface ToastMessage {
    id: number;
    text: string;
    kind: ToastKind;
}

const TOAST_MS = 4000;

let current: ToastMessage | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((fn) => fn());
}

export function showToast(text: string, kind: ToastKind = 'success'): void {
    current = { id: ++seq, text, kind };
    if (timer) clearTimeout(timer);
    timer = setTimeout(hideToast, TOAST_MS);
    emit();
}

export function hideToast(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    current = null;
    emit();
}

export function getToast(): ToastMessage | null {
    return current;
}

export function subscribeToast(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
