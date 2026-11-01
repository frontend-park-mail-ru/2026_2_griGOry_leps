import { ApiError, getCheckoutQuote, getOrder, type Order } from '@/lib/api';
import type { CheckoutData } from '@/lib/checkout';

export async function loadCheckout(): Promise<CheckoutData> {
    const ids = (new URLSearchParams(location.search).get('ids') ?? '')
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length) return { problem: 'empty' };

    try {
        return { quote: await getCheckoutQuote(ids) };
    } catch (err) {
        if (err instanceof ApiError && (err.status === 409 || err.status === 400)) return { problem: 'unavailable' };
        throw err;
    }
}

export async function loadOrder(id: string): Promise<Order | null> {
    if (!/^\d+$/.test(id)) return null;
    try {
        return await getOrder(Number(id));
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}
