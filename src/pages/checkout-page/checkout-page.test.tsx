import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import type { CheckoutQuote, Order } from '@/lib/api';
import { CheckoutPage } from './checkout-page';

const api = vi.hoisted(() => ({
    createOrder: vi.fn(),
    getCart: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const quote: CheckoutQuote = {
    items: [{ listing_id: 3, seller_id: 20, title: 'Самокат', price: '18500.00', image_url: null }],
    items_total: '18500.00',
    sellers: [{
        seller_id: 20,
        first_name: 'Дмитрий',
        items_count: 1,
        delivery_methods: [
            { method: 'courier', price: '390.00', available: false, hint: '' },
            { method: 'pickup_point', price: '190.00', available: false, hint: '' },
            { method: 'self_pickup', price: '0.00', available: true, hint: '' },
        ],
    }],
    addresses: [],
    delivery_slots: { dates: ['2026-10-27'], times: ['10:00-14:00'] },
    recipient: { first_name: 'Тимур', phone: '+79001234567' },
    payment_methods: [{ method: 'card' }, { method: 'sbp' }, { method: 'cod' }],
};

let root: HTMLElement;

beforeEach(() => {
    vi.clearAllMocks();
    api.getCart.mockResolvedValue({ items_count: 0, groups: [] });
    history.replaceState({}, '', '/checkout?ids=3');
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

afterEach(() => {
    render(root, null);
    vi.unstubAllGlobals();
});

describe('CheckoutPage', () => {
    it('перед переходом в банк подменяет адрес на страницу заказа, чтобы «Назад» вёл к заказу', async () => {
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        api.createOrder.mockResolvedValue({
            id: 5, status: 'awaiting_payment', payment: { status: 'pending', confirmation_url: 'http://api.test/pay/abc' },
        } as Order);
        render(root, <CheckoutPage quote={quote} />);

        root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
        await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('http://api.test/pay/abc'));

        expect(document.location.pathname).toBe('/orders/5');
    });
});
