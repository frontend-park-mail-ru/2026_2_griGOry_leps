import './password-rules.scss';

const RULE_TEXTS = [
    'Минимум 8 символов',
    'Заглавная и строчная буквы',
    'Хотя бы одна цифра',
];

/**
 * Требования к паролю: серые, пока поле пустое, зелёные — выполненные, красные — нет.
 * @param {{states?: Array<'ok' | 'fail' | 'neutral'>}} props
 */
export const PasswordRules = ({ states = [] }) => (
    <ul class="password-rules">
        {RULE_TEXTS.map((text, i) => (
            <li key={text} class={`password-rules__item password-rules__item--${states[i] ?? 'neutral'}`}>
                <span class="password-rules__indicator" aria-hidden="true" />
                <span>{text}</span>
            </li>
        ))}
    </ul>
);
