import { json } from './errors';
import { request } from './request';
import { jsonBody } from './utils';
import type { DeliveryMethod, PaymentMethod, Price } from './types';

export interface OrderItem {
    listing_id: number;
    seller_id: number;
    title: string;
    price: Price;
    image_url: string | null;
}

export interface Recipient {
    first_name: string;
    phone: string;
}

export interface CheckoutQuote {
    items: OrderItem[];
    items_total: Price;
    sellers: {
        seller_id: number;
        first_name: string;
        items_count: number;
        delivery_methods: { method: DeliveryMethod; price: Price; available: boolean; hint: string }[];
    }[];
    addresses: { id: number; label: string; text: string; is_default: boolean }[];
    delivery_slots: { dates: string[]; times: string[] };
    recipient: Recipient;
    payment_methods: { method: PaymentMethod }[];
}

export interface OrderDelivery {
    by_seller: { seller_id: number; method: DeliveryMethod }[];
    address_id?: number | null;
    address?: { text: string } | null;
    date?: string | null;
    time_slot?: string | null;
    comment?: string;
}

export interface CreateOrderData {
    listing_ids: number[];
    delivery: OrderDelivery;
    recipient: Recipient;
    payment_method: PaymentMethod;
}

export interface Order {
    id: number;
    number: number;
    status: 'awaiting_payment' | 'placed' | 'cancelled';
    pay_until: string | null;
    items: OrderItem[];
    totals: { items: Price; delivery: Price; total: Price };
    delivery: OrderDelivery & { address_text: string | null };
    payment: {
        method: PaymentMethod;
        status: 'pending' | 'processing' | 'paid' | 'failed' | 'on_delivery';
        confirmation_url: string | null;
    };
    created_at: string;
}

export async function getCheckoutQuote(listingIds: number[]): Promise<CheckoutQuote> {
    return json(await request('/checkout/quote', { method: 'POST', ...jsonBody({ listing_ids: listingIds }) }));
}

/**
 * @param idempotencyKey один ключ на одну попытку оформления: при повторе после
 * сетевой ошибки передайте тот же ключ, чтобы не создать заказ дважды
 */
export async function createOrder(data: CreateOrderData, idempotencyKey: string = crypto.randomUUID()): Promise<Order> {
    return json(await request('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        ...jsonBody(data),
    }));
}

export async function getOrder(id: number): Promise<Order> {
    return json(await request(`/orders/${id}`));
}

export async function payOrder(id: number, method: PaymentMethod): Promise<Order> {
    return json(await request(`/orders/${id}/payment`, { method: 'POST', ...jsonBody({ method }) }));
}
