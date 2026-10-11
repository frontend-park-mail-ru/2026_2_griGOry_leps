import { Component } from '@/vdom/index.js';
import './header.scss';

/**
 * Две первые буквы имени для аватара.
 * @param {(module:api~User|null)} user
 * @returns {string}
 */
function getInitials(user) {
    return (user?.first_name || '').trim().slice(0, 2).toUpperCase();
}

/**
 * Шапка сайта. Для гостя — кнопки входа и регистрации, для пользователя — аватар с меню.
 * @property {Object} props
 * @property {(module:api~User|null)} props.user
 * @property {function(): Promise<void>} props.onLogout
 */
export class Header extends Component {
    state = { menuOpen: false, loggingOut: false };

    componentDidMount() {
        document.addEventListener('click', this.handleDocumentClick);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    /** Клик мимо меню закрывает его */
    handleDocumentClick = (e) => {
        if (this.state.menuOpen && !this.userMenu?.contains(e.target)) {
            this.setState({ menuOpen: false });
        }
    };

    toggleMenu = () => {
        this.setState({ menuOpen: !this.state.menuOpen });
    };

    handleLogout = async () => {
        this.setState({ loggingOut: true });
        try {
            await this.props.onLogout();
            this.setState({ menuOpen: false });
        } finally {
            this.setState({ loggingOut: false });
        }
    };

    renderUser(user) {
        const userName = user.first_name || user.email || '';
        const { menuOpen, loggingOut } = this.state;

        return (
            <>
                <button type="button" class="header__post" disabled>Разместить объявление</button>
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
