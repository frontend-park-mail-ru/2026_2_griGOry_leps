import { registerComponent } from '../../core/template.js';
import source from './tabs.hbs?raw';
import './tabs.css';

export const renderTabs = registerComponent('tabs', source);

/**
 * Вкладки «Вход / Регистрация» для карточки авторизации.
 * @param {'login' | 'register'} active
 * @returns {{ href: string, label: string, active: boolean }[]}
 */
export function getAuthTabs(active) {
  return [
    { href: '/login', label: 'Вход', active: active === 'login' },
    { href: '/register', label: 'Регистрация', active: active === 'register' },
  ];
}
