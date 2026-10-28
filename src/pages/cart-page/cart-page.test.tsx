import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError, type Cart } from '@/lib/api';
import { clearUser, setUser } from '@/store';
import { CartPage } from './cart-page';

const api = vi.hoisted(() => ({
    getCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    removeFromCartBulk: vi.fn(),
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

vi.mock('@/lib/toast', () => toast);

function item(id: number) {
    return {
        listing_id: id,
        title: `Товар ${id}`,
        price: '1000.00',
        image_url: null,
        address: 'Москва',
        delivery_from: null,
        availability: 'available' as const,
        unavailable_reason: null,
    };
}

const cart: Cart = {
    items_count: 2,
    groups: [{ seller: { id: 7, first_name: 'Анна', avatar_url: null, rating: 4.8 }, items: [item(1), item(2)] }],
};

let root: HTMLElement;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setUser({ id: 1, email: 't@mail.ru', first_name: 'Тимур', phone: '+79991234567' });
    api.getCart.mockResolvedValue(cart);
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

afterEach(() => {
    clearUser();
});

async function removeAll() {
    render(root, <CartPage />);
    await tick();
    root.querySelector<HTMLButtonElement>('.cart-page__remove-selected')!.click();
    await tick();
    const [, , action] = toast.showToast.mock.calls[0];
    return action as { label: string; onClick: () => void };
}

describe('CartPage', () => {
    it('показывает товары и итог по выбранным', async () => {
        render(root, <CartPage />);
        await tick();

        expect(root.querySelector('.cart-page__title')?.textContent).toBe('Корзина · 2 товара');
        expect(root.querySelectorAll('.cart-item')).toHaveLength(2);
        expect(root.querySelector('.cart-summary__row--total')?.textContent?.replace(/\s/g, ' ')).toBe('Итого2 000 ₽');
    });

    it('возвращает удалённые товары по одному запросу на товар', async () => {
        api.removeFromCartBulk.mockResolvedValue({ items_count: 0 });
        api.addToCart.mockResolvedValue({ items_count: 2 });

        const action = await removeAll();
        expect(action.label).toBe('Вернуть');
        expect(root.querySelector('.cart-page__empty-title')?.textContent).toBe('В корзине пока пусто');

        action.onClick();
        await tick();
        await tick();

        expect(api.addToCart.mock.calls).toEqual([[1], [2]]);
        expect(root.querySelectorAll('.cart-item')).toHaveLength(2);
        expect(toast.showToast).toHaveBeenLastCalledWith('Товары вернулись в корзину', 'success');
    });

    it('пишет, что часть товаров уже недоступна', async () => {
        api.removeFromCartBulk.mockResolvedValue({ items_count: 0 });
        api.addToCart.mockResolvedValueOnce({ items_count: 1 }).mockRejectedValueOnce(new ApiError(409));
        api.getCart.mockResolvedValueOnce(cart).mockResolvedValueOnce({ ...cart, items_count: 1, groups: [{ ...cart.groups[0], items: [item(1)] }] });

        const action = await removeAll();
        action.onClick();
        await tick();
        await tick();

        expect(toast.showToast).toHaveBeenLastCalledWith('Вернули не всё, уже недоступно: 1 товар', 'info');
    });
});
