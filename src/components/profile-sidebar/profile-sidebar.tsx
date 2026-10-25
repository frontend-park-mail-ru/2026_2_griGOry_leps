import { Component } from '@/vdom';
import { getMyListingsCount, type Profile } from '@/lib/api';
import { logWarn } from '@/lib/logger';
import { formatRating, formatSince, plural } from '@/lib/format';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import './profile-sidebar.scss';

export type ProfileSection = 'listings' | 'addresses' | 'settings';

export interface ProfileSidebarProps {
    profile: Profile;
    active: ProfileSection;
    listingsCount?: number | null;
    onLogout: () => Promise<void>;
}

export interface ProfileSidebarState {
    loggingOut: boolean;
    logoutError: string;
    loadedCount: number | null;
}

interface MenuItem {
    label: string;
    href?: string;
    section?: ProfileSection;
}

const MENU: MenuItem[] = [
    { label: 'Мои объявления', href: '/profile/listings', section: 'listings' },
    { label: 'Избранное' },
    { label: 'Сообщения' },
    { label: 'Адреса доставки', href: '/profile/addresses', section: 'addresses' },
    { label: 'Покупки' },
    { label: 'Отзывы' },
    { label: 'Настройки', href: '/profile/edit', section: 'settings' },
];

export class ProfileSidebar extends Component<ProfileSidebarProps, ProfileSidebarState> {
    state: ProfileSidebarState = { loggingOut: false, logoutError: '', loadedCount: null };

    componentDidMount() {
        if (this.props.listingsCount === undefined) void this.loadListingsCount();
    }

    async loadListingsCount() {
        try {
            this.setState({ loadedCount: await getMyListingsCount() });
        } catch (err) {
            logWarn('Не удалось загрузить число объявлений:', err);
        }
    }

    handleLogout = async () => {
        this.setState({ loggingOut: true, logoutError: '' });
        try {
            await this.props.onLogout();
        } catch {
            this.setState({ loggingOut: false, logoutError: 'Не удалось выйти. Попробуйте ещё раз' });
        }
    };

    renderRating(profile: Profile) {
        if (profile.reviews_count === 0) {
            return <span class="profile-sidebar__no-reviews">Пока нет отзывов</span>;
        }

        return (
            <div class="profile-sidebar__rating">
                <span class="profile-sidebar__stars">★ {formatRating(profile.rating)}</span>
                <span class="profile-sidebar__reviews">
                    {profile.reviews_count} {plural(profile.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}
                </span>
            </div>
        );
    }

    renderMenuItem({ label, href, section }: MenuItem) {
        const { active } = this.props;
        const listingsCount = this.props.listingsCount === undefined ? this.state.loadedCount : this.props.listingsCount;

        if (!href) {
            return (
                <li key={label}>
                    <button type="button" class="profile-sidebar__menu-item" disabled>
                        <span class="profile-sidebar__menu-label">{label}</span>
                    </button>
                </li>
            );
        }

        const isActive = section === active;
        const count = section === 'listings' ? listingsCount : null;

        return (
            <li key={label}>
                <a
                    href={href}
                    data-link
                    class={isActive ? 'profile-sidebar__menu-item profile-sidebar__menu-item--active' : 'profile-sidebar__menu-item'}
                    aria-current={isActive ? 'page' : undefined}
                >
                    <span class="profile-sidebar__menu-label">{label}</span>
                    {count !== null && <span class="profile-sidebar__menu-count">{count}</span>}
                </a>
            </li>
        );
    }

    render() {
        const { profile } = this.props;
        const { loggingOut, logoutError } = this.state;
        const name = profile.first_name || profile.email;
        const since = formatSince(profile.created_at);

        return (
            <aside class="profile-sidebar">
                <div class="profile-sidebar__user">
                    <UserAvatar user={profile} class="profile-sidebar__avatar" />
                    <h2 class="profile-sidebar__name">{name}</h2>
                    {this.renderRating(profile)}
                    {since && <span class="profile-sidebar__since">На GoGet с {since}</span>}
                </div>

                <a
                    href="/profile/edit"
                    data-link
                    class="profile-sidebar__edit"
                    aria-current={this.props.active === 'settings' ? 'page' : undefined}
                >
                    Редактировать профиль
                </a>

                <hr class="profile-sidebar__divider" />

                <nav aria-label="Профиль">
                    <ul class="profile-sidebar__menu">
                        {MENU.map((item) => this.renderMenuItem(item))}
                        <li>
                            <button
                                type="button"
                                class="profile-sidebar__menu-item profile-sidebar__menu-item--danger"
                                disabled={loggingOut}
                                onClick={this.handleLogout}
                            >
                                <span class="profile-sidebar__menu-label">Выйти</span>
                            </button>
                        </li>
                    </ul>
                </nav>
                {logoutError && <span class="profile-sidebar__error" role="alert">{logoutError}</span>}
            </aside>
        );
    }
}
