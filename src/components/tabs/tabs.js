import template from './tabs.hbs';
import './tabs.scss';

export const Tabs = (props) => template(props);

export function getAuthTabs(active) {
    return [
        { href: '/login',    label: 'Вход',        active: active === 'login' },
        { href: '/register', label: 'Регистрация', active: active === 'register' },
    ];
}
