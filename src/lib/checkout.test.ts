import { describe, it, expect } from 'vitest';
import type { Cart, CheckoutQuote, Order } from '@/lib/api';
import { itemsTotal, selectedItems, toKopecks } from './cart';
import {
    buildOrderData, checkoutSummary, dateChipLabel, deliveryLabel, deliveryTotal, formatPhone, initialCheckout,
    orderPlacedText, orderTotal, payTimeLeft, validateCheckout,
} from './checkout';

const method = (m: 'courier' | 'pickup_point' | 'self_pickup', price: string, available = true) => (
    { method: m, price, available, hint: '' }
);

const quote: CheckoutQuote = {
    items: [
        { listing_id: 1, seller_id: 10, title: 'Велосипед', price: '24500.00', image_url: null },
        { listing_id: 2, seller_id: 10, title: 'Шлем', price: '2300.00', image_url: null },
        { listing_id: 3, seller_id: 20, title: 'Самокат', price: '18500.00', image_url: null },
    ],
    items_total: '45300.00',
    sellers: [
        { seller_id: 10, first_name: 'Анна', items_count: 2, delivery_methods: [method('courier', '390.00'), method('pickup_point', '190.00'), method('self_pickup', '0.00')] },
        { seller_id: 20, first_name: 'Дмитрий', items_count: 1, delivery_methods: [method('courier', '390.00', false), method('pickup_point', '190.00', false), method('self_pickup', '0.00')] },
    ],
    addresses: [
        { id: 5, label: 'Работа', text: 'Москва, Арбат, 1', is_default: false },
        { id: 7, label: 'Дом · основной', text: 'Москва, Тверская, 12', is_default: true },
    ],
    delivery_slots: { dates: ['2026-10-27', '2026-10-28'], times: ['10:00-14:00', '14:00-18:00'] },
    recipient: { first_name: 'Тимур', phone: '+79001234567' },
    payment_methods: [{ method: 'card' }, { method: 'sbp' }, { method: 'cod' }],
};

describe('корзина', () => {
    const cart: Cart = {
        items_count: 3,
        groups: [{
            seller: { id: 10, first_name: 'Анна', avatar_url: null, rating: 4.8 },
            items: [
                { listing_id: 1, title: 'A', price: '24500.00', image_url: null, address: null, delivery_from: null, availability: 'available', unavailable_reason: null },
                { listing_id: 2, title: 'B', price: '2300.50', image_url: null, address: null, delivery_from: null, availability: 'available', unavailable_reason: null },
                { listing_id: 3, title: 'C', price: '100.00', image_url: null, address: null, delivery_from: null, availability: 'unavailable', unavailable_reason: 'sold' },
            ],
        }],
    };

    it('в заказ идут только выбранные и доступные', () => {
        expect(selectedItems(cart, new Set()).map((i) => i.listing_id)).toEqual([1, 2]);
        expect(selectedItems(cart, new Set([2])).map((i) => i.listing_id)).toEqual([1]);
    });

    it('сумма считается в копейках без ошибок округления', () => {
        expect(itemsTotal(selectedItems(cart, new Set()))).toBe('26800.50');
        expect(toKopecks('0.10') + toKopecks('0.20')).toBe(30);
    });
});

describe('оформление', () => {
    it('по умолчанию курьер, где он доступен, адрес основной, время не выбрано', () => {
        const values = initialCheckout(quote);
        expect(values.methods).toEqual({ 10: 'courier', 20: 'self_pickup' });
        expect(values.address).toBe(7);
        expect(values.date).toBe('2026-10-27');
        expect(values.timeSlot).toBe('');
    });

    it('доставка и итог по выбранным способам', () => {
        const values = initialCheckout(quote);
        expect(deliveryTotal(quote, values)).toBe('390.00');
        expect(orderTotal(quote, values)).toBe('45690.00');
        expect(deliveryLabel(values)).toBe('Доставка');
        expect(deliveryLabel({ ...values, methods: { 10: 'courier', 20: 'courier' } })).toBe('Доставка курьером');
    });

    it('без времени и с неполным телефоном — ошибки и общий текст', () => {
        const errors = validateCheckout({ ...initialCheckout(quote), phone: '+790012' });
        expect(Object.keys(errors).sort()).toEqual(['phone', 'timeSlot']);
        expect(checkoutSummary(errors)).toBe('Выберите время доставки и проверьте телефон получателя');
    });

    it('без курьера адрес и время не нужны', () => {
        const values = { ...initialCheckout(quote), methods: { 10: 'self_pickup' as const, 20: 'self_pickup' as const }, address: null };
        expect(validateCheckout(values)).toEqual({});
        const data = buildOrderData(quote, values);
        expect(data.delivery).toEqual({
            by_seller: [{ seller_id: 10, method: 'self_pickup' }, { seller_id: 20, method: 'self_pickup' }],
            address_id: null, address: null, date: null, time_slot: null,
        });
    });

    it('новый адрес уходит текстом вместо address_id', () => {
        const values = { ...initialCheckout(quote), address: 'new' as const, newAddress: ' Москва, Арбат, 5 ', timeSlot: '14:00-18:00', comment: 'Позвоните' };
        expect(buildOrderData(quote, values)).toEqual({
            listing_ids: [1, 2, 3],
            delivery: {
                by_seller: [{ seller_id: 10, method: 'courier' }, { seller_id: 20, method: 'self_pickup' }],
                address_id: null, address: { text: 'Москва, Арбат, 5' }, date: '2026-10-27', time_slot: '14:00-18:00', comment: 'Позвоните',
            },
            recipient: { first_name: 'Тимур', phone: '+79001234567' },
            payment_method: 'card',
        });
    });
});

describe('подписи', () => {
    const today = new Date(2026, 9, 26);

    it('даты доставки', () => {
        expect(dateChipLabel('2026-10-27', today)).toBe('Завтра, 27 окт');
        expect(dateChipLabel('2026-10-28', today)).toBe('Ср, 28 окт');
    });

    it('телефон и время на оплату', () => {
        expect(formatPhone('+79001234567')).toBe('+7 900 123-45-67');
        expect(payTimeLeft('2026-10-26T12:59:13Z', Date.parse('2026-10-26T12:00:00Z'))).toBe('59:13');
        expect(payTimeLeft('2026-10-26T11:00:00Z', Date.parse('2026-10-26T12:00:00Z'))).toBe('');
    });

    it('текст «заказ оформлен» для курьера', () => {
        const order = {
            delivery: { by_seller: [{ seller_id: 10, method: 'courier' }], date: '2026-10-27', time_slot: '10:00-14:00', address_text: 'x' },
            payment: { method: 'card', status: 'paid', confirmation_url: null },
        } as unknown as Order;
        expect(orderPlacedText(order, today)).toBe(
            'Продавцы получили уведомление. Курьер привезёт заказ завтра, 27 октября, с 10:00 до 14:00. '
            + 'Деньги продавцы получат после того, как вы примете товар.',
        );
    });
});
