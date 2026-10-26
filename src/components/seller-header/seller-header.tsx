import { Component } from '@/vdom';
import type { SellerProfile } from '@/lib/api';
import { formatRating, formatSinceYear, plural } from '@/lib/format';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import './seller-header.scss';

export interface SellerHeaderProps {
    seller: SellerProfile;
    reviewsHref: string;
    onShare: () => void;
    onCopyLink: () => void;
    onReport?: () => void;
}

export interface SellerHeaderState {
    menuOpen: boolean;
}

const MoreIcon = () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="currentColor" aria-hidden="true">
        <circle cx="5.5" cy="11" r="1.6" />
        <circle cx="11" cy="11" r="1.6" />
        <circle cx="16.5" cy="11" r="1.6" />
    </svg>
);

export class SellerHeader extends Component<SellerHeaderProps, SellerHeaderState> {
    state: SellerHeaderState = { menuOpen: false };

    menu: HTMLElement | null = null;

    componentDidMount() {
        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    handleDocumentClick = (e: MouseEvent) => {
        if (this.state.menuOpen && !this.menu?.contains(e.target as Node)) this.setState({ menuOpen: false });
    };

    handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.state.menuOpen) this.setState({ menuOpen: false });
    };

    toggleMenu = () => {
        this.setState({ menuOpen: !this.state.menuOpen });
    };

    pick(action: () => void) {
        this.setState({ menuOpen: false });
        action();
    }

    renderRating() {
        const { seller, reviewsHref } = this.props;

        return (
            <div class="seller-header__rating">
                <span class="seller-header__stars">★ {formatRating(seller.rating)}</span>
                <a href={reviewsHref} data-link class="seller-header__reviews">
                    {seller.reviews_count} {plural(seller.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}
                </a>
            </div>
        );
    }

    renderBadges() {
        const { seller } = this.props;
        const sales = seller.completed_sales_count;
        if (!seller.phone_verified && sales <= 0) return null;

        return (
            <div class="seller-header__badges">
                {seller.phone_verified && (
                    <span class="seller-header__badge seller-header__badge--success">Телефон подтверждён</span>
                )}
                {sales > 0 && (
                    <span class="seller-header__badge seller-header__badge--info">
                        {sales} {plural(sales, ['завершённая продажа', 'завершённые продажи', 'завершённых продаж'])}
                    </span>
                )}
            </div>
        );
    }

    renderMenu() {
        const { onShare, onCopyLink, onReport } = this.props;

        return (
            <ul class="seller-header__menu" role="menu">
                <li role="none">
                    <button type="button" class="seller-header__menu-item" role="menuitem" onClick={() => this.pick(onShare)}>
                        Поделиться профилем
                    </button>
                </li>
                <li role="none">
                    <button type="button" class="seller-header__menu-item" role="menuitem" onClick={() => this.pick(onCopyLink)}>
                        Скопировать ссылку
                    </button>
                </li>
                {onReport && <li class="seller-header__menu-divider" role="separator" />}
                {onReport && (
                    <li role="none">
                        <button
                            type="button"
                            class="seller-header__menu-item seller-header__menu-item--danger"
                            role="menuitem"
                            onClick={() => this.pick(onReport)}
                        >
                            Пожаловаться на продавца
                        </button>
                    </li>
                )}
            </ul>
        );
    }

    render() {
        const { seller } = this.props;
        const { menuOpen } = this.state;
        const since = formatSinceYear(seller.created_at);
        const details = [since && `На GoGET с ${since}`, seller.location].filter(Boolean).join(' · ');

        return (
            <section class="seller-header">
                <UserAvatar user={{ ...seller, email: '' }} class="seller-header__avatar" />

                <div class="seller-header__info">
                    <h1 class="seller-header__name">{seller.first_name}</h1>
                    {this.renderRating()}
                    {details && <p class="seller-header__details">{details}</p>}
                    {this.renderBadges()}
                </div>

                <div class="seller-header__actions">
                    <button type="button" class="seller-header__message" disabled>Написать продавцу</button>
                    <div class="seller-header__row">
                        <button type="button" class="seller-header__follow" disabled>Подписаться</button>
                        <div
                            class={menuOpen ? 'seller-header__more seller-header__more--open' : 'seller-header__more'}
                            ref={(el) => { this.menu = el as HTMLElement | null; }}
                        >
                            <button
                                type="button"
                                class="seller-header__more-button"
                                aria-label="Ещё"
                                aria-haspopup="menu"
                                aria-expanded={String(menuOpen)}
                                onClick={this.toggleMenu}
                            >
                                <MoreIcon />
                            </button>
                            {menuOpen && this.renderMenu()}
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}
