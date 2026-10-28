import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Cart, User } from '@/lib/api';
import { getCachedCart, getUnselected, saveCart, setSelected } from '@/lib/cart';
import { clearUser, setUser } from '@/store';

const item = (id: number) => ({ listing_id: id, title: 'Товар', price: '100.00', availability: 'available' }) as Cart['groups'][number]['items'][number];
const cart = (ids: number[]): Cart => ({
    items_count: ids.length,
    groups: [{ seller: { id: 1, first_name: 'Анна', avatar_url: null, rating: 5 }, items: ids.map(item) }],
});

describe('хранение корзины', () => {
    beforeEach(() => {
        localStorage.clear();
        setUser({ id: 7 } as User);
    });
    afterEach(() => clearUser());

    it('запоминает снятые галочки отдельно для пользователя', () => {
        setSelected(1, false);
        setSelected(2, false);
        setSelected(2, true);
        expect([...getUnselected()]).toEqual([1]);

        setUser({ id: 8 } as User);
        expect(getUnselected().size).toBe(0);
    });

    it('сохраняет корзину и забывает выбор у удалённых позиций', () => {
        setSelected(1, false);
        setSelected(3, false);
        saveCart(cart([1, 2]));
        expect([...getUnselected()]).toEqual([1]);
        expect(getCachedCart()?.cart.items_count).toBe(2);
    });

    it('гостю ничего не сохраняет', () => {
        clearUser();
        setSelected(1, false);
        saveCart(cart([1]));
        expect(getUnselected().size).toBe(0);
        expect(getCachedCart()).toBeNull();
    });
});
