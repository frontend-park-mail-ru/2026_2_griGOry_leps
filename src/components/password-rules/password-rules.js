import { registerComponent } from '../../core/template.js';
import source from './password-rules.hbs?raw';
import './password-rules.css';

export const renderPasswordRules = registerComponent('password-rules', source);

const RULE_TEXTS = [
  'Минимум 8 символов',
  'Заглавная и строчная буквы',
  'Хотя бы одна цифра',
];

/**
 * Список требований к паролю для partial'а `password-rules`.
 * @param {('neutral' | 'ok' | 'fail')[]} [states] состояние каждого правила
 * @returns {{ text: string, state: 'neutral' | 'ok' | 'fail' }[]}
 */
export function getPasswordRules(states = []) {
  return RULE_TEXTS.map((text, i) => ({ text, state: states[i] ?? 'neutral' }));
}
