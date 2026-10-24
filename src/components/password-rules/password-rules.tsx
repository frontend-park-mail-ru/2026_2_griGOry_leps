import { checkPasswordRules } from '@/lib/validators';
import './password-rules.scss';

const RULE_TEXTS = [
    'Минимум 8 символов',
    'Заглавная и строчная буквы',
    'Хотя бы одна цифра',
];

/** ok — зелёный, fail — красный, neutral — серый, пока поле пустое */
export type RuleState = 'ok' | 'fail' | 'neutral';

export const PasswordRules = ({ states = [] }: { states?: RuleState[] }) => (
    <ul class="password-rules">
        {RULE_TEXTS.map((text, i) => (
            <li key={text} class={`password-rules__item password-rules__item--${states[i] ?? 'neutral'}`}>
                <span class="password-rules__indicator" aria-hidden="true" />
                <span>{text}</span>
            </li>
        ))}
    </ul>
);

export function getPasswordRuleStates(password: string): RuleState[] {
    return checkPasswordRules(password).map((isMet) => {
        if (isMet) return 'ok';
        return password ? 'fail' : 'neutral';
    });
}
