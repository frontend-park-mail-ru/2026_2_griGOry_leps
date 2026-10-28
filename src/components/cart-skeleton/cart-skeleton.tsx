import './cart-skeleton.scss';

const Row = () => (
    <div class="cart-skeleton__row">
        <span class="cart-skeleton__photo" />
        <span class="cart-skeleton__lines">
            <span class="cart-skeleton__line cart-skeleton__line--title" />
            <span class="cart-skeleton__line" />
            <span class="cart-skeleton__line" />
            <span class="cart-skeleton__line cart-skeleton__line--short" />
        </span>
    </div>
);

export const CartSkeleton = () => (
    <div class="cart-skeleton" aria-busy="true" aria-label="Загрузка корзины">
        <div class="cart-skeleton__list">
            <Row />
            <Row />
            <Row />
        </div>
        <div class="cart-skeleton__aside">
            <span class="cart-skeleton__line cart-skeleton__line--title" />
            <span class="cart-skeleton__line" />
            <span class="cart-skeleton__line" />
            <span class="cart-skeleton__line" />
        </div>
    </div>
);
