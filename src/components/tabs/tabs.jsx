import './tabs.scss';

/**
 * @param {{items: Array<{href: string, label: string, active: boolean}>}} props
 */
export const Tabs = ({ items }) => (
    <nav class="tabs" aria-label="Вход и регистрация">
        {items.map(({ href, label, active }) => (
            <a
                key={href}
                class={active ? 'tabs__item tabs__item--active' : 'tabs__item'}
                href={href}
                data-link
                aria-current={active ? 'page' : undefined}
            >{label}</a>
        ))}
    </nav>
);

/**
 * @param {('login'|'register')} active
 */
export const getAuthTabs = (active) => [
    { href: '/login', label: 'Вход', active: active === 'login' },
    { href: '/register', label: 'Регистрация', active: active === 'register' },
];
