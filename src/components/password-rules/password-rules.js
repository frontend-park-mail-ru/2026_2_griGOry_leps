import template from './password-rules.hbs';
import './password-rules.scss';

export const PasswordRules = (props) => template(props);

const RULE_TEXTS = [
    'Минимум 8 символов',
    'Заглавная и строчная буквы',
    'Хотя бы одна цифра',
];

export function getPasswordRules(states = []) {
    return RULE_TEXTS.map((text, i) => ({
        text,
        state: states[i] ?? 'neutral',
    }));
}
