import { formatPrice, plural } from '@/lib/format';
import './cart-summary.scss';

export interface CartSummaryProps {
    selectedCount: number;
    availableCount: number;
    total: string;
    unavailableCount: number;
    disabled: boolean;
    onCheckout: () => void;
}

function unavailableText(count: number): string {
    const what = plural(count, ['товар уже недоступен', 'товара уже недоступны', 'товаров уже недоступны']);
    return `${count} ${what} и не ${count === 1 ? 'попадёт' : 'попадут'} в заказ`;
}

export const CartSummary = ({ selectedCount, availableCount, total, unavailableCount, disabled, onCheckout }: CartSummaryProps) => {
    const goods = selectedCount === availableCount ? `Товары · ${selectedCount}` : `Товары · ${selectedCount} из ${availableCount}`;

    return (
        <div class="cart-summary">
            <section class="cart-summary__card" aria-label="Ваш заказ">
                <h2 class="cart-summary__title">Ваш заказ</h2>
                <div class="cart-summary__row">
                    <span>{goods}</span>
                    <span>{formatPrice(total)} ₽</span>
                </div>
                <div class="cart-summary__row cart-summary__row--total">
                    <span>Итог</span>
                    <span>{formatPrice(total)} ₽</span>
                </div>
                <button
                    type="button"
                    class="cart-summary__checkout"
                    disabled={disabled || selectedCount === 0}
                    onClick={onCheckout}
                >Перейти к оформлению</button>
                <p class="cart-summary__note">
                    Товары разных продавцов оформляются одним заказом и одной оплатой, а способ получения выбирается для каждого продавца.
                    Оплата через Безопасную сделку: продавец получит деньги только после того, как вы получите товар.
                </p>
            </section>
            {unavailableCount > 0 && <p class="cart-summary__warning" role="status">{unavailableText(unavailableCount)}</p>}
        </div>
    );
};
