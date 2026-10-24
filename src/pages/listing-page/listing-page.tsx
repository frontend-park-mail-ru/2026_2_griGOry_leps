import { Component } from '@/vdom';
import './listing-page.scss';

import { CloseListingDialog } from '@/components/listing-dialogs/close-listing-dialog';
import { DeleteBlockedDialog } from '@/components/listing-dialogs/delete-blocked-dialog';
import { DeleteListingDialog } from '@/components/listing-dialogs/delete-listing-dialog';
import { ListingCard } from '@/components/listing-card/listing-card';
import { ListingGallery } from '@/components/listing-gallery/listing-gallery';
import { ListingPriceCard } from '@/components/listing-price-card/listing-price-card';
import { ListingSellerCard } from '@/components/listing-seller-card/listing-seller-card';
import { ProductCard } from '@/components/product-card/product-card';
import {
    ApiError, addToCart, closeListing, deleteListing,
    type AdCard, type CloseReason, type Listing, type User,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import { CONDITION_LABELS, statusNotice } from '@/lib/listing';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { navigate } from '@/router/router';

export interface ListingPageProps {
    listing: Listing;
    similar: AdCard[];
    user: User | null;
}

type Dialog = 'close' | 'delete' | 'blocked' | null;

export interface ListingPageState {
    listing: Listing;
    dialog: Dialog;
    dialogError: string;
    busy: boolean;
    cartError: string;
}

function actionError(err: unknown, fallback: string): string {
    if (!(err instanceof ApiError)) return fallback;
    if (err.network) return 'Нет соединения с сервером. Проверьте интернет';
    if (err.timeout) return 'Сервер не отвечает. Попробуйте ещё раз';
    if (err.status === 409) return 'Объявление уже не активно. Обновите страницу';
    if (err.status === 404) return 'Объявление уже удалено';
    if (err.status === 401) return 'Сессия истекла. Войдите заново';
    return fallback;
}

function listingSpecs(listing: Listing) {
    const location = [listing.city, listing.address].filter(Boolean).join(', ');
    return [
        ...(listing.condition ? [{ key: 'condition', name: 'Состояние', value: CONDITION_LABELS[listing.condition] }] : []),
        ...listing.attributes,
        ...(listing.address ? [{ key: 'address', name: 'Где забрать', value: location }] : []),
    ];
}

export class ListingPage extends Component<ListingPageProps, ListingPageState> {
    constructor(props: ListingPageProps) {
        super(props);
        this.state = {
            listing: props.listing,
            dialog: null,
            dialogError: '',
            busy: false,
            cartError: '',
        };
    }

    openDialog = (dialog: Dialog) => {
        this.setState({ dialog, dialogError: '' });
    };

    closeDialog = () => {
        this.setState({ dialog: null, dialogError: '' });
    };

    handleClose = async (reason: CloseReason) => {
        this.setState({ busy: true, dialogError: '' });
        try {
            const updated = await closeListing(this.state.listing.id, reason);
            this.setState({ listing: updated, dialog: null });
            showToast('Объявление снято с продажи');
        } catch (err) {
            logWarn('Не удалось снять объявление:', err);
            this.setState({ dialogError: actionError(err, 'Не удалось снять объявление. Попробуйте ещё раз') });
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
            this.setState({ busy: false, dialogError: actionError(err, 'Не удалось удалить объявление. Попробуйте ещё раз') });
        }
    };

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

    renderDialog() {
        const { listing, dialog, dialogError, busy } = this.state;

        switch (dialog) {
            case 'close':
                return <CloseListingDialog busy={busy} error={dialogError} onSubmit={this.handleClose} onCancel={this.closeDialog} />;
            case 'delete':
                return (
                    <DeleteListingDialog
                        title={listing.title}
                        active={listing.status === 'active'}
                        busy={busy}
                        error={dialogError}
                        onConfirm={this.handleDelete}
                        onCancel={this.closeDialog}
                    />
                );
            case 'blocked':
                return <DeleteBlockedDialog onClose={this.closeDialog} />;
            default:
                return null;
        }
    }

    render() {
        const { listing, busy, cartError } = this.state;
        const { similar } = this.props;
        const title = listing.title || 'Без названия';
        const notice = statusNotice(listing);
        const specs = listingSpecs(listing);
        const meta = [`Объявление № ${listing.id}`];
        if (listing.published_at) meta.push(`Размещено ${formatDate(listing.published_at)}`);

        return (
            <div class="listing-page">
                <nav class="breadcrumbs" aria-label="Хлебные крошки">
                    <a href="/" data-link>Главная</a>
                    <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                    <span class="breadcrumbs__current">{title}</span>
                </nav>

                {notice && (
                    <p class={`listing-page__notice listing-page__notice--${listing.status}`} role="status">{notice}</p>
                )}

                <h1 class="listing-page__title">{title}</h1>

                <div class="listing-page__layout">
                    <div class="listing-page__main">
                        <ListingGallery photos={listing.photos} title={title} />

                        {listing.description && (
                            <ListingCard title="Описание">
                                <p class="listing-page__description">{listing.description}</p>
                            </ListingCard>
                        )}

                        {specs.length > 0 && (
                            <ListingCard title="Характеристики">
                                <dl class="listing-specs">
                                    {specs.map((spec) => (
                                        <div key={spec.key} class="listing-specs__row">
                                            <dt>{spec.name}</dt>
                                            <dd>{spec.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </ListingCard>
                        )}

                        <p class="listing-page__meta">{meta.join(' · ')}</p>
                    </div>

                    <aside class="listing-page__aside">
                        <ListingPriceCard
                            listing={listing}
                            busy={busy}
                            cartError={cartError}
                            onAddToCart={this.handleAddToCart}
                            onClose={() => this.openDialog('close')}
                            onDelete={() => this.openDialog('delete')}
                        />
                        {!listing.is_owner && <ListingSellerCard seller={listing.seller} />}
                        {!listing.is_owner && (
                            <ListingCard title="Безопасная сделка" accent>
                                <p class="listing-page__safe-text">
                                    Оплачивайте через GoGET: деньги получит продавец только после того, как вы заберёте товар.
                                </p>
                            </ListingCard>
                        )}
                    </aside>
                </div>

                {similar.length > 0 && (
                    <section class="listing-page__similar">
                        <h2 class="listing-page__similar-title">Похожие объявления</h2>
                        <div class="listing-page__similar-grid">
                            {similar.map((item) => <ProductCard key={item.id} {...item} />)}
                        </div>
                    </section>
                )}

                {this.renderDialog()}
            </div>
        );
    }
}
