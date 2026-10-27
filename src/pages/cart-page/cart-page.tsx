import { Component } from '@/vdom';
import './cart-page.scss';

import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { CartSellerGroup } from '@/components/cart-seller-group/cart-seller-group';
import { CartSkeleton } from '@/components/cart-skeleton/cart-skeleton';
import { CartSummary } from '@/components/cart-summary/cart-summary';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ApiError, addToCartBulk, getCart, removeFromCart, removeFromCartBulk, type Cart } from '@/lib/api';
import {
    cartItems, getCachedCart, getUnselected, isAvailable, itemsTotal, saveCart, selectedItems, setCartCount, setSelected,
} from '@/lib/cart';
import { itemsCountText } from '@/lib/checkout';
import { logWarn } from '@/lib/logger';
import { showToast, type ToastType } from '@/lib/toast';
import { navigate } from '@/router/router';

type Status = 'loading' | 'ready' | 'cached' | 'offline' | 'error';

export interface CartPageState {
    status: Status;
    cart: Cart | null;
    savedAt: string | null;
    busy: boolean;
    selection: number;
}

function restoreToast(total: number, skipped: number): [string, ToastType] {
    if (skipped === 0) return [total === 1 ? 'Товар вернулся в корзину' : 'Товары вернулись в корзину', 'success'];
    if (skipped === total) return [total === 1 ? 'Товар уже недоступен' : 'Товары уже недоступны', 'error'];
    return [`Вернули не всё, уже недоступно: ${itemsCountText(skipped)}`, 'info'];
}

function withoutItems(cart: Cart, ids: number[]): Cart {
    const groups = cart.groups
        .map((group) => ({ ...group, items: group.items.filter((item) => !ids.includes(item.listing_id)) }))
        .filter((group) => group.items.length > 0);
    return { items_count: groups.reduce((n, g) => n + g.items.length, 0), groups };
}

export class CartPage extends Component<object, CartPageState> {
    state: CartPageState = { status: 'loading', cart: null, savedAt: null, busy: false, selection: 0 };

    componentDidMount() {
        void this.load();
    }

    load = async () => {
        this.setState({ status: 'loading' });
        try {
            const cart = await getCart();
            setCartCount(cart.items_count);
            saveCart(cart);
            this.setState({ status: 'ready', cart, savedAt: null });
        } catch (err) {
            logWarn('Не удалось загрузить корзину:', err);
            if (err instanceof ApiError && err.status === 401) {
                navigate('/login');
                return;
            }
            const offline = err instanceof ApiError && (err.network || err.timeout);
            const cached = offline ? getCachedCart() : null;
            if (cached) {
                this.setState({ status: 'cached', cart: cached.cart, savedAt: cached.savedAt });
                return;
            }
            this.setState({ status: offline ? 'offline' : 'error' });
        }
    };

    handleToggle = (listingId: number, selected: boolean) => {
        setSelected(listingId, selected);
        this.setState({ selection: this.state.selection + 1 });
    };

    handleToggleAll = (e: Event) => {
        const selectAll = (e.target as HTMLInputElement).checked;
        cartItems(this.state.cart!).filter(isAvailable).forEach((item) => setSelected(item.listing_id, selectAll));
        this.setState({ selection: this.state.selection + 1 });
    };

    async remove(ids: number[]) {
        const { cart } = this.state;
        if (!cart || !ids.length) return;

        this.setState({ busy: true });
        try {
            const { items_count: count } = ids.length === 1
                ? await removeFromCart(ids[0])
                : await removeFromCartBulk(ids);
            setCartCount(count);
            const rest = withoutItems(this.state.cart!, ids);
            saveCart(rest);
            this.setState({ cart: rest });
            const message = ids.length === 1 ? 'Товар удалён из корзины' : `Удалено: ${itemsCountText(ids.length)}`;
            showToast(message, 'info', { label: 'Вернуть', onClick: () => void this.restore(ids) });
        } catch (err) {
            logWarn('Не удалось удалить из корзины:', err);
            showToast(this.errorText(err, 'Не удалось удалить товар. Попробуйте ещё раз'), 'error');
        } finally {
            this.setState({ busy: false });
        }
    }

    async restore(ids: number[]) {
        this.setState({ busy: true });
        try {
            const { skipped_ids: skipped } = await addToCartBulk(ids);
            const cart = await getCart();
            setCartCount(cart.items_count);
            saveCart(cart);
            this.setState({ cart, status: 'ready', savedAt: null });
            showToast(...restoreToast(ids.length, skipped.length));
        } catch (err) {
            logWarn('Не удалось вернуть в корзину:', err);
            showToast(this.errorText(err, 'Не удалось вернуть товар'), 'error');
        } finally {
            this.setState({ busy: false });
        }
    }

    errorText(err: unknown, fallback: string): string {
        if (err instanceof ApiError && (err.network || err.timeout)) return 'Нет соединения. Проверьте интернет';
        if (err instanceof ApiError && err.status === 409) return 'Товар уже недоступен';
        return fallback;
    }

    handleRemove = (listingId: number) => {
        void this.remove([listingId]);
    };

    handleRemoveSelected = () => {
        void this.remove(selectedItems(this.state.cart!, getUnselected()).map((item) => item.listing_id));
    };

    handleCheckout = () => {
        const ids = selectedItems(this.state.cart!, getUnselected()).map((item) => item.listing_id);
        if (ids.length) navigate(`/checkout?ids=${ids.join(',')}`);
    };

    renderOfflineBanner() {
        const { savedAt, busy } = this.state;
        const time = savedAt ? new Date(savedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
        return (
            <div class="cart-page__offline" role="status">
                <div class="cart-page__offline-text">
                    <strong class="cart-page__offline-title">Нет соединения</strong>
                    <span>Показываем корзину на {time}. Цены и наличие могли измениться, оформить заказ можно после подключения</span>
                </div>
                <button type="button" class="cart-page__offline-retry" disabled={busy} onClick={this.load}>Обновить</button>
            </div>
        );
    }

    renderContent() {
        const { status, cart } = this.state;
        const busy = this.state.busy || status === 'cached';

        if (status === 'loading') return <CartSkeleton />;
        if (status === 'offline' || status === 'error') {
            return (
                <div class="cart-page__state">
                    <EmptyState
                        title={status === 'offline' ? 'Нет соединения' : 'Не удалось загрузить корзину'}
                        text={status === 'offline'
                            ? 'Проверьте подключение к интернету и попробуйте снова'
                            : 'Попробуйте обновить страницу чуть позже'}
                        action={{ label: 'Обновить', onClick: this.load }}
                    />
                </div>
            );
        }
        if (!cart || cart.items_count === 0) {
            return (
                <div class="cart-page__state">
                    <EmptyState
                        title="В корзине пока пусто"
                        text="Добавляйте товары кнопкой «В корзину» на странице объявления, оформим всё одним заказом"
                        action={{ label: 'Перейти к покупкам', href: '/' }}
                    />
                </div>
            );
        }

        const unselected = getUnselected();
        const available = cartItems(cart).filter(isAvailable);
        const selected = selectedItems(cart, unselected);
        const allSelected = available.length > 0 && selected.length === available.length;

        return (
            <div class="cart-page__layout">
                {status === 'cached' && this.renderOfflineBanner()}
                <div class="cart-page__main">
                    <div class="cart-page__toolbar">
                        <label class="cart-page__select-all">
                            <input
                                class="cart-page__select-all-input"
                                type="checkbox"
                                checked={allSelected}
                                disabled={busy || available.length === 0}
                                onChange={this.handleToggleAll}
                            />
                            Выбрать все
                        </label>
                        <button
                            type="button"
                            class="cart-page__remove-selected"
                            disabled={busy || selected.length === 0}
                            onClick={this.handleRemoveSelected}
                        >Удалить выбранные</button>
                    </div>
                    {cart.groups.map((group) => (
                        <CartSellerGroup
                            key={group.seller.id}
                            group={group}
                            unselected={unselected}
                            disabled={busy}
                            onToggle={this.handleToggle}
                            onRemove={this.handleRemove}
                        />
                    ))}
                </div>
                <aside class="cart-page__aside">
                    <CartSummary
                        selectedCount={selected.length}
                        availableCount={available.length}
                        total={itemsTotal(selected)}
                        unavailableCount={cart.items_count - available.length}
                        disabled={busy}
                        onCheckout={this.handleCheckout}
                    />
                </aside>
            </div>
        );
    }

    render() {
        const { cart, status } = this.state;
        const count = (status === 'ready' || status === 'cached') && cart ? cart.items_count : 0;

        return (
            <div class="cart-page">
                <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Корзина' }]} />
                <h1 class="cart-page__title">{count ? `Корзина · ${itemsCountText(count)}` : 'Корзина'}</h1>
                {this.renderContent()}
            </div>
        );
    }
}
