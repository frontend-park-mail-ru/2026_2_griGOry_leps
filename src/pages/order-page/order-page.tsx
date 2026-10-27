import { Component } from '@/vdom';
import './order-page.scss';

import { ChoiceCard } from '@/components/choice-card/choice-card';
import { OrderStatus } from '@/components/order-status/order-status';
import { ApiError, getOrder, payOrder, type Order, type PaymentMethod } from '@/lib/api';
import { PAYMENT_LABELS } from '@/lib/cart';
import { orderPlacedText, payTimeLeft } from '@/lib/checkout';
import { logWarn } from '@/lib/logger';

const POLL_MS = 2000;
const POLL_TRIES = 30;
const METHODS: PaymentMethod[] = ['card', 'sbp', 'cod'];

export interface OrderPageState {
    order: Order;
    stalled: boolean;
    choosing: boolean;
    method: PaymentMethod;
    busy: boolean;
    error: string;
    now: number;
}

function isPending(order: Order): boolean {
    return order.status === 'awaiting_payment' && ['pending', 'processing'].includes(order.payment.status);
}

export class OrderPage extends Component<{ order: Order }, OrderPageState> {
    pollTimer: ReturnType<typeof setTimeout> | null = null;
    clockTimer: ReturnType<typeof setInterval> | null = null;
    tries = 0;
    pollId = 0;
    mounted = false;

    constructor(props: { order: Order }) {
        super(props);
        this.state = {
            order: props.order,
            stalled: false,
            choosing: false,
            method: props.order.payment.method,
            busy: false,
            error: '',
            now: Date.now(),
        };
    }

    componentDidMount() {
        this.mounted = true;
        if (isPending(this.state.order)) this.schedulePoll();
        this.clockTimer = setInterval(() => this.setState({ now: Date.now() }), 1000);
        window.addEventListener('pageshow', this.handlePageShow);
    }

    componentWillUnmount() {
        this.mounted = false;
        this.stopPoll();
        if (this.clockTimer) clearInterval(this.clockTimer);
        window.removeEventListener('pageshow', this.handlePageShow);
    }

    handlePageShow = (e: PageTransitionEvent) => {
        if (e.persisted) this.setState({ busy: false });
    };

    stopPoll() {
        if (this.pollTimer) clearTimeout(this.pollTimer);
        this.pollTimer = null;
        this.pollId += 1;
    }

    schedulePoll() {
        this.stopPoll();
        const id = this.pollId;
        this.pollTimer = setTimeout(() => {
            if (id === this.pollId) void this.poll();
        }, POLL_MS);
    }

    poll = async () => {
        this.stopPoll();
        const id = this.pollId;
        this.tries += 1;
        let pending = true;
        try {
            const order = await getOrder(this.state.order.id);
            if (id !== this.pollId || !this.mounted) return;
            this.setState({ order });
            pending = isPending(order);
        } catch (err) {
            if (id !== this.pollId || !this.mounted) return;
            logWarn('Не удалось получить статус заказа:', err);
        }
        if (!pending) return;
        if (this.tries < POLL_TRIES) this.schedulePoll();
        else this.setState({ stalled: true });
    };

    checkAgain = () => {
        this.tries = 0;
        this.setState({ stalled: false });
        void this.poll();
    };

    pay = async (method: PaymentMethod) => {
        this.stopPoll();
        this.setState({ busy: true, error: '' });
        try {
            const order = await payOrder(this.state.order.id, method);
            if (order.payment.confirmation_url && order.status === 'awaiting_payment') {
                window.location.assign(order.payment.confirmation_url);
                return;
            }
            this.tries = 0;
            this.setState({ order, busy: false, choosing: false });
            if (isPending(order)) this.schedulePoll();
        } catch (err) {
            logWarn('Не удалось повторить оплату:', err);
            let error = 'Не удалось начать оплату. Попробуйте ещё раз';
            if (err instanceof ApiError && err.status === 409) error = 'Заказ уже оплачен или отменён. Обновите страницу';
            else if (err instanceof ApiError && (err.network || err.timeout)) error = 'Нет соединения. Проверьте интернет';
            this.setState({ busy: false, error });
        }
    };

    renderFailed() {
        const { order, choosing, method, busy, error, now } = this.state;
        const left = payTimeLeft(order.pay_until, now);

        return (
            <OrderStatus
                kind="error"
                title="Оплата не прошла"
                text="Банк отклонил платёж, деньги не списаны. Заказ ждёт оплаты 1 час — оплатить можно здесь. Если не успеете, товары останутся в корзине, а заказ нужно будет оформить заново."
                note={left ? `Заказ № ${order.number} · ждёт оплаты ещё ${left}` : `Заказ № ${order.number}`}
            >
                {choosing ? [
                    <div class="order-page__methods" role="radiogroup" aria-label="Способ оплаты">
                        {METHODS.map((m) => (
                            <ChoiceCard
                                key={m}
                                name="retry-payment"
                                value={m}
                                title={PAYMENT_LABELS[m].title}
                                hint={PAYMENT_LABELS[m].hint}
                                checked={method === m}
                                onSelect={(value) => this.setState({ method: value as PaymentMethod })}
                            />
                        ))}
                    </div>,
                    <button type="button" class="order-page__primary" disabled={busy} onClick={() => void this.pay(method)}>
                        {method === 'cod' ? 'Оплатить при получении' : 'Оплатить'}
                    </button>,
                ] : [
                    <button type="button" class="order-page__primary" disabled={busy} onClick={() => void this.pay(order.payment.method)}>
                        Попробовать снова
                    </button>,
                    <button type="button" class="order-page__secondary" disabled={busy} onClick={() => this.setState({ choosing: true })}>
                        Выбрать другой способ
                    </button>,
                ]}
                {error ? <p class="order-page__error" role="alert">{error}</p> : null}
            </OrderStatus>
        );
    }

    renderContent() {
        const { order, stalled } = this.state;

        if (order.status === 'placed') {
            return (
                <OrderStatus kind="success" title={`Заказ № ${order.number} оформлен`} text={orderPlacedText(order)}>
                    <a class="order-page__primary" href="/" data-link>Продолжить покупки</a>
                </OrderStatus>
            );
        }

        if (order.status === 'cancelled') {
            return (
                <OrderStatus
                    kind="error"
                    title="Время на оплату истекло"
                    text="Заказ отменён, деньги не списаны. Товары остались в корзине — оформите заказ заново."
                    note={`Заказ № ${order.number}`}
                >
                    <a class="order-page__primary" href="/cart" data-link>Вернуться в корзину</a>
                </OrderStatus>
            );
        }

        if (order.payment.status === 'failed') return this.renderFailed();

        return (
            <OrderStatus
                kind="pending"
                title={stalled ? 'Платёж ещё обрабатывается' : 'Обрабатываем платёж…'}
                text={stalled
                    ? 'Банк пока не ответил. Проверьте статус чуть позже — деньги не спишутся дважды.'
                    : 'Обычно это занимает несколько секунд. Не закрывайте страницу.'}
                note={`Заказ № ${order.number}`}
            >
                {stalled && <button type="button" class="order-page__primary" onClick={this.checkAgain}>Проверить ещё раз</button>}
            </OrderStatus>
        );
    }

    render() {
        return <div class="order-page">{this.renderContent()}</div>;
    }
}
