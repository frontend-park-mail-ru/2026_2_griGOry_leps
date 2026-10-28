import { assetUrl, type OrderItem } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import './checkout-summary.scss';

export interface CheckoutSummaryProps {
    items: OrderItem[];
    itemsTotal: string;
    deliveryLabel: string;
    delivery: string;
    total: string;
    buttonText: string;
    agreeWord: string;
    busy: boolean;
}

export const CheckoutSummary = ({ items, itemsTotal, deliveryLabel, delivery, total, buttonText, agreeWord, busy }: CheckoutSummaryProps) => (
    <section class="checkout-summary" aria-label="Ваш заказ">
        <h2 class="checkout-summary__title">Ваш заказ</h2>
        <ul class="checkout-summary__items">
            {items.map((item) => {
                const image = assetUrl(item.image_url);
                return (
                    <li key={item.listing_id} class="checkout-summary__item">
                        <span class="checkout-summary__photo">
                            {image && <img class="checkout-summary__image" src={image} alt="" />}
                        </span>
                        <span class="checkout-summary__name">{item.title}</span>
                        <span class="checkout-summary__price">{formatPrice(item.price)} ₽</span>
                    </li>
                );
            })}
        </ul>
        <hr class="checkout-summary__divider" />
        <div class="checkout-summary__row">
            <span>Товары · {items.length}</span>
            <span>{formatPrice(itemsTotal)} ₽</span>
        </div>
        <div class="checkout-summary__row">
            <span>{deliveryLabel}</span>
            <span>{Number(delivery) > 0 ? `${formatPrice(delivery)} ₽` : 'Бесплатно'}</span>
        </div>
        <div class="checkout-summary__row checkout-summary__row--total">
            <span>Итого</span>
            <span>{formatPrice(total)} ₽</span>
        </div>
        <button type="submit" class="checkout-summary__submit" disabled={busy}>{buttonText}</button>
        <p class="checkout-summary__note">
            Нажимая «{agreeWord}», вы соглашаетесь с условиями Безопасной сделки.
            Деньги получат продавцы после того, как вы заберёте заказ.
        </p>
    </section>
);
