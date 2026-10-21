import { Component } from '@/vdom';
import './listing-page.scss';

import { Button } from '@/components/button/button';
import { Modal } from '@/components/modal/modal';
import { ProductCard } from '@/components/product-card/product-card';
import {
    ApiError, addToCart, closeListing, deleteListing,
    type AdCard, type CloseReason, type Listing, type User,
} from '@/lib/api';
import { formatDate, formatPrice, plural } from '@/lib/format';
import { CLOSE_REASON_LABELS, CONDITION_LABELS, STATUS_LABELS } from '@/lib/listing';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { navigate } from '@/router/router';

export interface ListingPageProps {
    listing: Listing;
    similar: AdCard[];
    user: User | null;
}

/** blocked — удалить нельзя: по объявлению есть заказ */
type Dialog = 'close' | 'delete' | 'blocked' | null;

export interface ListingPageState {
    listing: Listing;
    photoIndex: number;
    dialog: Dialog;
    closeReason: CloseReason | '';
    dialogError: string;
    busy: boolean;
    cartError: string;
}

const CLOSE_REASONS = Object.keys(CLOSE_REASON_LABELS) as CloseReason[];

const CLOSE_REASON_HINTS: Partial<Record<CloseReason, string>> = {
    sold_on_goget: 'Покупатель сможет оставить отзыв',
};

/** Плашка над объявлением, когда оно не в продаже */
function statusNotice(listing: Listing): string {
    if (listing.is_owner) {
        switch (listing.status) {
            case 'draft': return 'Черновик. Объявление видно только вам';
            case 'moderation': return 'Объявление на проверке. Обычно это занимает до 30 минут, потом оно появится в поиске';
            case 'closed': {
                const reason = listing.close_reason ? ` · ${CLOSE_REASON_LABELS[listing.close_reason]}` : '';
                return `Снято с продажи${reason}. Покупатели его не видят в поиске`;
            }
            case 'sold': return 'Товар продан';
            default: return '';
        }
    }
    if (listing.status === 'sold') return 'Товар продан';
    if (listing.status === 'closed') return 'Продавец снял объявление с продажи';
    return '';
}

function priceText(listing: Listing): string {
    if (listing.is_free) return 'Даром';
    if (listing.price === null) return 'Цена не указана';
    return `${formatPrice(listing.price)} ₽`;
}

export class ListingPage extends Component<ListingPageProps, ListingPageState> {
    constructor(props: ListingPageProps) {
        super(props);
        this.state = {
            listing: props.listing,
            photoIndex: 0,
            dialog: null,
            closeReason: '',
            dialogError: '',
            busy: false,
            cartError: '',
        };
    }

    openDialog = (dialog: Dialog) => {
        this.setState({ dialog, dialogError: '', closeReason: '' });
    };

    closeDialog = () => {
        this.setState({ dialog: null, dialogError: '' });
    };

    handleReasonChange = (e: Event) => {
        this.setState({ closeReason: (e.target as HTMLInputElement).value as CloseReason, dialogError: '' });
    };

    handleClose = async () => {
        const { listing, closeReason } = this.state;
        if (!closeReason) {
            this.setState({ dialogError: 'Выберите причину' });
            return;
        }

        this.setState({ busy: true, dialogError: '' });
        try {
            const updated = await closeListing(listing.id, closeReason);
            this.setState({ listing: updated, dialog: null });
            showToast('Объявление снято с продажи');
        } catch (err) {
            logWarn('Не удалось снять объявление:', err);
            this.setState({ dialogError: this.actionError(err, 'Не удалось снять объявление. Попробуйте ещё раз') });
        } finally {
            this.setState({ busy: false });
        }
    };

    handleDelete = async () => {
        this.setState({ busy: true, dialogError: '' });
        try {
            await deleteListing(this.state.listing.id);
            showToast('Объявление удалено', 'info');
            navigate('/');
        } catch (err) {
            logWarn('Не удалось удалить объявление:', err);
            if (err instanceof ApiError && err.status === 409) {
                this.setState({ busy: false, dialog: 'blocked' });
                return;
            }
            this.setState({ busy: false, dialogError: this.actionError(err, 'Не удалось удалить объявление. Попробуйте ещё раз') });
        }
    };

    actionError(err: unknown, fallback: string): string {
        if (!(err instanceof ApiError)) return fallback;
        if (err.network) return 'Нет соединения с сервером. Проверьте интернет';
        if (err.timeout) return 'Сервер не отвечает. Попробуйте ещё раз';
        if (err.status === 409) return 'Объявление уже не активно. Обновите страницу';
        if (err.status === 404) return 'Объявление уже удалено';
        if (err.status === 401) return 'Сессия истекла. Войдите заново';
        return fallback;
    }

    handleAddToCart = async () => {
        if (!this.props.user) {
            navigate('/login');
            return;
        }

        this.setState({ busy: true, cartError: '' });
        try {
            await addToCart(this.state.listing.id);
            this.setState({ listing: { ...this.state.listing, in_cart: true } });
            showToast('Товар добавлен в корзину');
        } catch (err) {
            logWarn('Не удалось добавить в корзину:', err);
            const message = err instanceof ApiError && err.status === 409
                ? 'Товар уже недоступен'
                : 'Не удалось добавить в корзину. Попробуйте ещё раз';
            this.setState({ cartError: message });
        } finally {
            this.setState({ busy: false });
        }
    };

    showPhoto = (index: number) => {
        const count = this.state.listing.photos.length;
        if (count) this.setState({ photoIndex: (index + count) % count });
    };

    renderGallery(listing: Listing) {
        const { photos, title } = listing;
        const index = Math.min(this.state.photoIndex, Math.max(photos.length - 1, 0));
        const current = photos[index];
        const many = photos.length > 1;

        return (
            <div class="listing-gallery">
                <div class="listing-gallery__main">
                    {current
                        ? <img src={current.url} alt={title} />
                        : <span class="listing-gallery__empty">Нет фото</span>}
                    {many && [
                        <button
                            type="button"
                            class="listing-gallery__arrow listing-gallery__arrow--prev"
                            aria-label="Предыдущее фото"
                            onClick={() => this.showPhoto(index - 1)}
                        />,
                        <button
                            type="button"
                            class="listing-gallery__arrow listing-gallery__arrow--next"
                            aria-label="Следующее фото"
                            onClick={() => this.showPhoto(index + 1)}
                        />,
                        <span class="listing-gallery__counter">{index + 1} / {photos.length}</span>,
                    ]}
                </div>
                {many && (
                    <div class="listing-gallery__thumbs">
                        {photos.map((photo, i) => (
                            <button
                                key={photo.id}
                                type="button"
                                class={i === index ? 'listing-gallery__thumb listing-gallery__thumb--active' : 'listing-gallery__thumb'}
                                aria-label={`Фото ${i + 1}`}
                                aria-pressed={String(i === index)}
                                onClick={() => this.showPhoto(i)}
                            >
                                <img src={photo.thumb_url} alt="" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    renderPriceCard(listing: Listing) {
        const { busy, cartError } = this.state;

        return (
            <section class="listing-card listing-buy">
                {listing.is_owner && (
                    <span class={`listing-status listing-status--${listing.status}`}>{STATUS_LABELS[listing.status]}</span>
                )}
                <span class="listing-buy__price">{priceText(listing)}</span>
                {(listing.is_negotiable || listing.has_delivery) && (
                    <div class="listing-buy__tags">
                        {listing.is_negotiable && !listing.is_free && <span class="listing-tag">Торг уместен</span>}
                        {listing.has_delivery && <span class="listing-tag listing-tag--delivery">Доставка</span>}
                    </div>
                )}

                {listing.is_owner ? (
                    <div class="listing-buy__actions">
                        {listing.status !== 'sold' && (
                            <a href={`/listing/${listing.id}/edit`} data-link class="listing-buy__link">Редактировать</a>
                        )}
                        {listing.status === 'active' && (
                            <Button text="Снять с продажи" variant="secondary" block disabled={busy} onClick={() => this.openDialog('close')} />
                        )}
                        <Button text="Удалить" variant="secondary" block disabled={busy} onClick={() => this.openDialog('delete')} />
                    </div>
                ) : listing.status === 'active' && (
                    <div class="listing-buy__actions">
                        {listing.in_cart
                            ? <Button text="В корзине" variant="secondary" block disabled />
                            : <Button text="Добавить в корзину" block disabled={busy} onClick={this.handleAddToCart} />}
                        {cartError && <p class="listing-buy__error" role="alert">{cartError}</p>}
                    </div>
                )}
            </section>
        );
    }

    renderSeller(listing: Listing) {
        const { seller } = listing;
        const initials = seller.first_name.trim().slice(0, 2).toUpperCase();
        const since = new Date(seller.created_at).getFullYear();

        return (
            <section class="listing-card listing-seller" aria-label="Продавец">
                <div class="listing-seller__avatar">
                    {seller.avatar_url ? <img src={seller.avatar_url} alt="" /> : initials}
                </div>
                <div class="listing-seller__info">
                    <span class="listing-seller__name">{seller.first_name}</span>
                    <span class="listing-seller__rating">
                        {seller.reviews_count > 0
                            ? `★ ${seller.rating.toFixed(1)} · ${seller.reviews_count} ${plural(seller.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}`
                            : 'Пока нет отзывов'}
                    </span>
                    {Number.isFinite(since) && <span class="listing-seller__since">На GoGET с {since}</span>}
                </div>
            </section>
        );
    }

    renderCloseDialog() {
        const { closeReason, dialogError, busy } = this.state;

        return (
            <Modal
                title="Снять с продажи?"
                locked={busy}
                onClose={this.closeDialog}
                footer={[
                    <Button text="Снять с продажи" disabled={busy} onClick={this.handleClose} />,
                    <Button text="Отмена" variant="secondary" disabled={busy} onClick={this.closeDialog} />,
                ]}
            >
                <p class="listing-dialog__text">
                    Объявление пропадёт из поиска. Почему снимаете? Причину видите только вы.
                </p>
                <fieldset class="listing-dialog__reasons">
                    <legend class="visually-hidden">Причина</legend>
                    {CLOSE_REASONS.map((reason) => (
                        <label
                            key={reason}
                            class={closeReason === reason ? 'listing-dialog__reason listing-dialog__reason--checked' : 'listing-dialog__reason'}
                        >
                            <input
                                type="radio"
                                name="close-reason"
                                value={reason}
                                checked={closeReason === reason}
                                onChange={this.handleReasonChange}
                            />
                            <span class="listing-dialog__reason-text">
                                {CLOSE_REASON_LABELS[reason]}
                                {CLOSE_REASON_HINTS[reason] && (
                                    <span class="listing-dialog__reason-hint">{CLOSE_REASON_HINTS[reason]}</span>
                                )}
                            </span>
                        </label>
                    ))}
                </fieldset>
                {dialogError && <p class="listing-dialog__error" role="alert">{dialogError}</p>}
            </Modal>
        );
    }

    renderDeleteDialog() {
        const { listing, dialogError, busy } = this.state;

        return (
            <Modal
                title="Удалить объявление?"
                locked={busy}
                onClose={this.closeDialog}
                footer={[
                    <Button text="Удалить" variant="danger" disabled={busy} onClick={this.handleDelete} />,
                    <Button text="Отмена" variant="secondary" disabled={busy} onClick={this.closeDialog} />,
                ]}
            >
                <p class="listing-dialog__text">
                    «{listing.title || 'Без названия'}» удалится навсегда вместе со статистикой.
                    {listing.status === 'active' && ' Если планируете вернуть его позже, лучше снимите с продажи.'}
                </p>
                {dialogError && <p class="listing-dialog__error" role="alert">{dialogError}</p>}
            </Modal>
        );
    }

    renderBlockedDialog() {
        return (
            <Modal
                title="Сейчас удалить нельзя"
                onClose={this.closeDialog}
                footer={<Button text="Понятно" variant="secondary" onClick={this.closeDialog} />}
            >
                <p class="listing-dialog__text">
                    По этому объявлению есть оформленный заказ. Удалить объявление можно после того,
                    как сделка завершится или заказ будет отменён.
                </p>
            </Modal>
        );
    }

    render() {
        const { listing, dialog } = this.state;
        const { similar } = this.props;
        const notice = statusNotice(listing);
        const specs = [
            ...(listing.condition ? [{ key: 'condition', name: 'Состояние', value: CONDITION_LABELS[listing.condition] }] : []),
            ...listing.attributes,
            ...(listing.address ? [{ key: 'address', name: 'Где забрать', value: [listing.city, listing.address].filter(Boolean).join(', ') }] : []),
        ];
        const meta = [`Объявление № ${listing.id}`];
        if (listing.published_at) meta.push(`Размещено ${formatDate(listing.published_at)}`);

        return (
            <div class="listing-page">
                <nav class="breadcrumbs" aria-label="Хлебные крошки">
                    <a href="/" data-link>Главная</a>
                    <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                    <span class="breadcrumbs__current">{listing.title || 'Без названия'}</span>
                </nav>

                {notice && (
                    <p class={`listing-notice listing-notice--${listing.status}`} role="status">{notice}</p>
                )}

                <h1 class="listing-page__title">{listing.title || 'Без названия'}</h1>

                <div class="listing-page__layout">
                    <div class="listing-page__main">
                        {this.renderGallery(listing)}

                        {listing.description && (
                            <section class="listing-card">
                                <h2 class="listing-card__title">Описание</h2>
                                <p class="listing-card__description">{listing.description}</p>
                            </section>
                        )}

                        {specs.length > 0 && (
                            <section class="listing-card">
                                <h2 class="listing-card__title">Характеристики</h2>
                                <dl class="listing-specs">
                                    {specs.map((spec) => (
                                        <div key={spec.key} class="listing-specs__row">
                                            <dt>{spec.name}</dt>
                                            <dd>{spec.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        )}

                        <p class="listing-page__meta">{meta.join(' · ')}</p>
                    </div>

                    <aside class="listing-page__aside">
                        {this.renderPriceCard(listing)}
                        {!listing.is_owner && this.renderSeller(listing)}
                        {!listing.is_owner && (
                            <section class="listing-card listing-safe">
                                <h2 class="listing-safe__title">Безопасная сделка</h2>
                                <p class="listing-safe__text">
                                    Оплачивайте через GoGET: деньги получит продавец только после того, как вы заберёте товар.
                                </p>
                            </section>
                        )}
                    </aside>
                </div>

                {similar.length > 0 && (
                    <section class="listing-similar">
                        <h2 class="listing-similar__title">Похожие объявления</h2>
                        <div class="listing-similar__grid">
                            {similar.map((item) => <ProductCard key={item.id} {...item} />)}
                        </div>
                    </section>
                )}

                {dialog === 'close' && this.renderCloseDialog()}
                {dialog === 'delete' && this.renderDeleteDialog()}
                {dialog === 'blocked' && this.renderBlockedDialog()}
            </div>
        );
    }
}
