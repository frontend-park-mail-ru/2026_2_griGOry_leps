import './cart-link.scss';

const CartIcon = () => (
    <svg class="cart-link__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6.2" />
        <circle cx="9.5" cy="19" r="1.4" />
        <circle cx="17" cy="19" r="1.4" />
    </svg>
);

export const CartLink = ({ count }: { count: number }) => (
    <a
        href="/cart"
        data-link
        class="cart-link"
        aria-label={count ? `Корзина, товаров: ${count}` : 'Корзина'}
    >
        <CartIcon />
        {count > 0 && <span class="cart-link__badge">{count > 99 ? '99+' : count}</span>}
    </a>
);
