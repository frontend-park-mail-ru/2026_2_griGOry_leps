import './toast.scss';
import type { ToastAction, ToastType } from '@/lib/toast';

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
