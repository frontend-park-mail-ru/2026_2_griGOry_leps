import type { Child } from '@/vdom';
import './order-status.scss';

export type OrderStatusKind = 'success' | 'error' | 'pending';

export interface OrderStatusProps {
    kind: OrderStatusKind;
    title: string;
    text: string;
    note?: string;
    children?: Child;
}

const ICONS: Record<OrderStatusKind, string> = { success: '✓', error: '!', pending: '' };

export const OrderStatus = ({ kind, title, text, note, children }: OrderStatusProps) => (
    <section class="order-status" role={kind === 'error' ? 'alert' : 'status'}>
        <span class={`order-status__icon order-status__icon--${kind}`} aria-hidden="true">{ICONS[kind]}</span>
        <h1 class="order-status__title">{title}</h1>
        <p class="order-status__text">{text}</p>
        {note && <p class="order-status__note">{note}</p>}
        {children && <div class="order-status__actions">{children}</div>}
    </section>
);
