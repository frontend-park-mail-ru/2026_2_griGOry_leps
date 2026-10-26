import type { CheckoutQuote, CreateOrderData, DeliveryMethod, Order, PaymentMethod } from '@/lib/api';
import { fromKopecks, toKopecks } from '@/lib/cart';
import { plural } from '@/lib/format';
import { validateName, validatePhone } from '@/lib/validators';

export const COMMENT_MAX = 200;

const METHOD_ORDER: DeliveryMethod[] = ['courier', 'pickup_point', 'self_pickup'];

export type AddressChoice = number | 'new' | null;

export interface CheckoutValues {
    methods: Record<number, DeliveryMethod>;
    address: AddressChoice;
    newAddress: string;
    date: string;
    timeSlot: string;
    comment: string;
    name: string;
    phone: string;
    payment: PaymentMethod;
}

export type CheckoutErrors = Partial<Record<'address' | 'timeSlot' | 'comment' | 'name' | 'phone', string>>;

export function initialCheckout(quote: CheckoutQuote): CheckoutValues {
    const methods: Record<number, DeliveryMethod> = {};
    quote.sellers.forEach((seller) => {
        const available = METHOD_ORDER.find((method) => seller.delivery_methods.some((m) => m.method === method && m.available));
        methods[seller.seller_id] = available ?? 'self_pickup';
    });

    const address = quote.addresses.find((a) => a.is_default) ?? quote.addresses[0];

    return {
        methods,
        address: address ? address.id : 'new',
        newAddress: '',
        date: quote.delivery_slots.dates[0] ?? '',
        timeSlot: '',
        comment: '',
        name: quote.recipient.first_name,
        phone: quote.recipient.phone,
        payment: quote.payment_methods[0]?.method ?? 'card',
    };
}

export function needsCourier(values: CheckoutValues): boolean {
    return Object.values(values.methods).includes('courier');
}

export function deliveryTotal(quote: CheckoutQuote, values: CheckoutValues): string {
    const kopecks = quote.sellers.reduce((sum, seller) => {
        const chosen = seller.delivery_methods.find((m) => m.method === values.methods[seller.seller_id]);
        return sum + toKopecks(chosen?.price);
    }, 0);
    return fromKopecks(kopecks);
}

export function orderTotal(quote: CheckoutQuote, values: CheckoutValues): string {
    return fromKopecks(toKopecks(quote.items_total) + toKopecks(deliveryTotal(quote, values)));
}

/** Подпись строки доставки в итоге: один способ — его название, разные — просто «Доставка» */
export function deliveryLabel(values: CheckoutValues): string {
    const methods = new Set(Object.values(values.methods));
    if (methods.size !== 1) return 'Доставка';
    const [method] = methods;
    if (method === 'courier') return 'Доставка курьером';
    if (method === 'pickup_point') return 'Доставка в пункт выдачи';
    return 'Самовывоз';
}

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
    const errors: CheckoutErrors = {};

    if (needsCourier(values)) {
        if (values.address === null || (values.address === 'new' && !values.newAddress.trim())) {
            errors.address = 'Укажите адрес доставки';
        }
        if (!values.timeSlot) errors.timeSlot = 'Выберите время доставки';
    }
    if (values.comment.length > COMMENT_MAX) errors.comment = `Не длиннее ${COMMENT_MAX} символов`;

    const name = values.name.trim() ? validateName(values.name.trim()) : 'Укажите имя получателя';
    if (name) errors.name = name;
    if (!values.phone) errors.phone = 'Укажите телефон получателя';
    else if (validatePhone(values.phone)) errors.phone = 'Номер указан не полностью, введите 10 цифр после +7';

    return errors;
}

const SUMMARY_PARTS: Record<keyof CheckoutErrors, string> = {
    address: 'укажите адрес',
    timeSlot: 'выберите время доставки',
    comment: 'сократите комментарий',
    name: 'проверьте имя получателя',
    phone: 'проверьте телефон получателя',
};

export function checkoutSummary(errors: CheckoutErrors): string {
    const parts = (Object.keys(SUMMARY_PARTS) as (keyof CheckoutErrors)[])
        .filter((key) => errors[key])
        .map((key) => SUMMARY_PARTS[key]);
    if (!parts.length) return '';
    const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} и ${parts[parts.length - 1]}`;
    return text[0].toUpperCase() + text.slice(1);
}

export function buildOrderData(quote: CheckoutQuote, values: CheckoutValues): CreateOrderData {
    const courier = needsCourier(values);
    const comment = values.comment.trim();

    return {
        listing_ids: quote.items.map((item) => item.listing_id),
        delivery: {
            by_seller: quote.sellers.map((seller) => ({ seller_id: seller.seller_id, method: values.methods[seller.seller_id] })),
            address_id: courier && typeof values.address === 'number' ? values.address : null,
            address: courier && values.address === 'new' ? { text: values.newAddress.trim() } : null,
            date: courier ? values.date : null,
            time_slot: courier ? values.timeSlot : null,
            ...(comment ? { comment } : {}),
        },
        recipient: { first_name: values.name.trim(), phone: values.phone },
        payment_method: values.payment,
    };
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });
const dayMonthLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function utcDate(date: string): Date {
    return new Date(`${date}T00:00:00Z`);
}

function localIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** «2026-10-12» → «Завтра, 12 окт» или «Пн, 13 окт» */
export function dateChipLabel(date: string, today = new Date()): string {
    const day = dayMonth.format(utcDate(date)).replace('.', '');
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date === localIso(today)) return `Сегодня, ${day}`;
    if (date === localIso(tomorrow)) return `Завтра, ${day}`;
    const wd = weekday.format(utcDate(date));
    return `${wd[0].toUpperCase()}${wd.slice(1)}, ${day}`;
}

/** «10:00-14:00» → «10:00–14:00» */
export function slotLabel(slot: string): string {
    return slot.replace('-', '–');
}

/** Текст под «Заказ № … оформлен» */
export function orderPlacedText(order: Order, today = new Date()): string {
    const methods = new Set(order.delivery.by_seller.map((s) => s.method));
    const parts = ['Продавцы получили уведомление.'];

    if (methods.has('courier') && order.delivery.date && order.delivery.time_slot) {
        const [from, to] = order.delivery.time_slot.split('-');
        const label = dateChipLabel(order.delivery.date, today).split(',')[0].toLowerCase();
        const when = ['завтра', 'сегодня'].includes(label)
            ? `${label}, ${dayMonthLong.format(utcDate(order.delivery.date))}`
            : dayMonthLong.format(utcDate(order.delivery.date));
        parts.push(`Курьер привезёт заказ ${when}, с ${from} до ${to}.`);
    }
    if (methods.has('pickup_point')) parts.push('Когда заказ приедет в пункт выдачи, пришлём уведомление.');
    if (methods.has('self_pickup')) parts.push('О самовывозе договоритесь с продавцом.');

    parts.push(order.payment.method === 'cod'
        ? 'Оплатите заказ при получении.'
        : 'Деньги продавцы получат после того, как вы примете товар.');
    return parts.join(' ');
}

export function payTimeLeft(payUntil: string | null, now = Date.now()): string {
    if (!payUntil) return '';
    const seconds = Math.floor((new Date(payUntil).getTime() - now) / 1000);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

export function formatPhone(phone: string): string {
    const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
    return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone;
}

export function itemsCountText(count: number): string {
    return `${count} ${plural(count, ['товар', 'товара', 'товаров'])}`;
}
