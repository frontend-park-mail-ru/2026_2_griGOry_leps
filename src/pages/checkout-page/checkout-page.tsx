import { Component, type Child } from '@/vdom';
import './checkout-page.scss';

import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { CheckoutSummary } from '@/components/checkout-summary/checkout-summary';
import { ChipGroup } from '@/components/chip-group/chip-group';
import { ChoiceCard } from '@/components/choice-card/choice-card';
import { FormField } from '@/components/form-field/form-field';
import {
    ApiError, createOrder, type CheckoutQuote, type DeliveryMethod, type PaymentMethod,
} from '@/lib/api';
import { DELIVERY_LABELS, PAYMENT_LABELS, refreshCartCount } from '@/lib/cart';
import {
    COMMENT_MAX, buildOrderData, checkoutSummary, dateChipLabel, deliveryLabel, deliveryTotal, formatPhone,
    initialCheckout, itemsCountText, needsCourier, orderTotal, slotLabel, validateCheckout,
    type CheckoutErrors, type CheckoutValues,
} from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { sanitizePhone } from '@/lib/validators';
import { navigate } from '@/router/router';

export interface CheckoutPageProps {
    quote: CheckoutQuote;
}

export interface CheckoutPageState {
    values: CheckoutValues;
    errors: CheckoutErrors;
    summary: string;
    formError: string;
    editRecipient: boolean;
    submitting: boolean;
    redirecting: boolean;
}

const SERVER_FIELDS: Record<string, keyof CheckoutErrors> = {
    'delivery.address': 'address',
    'delivery.time_slot': 'timeSlot',
    'delivery.comment': 'comment',
    'recipient.first_name': 'name',
    'recipient.phone': 'phone',
};

const SERVER_MESSAGES: Record<keyof CheckoutErrors, string> = {
    address: 'Укажите адрес доставки',
    timeSlot: 'Выберите время доставки',
    comment: `Не длиннее ${COMMENT_MAX} символов`,
    name: 'Проверьте имя получателя',
    phone: 'Номер указан не полностью, введите 10 цифр после +7',
};

function priceLabel(price: string): string {
    return Number(price) > 0 ? `${formatPrice(price)} ₽` : 'Бесплатно';
}

export class CheckoutPage extends Component<CheckoutPageProps, CheckoutPageState> {
    submitted = false;
    idempotencyKey = '';

    constructor(props: CheckoutPageProps) {
        super(props);
        this.state = {
            values: initialCheckout(props.quote),
            errors: {},
            summary: '',
            formError: '',
            editRecipient: false,
            submitting: false,
            redirecting: false,
        };
    }

    update(patch: Partial<CheckoutValues>) {
        const values = { ...this.state.values, ...patch };
        const next: Partial<CheckoutPageState> = { values };
        if (this.submitted) {
            const errors = validateCheckout(values);
            next.errors = errors;
            next.summary = this.state.summary ? checkoutSummary(errors) : '';
        }
        this.idempotencyKey = '';
        this.setState(next);
    }

    setMethod = (sellerId: number, method: DeliveryMethod) => {
        this.update({ methods: { ...this.state.values.methods, [sellerId]: method } });
    };

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;
        const value = input.name === 'phone' ? sanitizePhone(input.value) : input.value;
        if (input.name === 'phone') input.value = value;
        this.update({ [input.name]: value } as Partial<CheckoutValues>);
    };

    handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (this.state.submitting || this.state.redirecting) return;

        this.submitted = true;
        const { quote } = this.props;
        const { values } = this.state;
        const errors = validateCheckout(values);
        const summary = checkoutSummary(errors);
        this.setState({
            errors,
            summary,
            formError: '',
            editRecipient: this.state.editRecipient || Boolean(errors.name || errors.phone),
        });
        if (summary) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        this.idempotencyKey ||= crypto.randomUUID();
        this.setState({ submitting: true });
        try {
            const order = await createOrder(buildOrderData(quote, values), this.idempotencyKey);
            this.idempotencyKey = '';
            void refreshCartCount(true);

            if (order.status === 'awaiting_payment' && order.payment.confirmation_url) {
                this.setState({ redirecting: true });
                window.location.assign(order.payment.confirmation_url);
                return;
            }
            navigate(`/orders/${order.id}`);
        } catch (err) {
            logWarn('Не удалось оформить заказ:', err);
            this.setState({ submitting: false });
            this.showError(err);
        }
    };

    showError(err: unknown) {
        if (!(err instanceof ApiError)) {
            this.setState({ formError: 'Не удалось оформить заказ. Попробуйте ещё раз' });
            return;
        }
        if (!err.network && !err.timeout) this.idempotencyKey = '';

        if (err.status === 401) {
            navigate('/login');
            return;
        }
        if (err.status === 409) {
            showToast('Часть товаров уже купили или сняли с продажи — проверьте корзину', 'error');
            navigate('/cart');
            return;
        }

        const field = err.status === 400 ? SERVER_FIELDS[err.field] : undefined;
        if (field) {
            const errors = { ...this.state.errors, [field]: SERVER_MESSAGES[field] };
            this.setState({ errors, summary: checkoutSummary(errors), editRecipient: this.state.editRecipient || field === 'name' || field === 'phone' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        let message = 'Не удалось оформить заказ. Попробуйте ещё раз';
        if (err.network) message = 'Нет соединения с сервером. Проверьте интернет';
        else if (err.timeout) message = 'Сервер не отвечает. Попробуйте ещё раз';
        else if (err.field === 'delivery.by_seller') message = 'Способ получения больше недоступен. Обновите страницу';
        this.setState({ formError: message });
    }

    section(step: number, title: string, children: Child) {
        return (
            <section class="checkout-page__section">
                <h2 class="checkout-page__section-title">
                    <span class="checkout-page__step" aria-hidden="true">{step}</span>
                    {title}
                </h2>
                {children}
            </section>
        );
    }

    renderDelivery() {
        const { quote } = this.props;
        const { values } = this.state;
        const many = quote.sellers.length > 1;

        return quote.sellers.map((seller) => {
            const onlyPickup = seller.delivery_methods.every((m) => m.method === 'self_pickup' || !m.available);
            return (
                <div key={seller.seller_id} class="checkout-page__seller">
                    {many && <p class="checkout-page__seller-name">{seller.first_name} · {itemsCountText(seller.items_count)}</p>}
                    {onlyPickup && seller.delivery_methods.length > 1 && (
                        <p class="checkout-page__seller-hint">
                            {seller.first_name} не отправляет доставкой — {seller.items_count === 1 ? 'этот товар' : 'эти товары'} можно забрать только самовывозом
                        </p>
                    )}
                    <div class="checkout-page__choices">
                        {seller.delivery_methods.map((m) => (
                            <ChoiceCard
                                key={m.method}
                                name={`delivery-${seller.seller_id}`}
                                value={m.method}
                                title={DELIVERY_LABELS[m.method]}
                                hint={m.hint}
                                aside={priceLabel(m.price)}
                                checked={values.methods[seller.seller_id] === m.method}
                                disabled={!m.available}
                                onSelect={(value) => this.setMethod(seller.seller_id, value as DeliveryMethod)}
                            />
                        ))}
                    </div>
                </div>
            );
        });
    }

    renderAddress() {
        const { quote } = this.props;
        const { values, errors } = this.state;

        return [
            <div class="checkout-page__addresses">
                {quote.addresses.map((address) => (
                    <ChoiceCard
                        key={address.id}
                        name="address"
                        value={String(address.id)}
                        title={address.label}
                        hint={address.text}
                        checked={values.address === address.id}
                        onSelect={() => this.update({ address: address.id })}
                    />
                ))}
                {values.address === 'new' && (
                    <FormField
                        id="checkout-new-address"
                        name="newAddress"
                        label="Новый адрес"
                        placeholder="Город, улица, дом, квартира"
                        autocomplete="street-address"
                        value={values.newAddress}
                        error={errors.address}
                        onInput={this.handleInput}
                    />
                )}
            </div>,
            <div class="checkout-page__address-row">
                {values.address !== 'new' && (
                    <button type="button" class="checkout-page__link" onClick={() => this.update({ address: 'new' })}>+ Новый адрес</button>
                )}
                <span class="checkout-page__muted">
                    {values.address === 'new'
                        ? 'Сохранится только в этом заказе'
                        : 'Адреса из профиля, изменить их можно в настройках'}
                </span>
                {errors.address && values.address !== 'new' && <span class="checkout-page__error">{errors.address}</span>}
            </div>,
            <p class="checkout-page__label">Когда привезти</p>,
            <ChipGroup
                name="date"
                label="Дата доставки"
                options={quote.delivery_slots.dates.map((date) => ({ value: date, label: dateChipLabel(date) }))}
                value={values.date}
                onChange={(date) => this.update({ date })}
            />,
            <ChipGroup
                name="time"
                label="Время доставки"
                options={quote.delivery_slots.times.map((time) => ({ value: time, label: slotLabel(time) }))}
                value={values.timeSlot}
                invalid={Boolean(errors.timeSlot)}
                onChange={(timeSlot) => this.update({ timeSlot })}
            />,
            errors.timeSlot ? <p class="checkout-page__error">{errors.timeSlot}</p> : null,
            <div class={errors.comment ? 'form-field form-field--error' : 'form-field'}>
                <label class="form-field__label" for="checkout-comment">Комментарий курьеру</label>
                <div class="form-field__control checkout-page__comment">
                    <textarea
                        id="checkout-comment"
                        name="comment"
                        class="form-field__input checkout-page__comment-input"
                        rows="2"
                        placeholder="Например, позвоните за 30 минут"
                        value={values.comment}
                        aria-invalid={String(Boolean(errors.comment))}
                        onInput={this.handleInput}
                    />
                    <span class="checkout-page__counter">{values.comment.length} / {COMMENT_MAX}</span>
                </div>
                <p class="form-field__error">{errors.comment || null}</p>
            </div>,
        ];
    }

    renderRecipient() {
        const { values, errors, editRecipient } = this.state;

        if (!editRecipient) {
            return (
                <div class="checkout-page__recipient">
                    <span class="checkout-page__recipient-text">
                        <span class="checkout-page__recipient-name">{values.name}, {formatPhone(values.phone)}</span>
                        <span class="checkout-page__muted">Из профиля. Изменения коснутся только этого заказа</span>
                    </span>
                    <button type="button" class="checkout-page__link" onClick={() => this.setState({ editRecipient: true })}>Изменить</button>
                </div>
            );
        }

        return (
            <div class="checkout-page__recipient-fields">
                <FormField
                    id="checkout-name"
                    name="name"
                    label="Имя"
                    autocomplete="given-name"
                    value={values.name}
                    error={errors.name}
                    onInput={this.handleInput}
                />
                <FormField
                    id="checkout-phone"
                    name="phone"
                    label="Телефон"
                    inputmode="tel"
                    autocomplete="tel"
                    value={values.phone}
                    error={errors.phone}
                    onInput={this.handleInput}
                />
            </div>
        );
    }

    renderPayment() {
        const { quote } = this.props;
        const { values } = this.state;

        return (
            <div class="checkout-page__choices">
                {quote.payment_methods.map(({ method }) => (
                    <ChoiceCard
                        key={method}
                        name="payment"
                        value={method}
                        title={PAYMENT_LABELS[method].title}
                        hint={PAYMENT_LABELS[method].hint}
                        checked={values.payment === method}
                        onSelect={(value) => this.update({ payment: value as PaymentMethod })}
                    />
                ))}
            </div>
        );
    }

    render() {
        const { quote } = this.props;
        const { values, summary, formError, submitting, redirecting } = this.state;
        const courier = needsCourier(values);
        const total = orderTotal(quote, values);
        const cod = values.payment === 'cod';

        let buttonText = cod ? 'Оформить заказ' : `Оплатить ${formatPrice(total)} ₽`;
        if (submitting && cod) buttonText = 'Оформляем…';
        if (redirecting || (submitting && !cod)) buttonText = 'Обрабатываем платёж…';

        let step = 0;
        return (
            <div class="checkout-page">
                <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Корзина', href: '/cart' }, { label: 'Оформление заказа' }]} />
                <h1 class="checkout-page__title">Оформление заказа</h1>
                {summary && <p class="checkout-page__summary" role="alert">{summary}</p>}

                <form class="checkout-page__layout" novalidate onSubmit={this.handleSubmit}>
                    <div class="checkout-page__main">
                        {this.section(++step, 'Способ получения', this.renderDelivery())}
                        {courier && this.section(++step, 'Адрес доставки', this.renderAddress())}
                        {this.section(++step, 'Получатель', this.renderRecipient())}
                        {this.section(++step, 'Оплата', this.renderPayment())}
                        {formError && <p class="checkout-page__form-error" role="alert">{formError}</p>}
                    </div>
                    <aside class="checkout-page__aside">
                        <CheckoutSummary
                            items={quote.items}
                            itemsTotal={quote.items_total}
                            deliveryLabel={deliveryLabel(values)}
                            delivery={deliveryTotal(quote, values)}
                            total={total}
                            buttonText={buttonText}
                            agreeWord={cod ? 'Оформить заказ' : 'Оплатить'}
                            busy={submitting || redirecting}
                        />
                    </aside>
                </form>
            </div>
        );
    }
}
