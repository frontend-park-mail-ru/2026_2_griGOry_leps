import { getCart, type Cart, type CartItem, type DeliveryMethod, type PaymentMethod } from '@/lib/api';
import { logWarn } from '@/lib/logger';
import { getUser } from '@/store';

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
    courier: 'Курьером',
    pickup_point: 'В пункт выдачи',
    self_pickup: 'Самовывоз',
};

export const PAYMENT_LABELS: Record<PaymentMethod, { title: string; hint: string }> = {
    card: { title: 'Картой онлайн', hint: 'Visa, Mastercard, Мир' },
    sbp: { title: 'СБП', hint: 'Через приложение банка' },
    cod: { title: 'При получении', hint: 'Наличными или картой курьеру' },
};

export const UNAVAILABLE_TEXT: Record<NonNullable<CartItem['unavailable_reason']>, string> = {
    sold: 'Товар уже продан, уберите его из корзины',
    closed: 'Продавец снял товар с продажи',
    deleted: 'Объявление удалено',
};
export function toKopecks(price: string | null | undefined): number {
    const value = Number(price ?? 0);
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function fromKopecks(kopecks: number): string {
    return (kopecks / 100).toFixed(2);
}

export function cartItems(cart: Cart): CartItem[] {
    return cart.groups.flatMap((group) => group.items);
}

export function isAvailable(item: CartItem): boolean {
    return item.availability === 'available';
}

export function selectedItems(cart: Cart, unselected: ReadonlySet<number>): CartItem[] {
    return cartItems(cart).filter((item) => isAvailable(item) && !unselected.has(item.listing_id));
}

export function itemsTotal(items: CartItem[]): string {
    return fromKopecks(items.reduce((sum, item) => sum + toKopecks(item.price), 0));
}

// Счётчик в шапке
let count = 0;
const listeners = new Set<() => void>();

export function getCartCount(): number {
    return count;
}

export function setCartCount(value: number): void {
    count = value;
    listeners.forEach((fn) => fn());
}

export function subscribeCartCount(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export async function refreshCartCount(loggedIn: boolean): Promise<void> {
    if (!loggedIn) {
        setCartCount(0);
        return;
    }
    try {
        setCartCount((await getCart()).items_count);
    } catch (err) {
        logWarn('Не удалось получить корзину:', err);
    }
}

function storageKey(name: string): string | null {
    const user = getUser();
    return user ? `goget:${name}:${user.id}` : null;
}

function readStored<T>(name: string): T | null {
    const key = storageKey(name);
    if (!key) return null;
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

function writeStored(name: string, value: unknown): void {
    const key = storageKey(name);
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        logWarn('Не удалось сохранить в localStorage:', err);
    }
}

export function getUnselected(): ReadonlySet<number> {
    return new Set(readStored<number[]>('cart-unselected') ?? []);
}

export function setSelected(listingId: number, selected: boolean): void {
    const unselected = new Set(getUnselected());
    if (selected) unselected.delete(listingId);
    else unselected.add(listingId);
    writeStored('cart-unselected', [...unselected]);
}

export interface CachedCart {
    cart: Cart;
    savedAt: string;
}

export function saveCart(cart: Cart): void {
    writeStored('cart', { cart, savedAt: new Date().toISOString() } satisfies CachedCart);
    const ids = new Set(cartItems(cart).map((item) => item.listing_id));
    writeStored('cart-unselected', [...getUnselected()].filter((id) => ids.has(id)));
}

export function getCachedCart(): CachedCart | null {
    return readStored<CachedCart>('cart');
}
