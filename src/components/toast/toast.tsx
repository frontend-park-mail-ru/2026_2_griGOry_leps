import './toast.scss';

export type ToastType = 'success' | 'error';

export interface ToastProps {
    type: ToastType;
    message: string;
}

export const Toast = ({ type, message }: ToastProps) => (
    <div class={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'}>
        <span class="toast__icon" aria-hidden="true">{type === 'success' ? '✓' : '!'}</span>
        <span class="toast__message">{message}</span>
    </div>
);
