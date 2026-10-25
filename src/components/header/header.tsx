import { Component } from '@/vdom';
import type { User } from '@/lib/api';
import './header.scss';

export interface HeaderProps {
    user: User | null;
    onLogout: () => Promise<void>;
}

export interface HeaderState {
    menuOpen: boolean;
    loggingOut: boolean;
    logoutError: string;
}

function getInitials(user: User): string {
    return (user?.first_name || '').trim().slice(0, 2).toUpperCase();
}

export class Header extends Component<HeaderProps, HeaderState> {
    state: HeaderState = { menuOpen: false, loggingOut: false, logoutError: '' };

    userMenu: HTMLElement | null = null;

    componentDidMount() {
        document.addEventListener('click', this.handleDocumentClick);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    // клик мимо меню закрывает его
    handleDocumentClick = (e: MouseEvent) => {
        if (this.state.menuOpen && !this.userMenu?.contains(e.target as Node)) {
            this.setState({ menuOpen: false });
        }
    };

    toggleMenu = () => {
        this.setState({ menuOpen: !this.state.menuOpen, logoutError: '' });
    };

    handleLogout = async () => {
        this.setState({ loggingOut: true, logoutError: '' });
        try {
            await this.props.onLogout();
            this.setState({ menuOpen: false, loggingOut: false });
        } catch {
            this.setState({ loggingOut: false, logoutError: 'Не удалось выйти. Попробуйте ещё раз' });
        }
    };

    renderUser(user: User) {
        const userName = user.first_name || user.email || '';
        const { menuOpen, loggingOut, logoutError } = this.state;

        return (
            <>
                <a href="/listing/new" data-link class="header__post">Разместить объявление</a>
                <div
                    class={menuOpen ? 'header__user header__user--open' : 'header__user'}
                    ref={(el) => { this.userMenu = el; }}
                >
                    <button
                        type="button"
                        class="header__user-toggle"
                        aria-label={userName}
                        aria-haspopup="true"
                        aria-expanded={String(menuOpen)}
                        onClick={this.toggleMenu}
                    >
                        <span class="header__avatar">{getInitials(user)}</span>
                        <img src="/img/chevron-down.svg" alt="" class="header__chevron" aria-hidden="true" />
                    </button>
                    <div class="header__menu">
                        <span class="header__menu-name">{userName}</span>
                        <button
                            type="button"
                            class="header__menu-item"
                            disabled={loggingOut}
                            onClick={this.handleLogout}
                        >Выйти</button>
                        {logoutError && <span class="header__menu-error" role="alert">{logoutError}</span>}
                    </div>
                </div>
            </>
        );
    }

    render() {
        const { user } = this.props;

        return (
            <header class="header">
                <div class="header__inner">
                    <a href="/" data-link class="header__logo" aria-label="GoGet — на главную">
                        <img src="/img/goget.svg" alt="GoGet" />
                    </a>

                    <a href="/categories" data-link class="header__category">
                        Все категории
                    </a>

                    <button type="button" class="header__city" disabled>
                        <img src="/img/pin.svg" alt="" class="header__icon" aria-hidden="true" />
                        <span>Москва</span>
                        <img src="/img/chevron-down.svg" alt="" class="header__chevron" aria-hidden="true" />
                    </button>

                    <form class="header__search search search--disabled" role="search" aria-disabled="true">
                        <input type="text" name="q" placeholder="Поиск по объявлениям" autocomplete="off" class="search__input" disabled />
                        <button type="submit" class="search__btn" aria-label="Найти" disabled>
                            <img src="/img/search_icon.svg" alt="" class="search__icon" aria-hidden="true" />
                        </button>
                    </form>

                    {user
                        ? this.renderUser(user)
                        : (
                            <>
                                <a href="/register" data-link class="header__signup">Зарегистрироваться</a>
                                <a href="/login" data-link class="header__login">Войти</a>
                            </>
                        )}
                </div>
            </header>
        );
    }
}
