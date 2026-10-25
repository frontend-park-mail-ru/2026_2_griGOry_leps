const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const EMAIL_CHARS_PATTERN = /^[A-Za-z0-9._%+@-]+$/;
const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const PHONE_PATTERN = /^\+7\d{10}$/;
const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9_. -]+$/;
const PASSWORD_PATTERN = /^[\x21-\x7E]+$/;

const PASSWORD_TOO_LONG = 'Пароль слишком длинный: максимум 72 байта (русская буква — 2 байта)';

export const LIMITS = {
    nameMin: 2,
    nameMax: 50,
    phoneMax: 12,
    emailMax: 254,
    passwordMin: 8,
    passwordMax: 72,
    aboutMax: 500,
    streetMax: 200,
    houseMax: 50,
    courierCommentMax: 200,
} as const;

/** «8 (900) 123-45-67» → «+79001234567» */
export function sanitizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) return value.trimStart().startsWith('+') ? '+' : '';

    let normalized = digits;
    if (!value.trimStart().startsWith('+')) {
        if (digits.startsWith('8')) normalized = `7${digits.slice(1)}`;
        else if (digits.startsWith('9')) normalized = `7${digits}`;
    }

    return `+${normalized}`.slice(0, LIMITS.phoneMax);
}

/** Бэк ограничивает пароль в байтах UTF-8 (bcrypt), а не в символах */
export function byteLength(value: string): number {
    return new TextEncoder().encode(value).length;
}

/**
 * Валидаторы возвращают текст ошибки или ''. Пустое значение не ошибка:
 * обязательность проверяется при отправке (`required` в FormValidation).
 */
export function validateName(value: string): string {
    if (!value) return '';
    const name = value.trim().replace(/ {2,}/g, ' ');
    if (!name) return 'Имя не может состоять из пробелов';
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
        return `Имя: от ${LIMITS.nameMin} до ${LIMITS.nameMax} символов`;
    }
    if (!NAME_PATTERN.test(name)) {
        return 'Только латиница, кириллица, цифры, пробел, «-», «_» и «.»';
    }
    return '';
}

export function validatePhone(value: string): string {
    if (!value) return '';
    if (!PHONE_PATTERN.test(value)) return 'Телефон в формате +7 и 10 цифр';
    return '';
}

export function validateEmail(value: string): string {
    if (!value) return '';
    const email = value.trim();
    if (email.length > LIMITS.emailMax) {
        return `Email: не более ${LIMITS.emailMax} символов`;
    }
    if (EMOJI_PATTERN.test(email)) return 'Email не может содержать эмодзи';
    if (!EMAIL_CHARS_PATTERN.test(email)) {
        return 'Email: только латиница, цифры и символы «._%+-»';
    }
    if (!EMAIL_PATTERN.test(email)) return 'Введите корректный email';
    return '';
}

export function validateMaxLength(limit: number): (value: string) => string {
    return (value) => (value.length > limit ? `Не более ${limit} символов` : '');
}

export const validateAbout = validateMaxLength(LIMITS.aboutMax);

export function validateLogin(value: string): string {
    if (!value) return '';
    const login = value.trim();
    if (EMOJI_PATTERN.test(login)) return 'Логин не может содержать эмодзи';
    if (login.includes('@')) return validateEmail(login);
    return validatePhone(sanitizePhone(login));
}

/** В том же порядке, что пункты в PasswordRules */
export function checkPasswordRules(password: string): boolean[] {
    return [
        password.length >= LIMITS.passwordMin,
        /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password),
        /\d/.test(password),
    ];
}

export function validatePassword(value: string): string {
    if (!value) return '';
    if (byteLength(value) > LIMITS.passwordMax) {
        return PASSWORD_TOO_LONG;
    }
    if (!PASSWORD_PATTERN.test(value)) {
        return 'Только латинские буквы, цифры и символы без пробелов';
    }
    if (!checkPasswordRules(value).every(Boolean)) {
        return 'Пароль не соответствует требованиям';
    }
    return '';
}

export function validateLoginPassword(value: string): string {
    if (!value) return '';
    if (byteLength(value) > LIMITS.passwordMax) {
        return PASSWORD_TOO_LONG;
    }
    if (EMOJI_PATTERN.test(value)) return 'Пароль не может содержать эмодзи';
    return '';
}

export function validatePasswordRepeat(value: string, password: string): string {
    if (!value) return '';
    if (value !== password) return 'Пароли не совпадают';
    return '';
}

/** Телефон приводим к +7XXXXXXXXXX, email не трогаем (он может начинаться с цифры) */
export function normalizeLogin(value: string): string {
    return /^[+\d\s()-]+$/.test(value) ? sanitizePhone(value) : value;
}
