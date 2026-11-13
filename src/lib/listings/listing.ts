import { ApiError, type CloseReason, type Condition, type Listing, type ListingStatus } from '@/lib/api';
import { formatPrice } from '@/lib/core';

export const CONDITION_LABELS: Record<Condition, string> = {
    new: 'Новое',
    used_good: 'Б/у — как новое',
    used_repair: 'Б/у — есть следы использования',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
    draft: 'Черновик',
    moderation: 'На проверке',
    rejected: 'Отклонено',
    active: 'Активно',
    closed: 'Снято с продажи',
    sold: 'Продано',
};

export const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
    sold_on_goget: 'Продал на GoGET',
    sold_elsewhere: 'Продал в другом месте',
    changed_mind: 'Передумал продавать',
    other: 'Другая причина',
};

export function statusNotice(listing: Listing): string {
    if (listing.is_owner) {
        switch (listing.status) {
            case 'draft': return 'Черновик. Объявление видно только вам';
            case 'moderation': return 'Объявление на проверке. Обычно это занимает до 30 минут, потом оно появится в поиске';
            case 'rejected': return listing.rejection_reason
                ? `Объявление не прошло проверку: ${listing.rejection_reason}. Исправьте его и сохраните снова`
                : 'Объявление не прошло проверку. Исправьте его и сохраните снова';
            case 'closed': {
                const reason = listing.close_reason ? ` · ${CLOSE_REASON_LABELS[listing.close_reason]}` : '';
                return `Снято с продажи${reason}. Покупатели его не видят в поиске`;
            }
            case 'sold': return 'Товар продан';
            default: return '';
        }
    }
    if (listing.status === 'sold') return 'Товар продан';
    if (listing.status === 'closed') return 'Продавец снял объявление с продажи';
    return '';
}

export function priceText(listing: Pick<Listing, 'is_free' | 'price'>): string {
    if (listing.is_free) return 'Даром';
    if (listing.price === null) return 'Цена не указана';
    return `${formatPrice(listing.price)} ₽`;
}

export function pickupLocation({ city, address }: Pick<Listing, 'city' | 'address'>): string {
    if (!address) return '';
    if (!city || address.toLowerCase().includes(city.toLowerCase())) return address;
    return `${city}, ${address}`;
}

export const UNPAID_ORDER_TEXT = 'Покупатель сейчас оплачивает этот товар. Попробуйте, когда оплата пройдёт или заказ отменится';

export function hasUnpaidOrder(err: unknown): boolean {
    return err instanceof ApiError && err.status === 409 && Boolean(err.orderNumber);
}
