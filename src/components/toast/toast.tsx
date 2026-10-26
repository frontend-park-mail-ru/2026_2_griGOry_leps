import './toast.scss';

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

export interface ToastProps {
    type: ToastType;
    message: string;
    action?: ToastAction;
}

const ICONS: Record<ToastType, string> = { success: '✓', error: '!', info: 'i' };

export const Toast = ({ type, message, action }: ToastProps) => (
    <div class={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'}>
        <span class="toast__icon" aria-hidden="true">{ICONS[type]}</span>
        <span class="toast__message">{message}</span>
        {action && <button type="button" class="toast__action" onClick={action.onClick}>{action.label}</button>}
    </div>
);
