import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { ApiError, type Order } from '@/lib/api';
import { OrderPage } from './order-page';

const api = vi.hoisted(() => ({
    getOrder: vi.fn(),
    payOrder: vi.fn(),
    getCart: vi.fn(),
    resendVerification: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

function order(overrides: Partial<Order> = {}, payment: Partial<Order['payment']> = {}): Order {
    return {
        id: 5,
        number: 10005,
        status: 'awaiting_payment',
        pay_until: new Date(Date.now() + 30 * 60_000).toISOString(),
        items: [],
        totals: { items: '1000.00', delivery: '0.00', total: '1000.00' },
        delivery: { by_seller: [], address_text: null },
        payment: { method: 'card', status: 'processing', confirmation_url: null, ...payment },
        created_at: new Date().toISOString(),
        ...overrides,
    } as Order;
}

let root: HTMLElement;

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    api.getCart.mockResolvedValue({ items_count: 1, groups: [] });
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

afterEach(() => {
    render(root, null);
    vi.useRealTimers();
});

describe('OrderPage', () => {
    it('обновляет счётчик корзины, когда заказ стал оформленным', async () => {
        api.getOrder.mockResolvedValue(order({ status: 'placed', pay_until: null }, { status: 'paid' }));
        render(root, <OrderPage order={order()} />);
        expect(api.getCart).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2000);

        expect(api.getCart).toHaveBeenCalledTimes(1);
    });

    it('обновляет счётчик один раз, если заказ уже оформлен', async () => {
        render(root, <OrderPage order={order({ status: 'placed', pay_until: null }, { method: 'cod', status: 'on_delivery' })} />);
        await vi.advanceTimersByTimeAsync(5000);

        expect(api.getCart).toHaveBeenCalledTimes(1);
        expect(api.getOrder).not.toHaveBeenCalled();
    });

    it('на 403 email not verified при повторной оплате просит подтвердить почту', async () => {
        api.payOrder.mockRejectedValue(new ApiError(403, { reason: 'email not verified' }));
        render(root, <OrderPage order={order({}, { status: 'failed' })} />);

        root.querySelector<HTMLButtonElement>('.order-page__primary')!.click();
        await vi.advanceTimersByTimeAsync(0);

        expect(root.querySelector('.order-page__error')?.textContent).toBe('Подтвердите почту, чтобы оформить заказ');

        api.resendVerification.mockResolvedValue('ivan@mail.ru');
        root.querySelector<HTMLButtonElement>('.order-page__error ~ .order-page__secondary')!.click();
        await vi.advanceTimersByTimeAsync(0);

        expect(api.resendVerification).toHaveBeenCalledTimes(1);
    });
});
