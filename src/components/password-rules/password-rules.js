import template from './password-rules.hbs';
import './password-rules.scss';

const RULE_TEXTS = [
    'Минимум 8 символов',
    'Заглавная и строчная буквы',
    'Хотя бы одна цифра',
];

/**
 * @param {Array<'ok' | 'fail' | 'neutral'>} [states]
 */
export const PasswordRules = (states = []) => template({
    rules: RULE_TEXTS.map((text, i) => ({ text, state: states[i] ?? 'neutral' })),
});

/**
 * Перерисовывает состояния уже отрисованного списка требований.
 * @param {ParentNode} root
 * @param {Array<'ok' | 'fail' | 'neutral'>} states
 */
export function updatePasswordRules(root, states) {
    root.querySelectorAll('.password-rules__item').forEach((item, i) => {
        item.className = `password-rules__item password-rules__item--${states[i] ?? 'neutral'}`;
    });
}
