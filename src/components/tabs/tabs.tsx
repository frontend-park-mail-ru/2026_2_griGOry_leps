import './tabs.scss';

export interface TabItem {
    href: string;
    label: string;
    active: boolean;
}

export const Tabs = ({ items }: { items: TabItem[] }) => (
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

export const getAuthTabs = (active: 'login' | 'register'): TabItem[] => [
    { href: '/login', label: 'Вход', active: active === 'login' },
    { href: '/register', label: 'Регистрация', active: active === 'register' },
];
