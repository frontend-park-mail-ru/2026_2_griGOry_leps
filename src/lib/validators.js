const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_PATTERN = /^[A-Za-z0-9_.]+$/;
const PHONE_PATTERN = /^\+7\d{10}$/;
const NAME_PATTERN = /^[\p{L}\s-]+$/u;
const PASSWORD_PATTERN = /^[\x21-\x7E]+$/;

const PASSWORD_TOO_LONG = 'Пароль слишком длинный: максимум 72 байта (русская буква — 2 байта)';

export const LIMITS = {
    nameMin: 2,
    nameMax: 50,
    nicknameMin: 3,
    nicknameMax: 32,
    phoneMax: 12,
    emailMax: 254,
    passwordMin: 8,
    passwordMax: 72, // байт
};

/**
 * Приводит телефон в любом виде (8900…, 900…, +7 900 123-45-67) к «+7XXXXXXXXXX»:
 * оставляет только «+» в начале и цифры, «8» в начале меняет на «+7».
 * @param {string} value
 * @returns {string}
 */
export function sanitizePhone(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return value.trimStart().startsWith('+') ? '+' : '';

    let normalized = digits;
    if (!value.trimStart().startsWith('+')) {
        if (digits.startsWith('8')) normalized = `7${digits.slice(1)}`;
        else if (digits.startsWith('9')) normalized = `7${digits}`;
    }

    return `+${normalized}`.slice(0, LIMITS.phoneMax);
}

/**
 * Длина строки в байтах UTF-8: бэк считает ограничение на пароль в байтах.
 * @param {string} value
 * @returns {number}
 */
export function byteLength(value) {
    return new TextEncoder().encode(value).length;
}

/**
 * Каждый валидатор возвращает текст ошибки или пустую строку.
 * Пустое значение ошибкой не считается: обязательность полей проверяется
 * только при отправке формы (см. `required` в bindLiveValidation).
 * @param {string} value
 * @returns {string}
 */
export function validateName(value) {
    if (!value) return '';
    const name = value.trim();
    if (!name) return 'Имя не может состоять из пробелов';
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
        return `Имя: от ${LIMITS.nameMin} до ${LIMITS.nameMax} символов`;
    }
    if (!NAME_PATTERN.test(name)) {
        return 'Только буквы, пробел и дефис';
    }
    return '';
}

export function validateNickname(value) {
    if (!value) return '';
    if (value.length < LIMITS.nicknameMin || value.length > LIMITS.nicknameMax) {
        return `Никнейм: от ${LIMITS.nicknameMin} до ${LIMITS.nicknameMax} символов`;
    }
    if (!NICKNAME_PATTERN.test(value)) {
        return 'Только латиница, цифры, «_» и «.»';
    }
    return '';
}

/**
 * Единое поле «Имя или никнейм». Значение уходит на бэк как nickname,
 * поэтому правила совпадают с бэком: 3–32 символа, латиница, цифры, «_» и «.».
 * @param {string} value
 * @returns {string}
 */
export function validateDisplayName(value) {
    if (!value) return '';
    const name = value.trim();
    if (!name) return 'Имя не может состоять из пробелов';
    if (name.length < LIMITS.nicknameMin || name.length > LIMITS.nicknameMax) {
        return `От ${LIMITS.nicknameMin} до ${LIMITS.nicknameMax} символов`;
    }
    if (!NICKNAME_PATTERN.test(name)) {
        return 'Только латиница, цифры, «_» и «.»';
    }
    return '';
}

export function validatePhone(value) {
    if (!value) return '';
    if (!PHONE_PATTERN.test(value)) return 'Телефон в формате +7 и 10 цифр';
    return '';
}

export function validateEmail(value) {
    if (!value) return '';
    const email = value.trim();
    if (email.length > LIMITS.emailMax) {
        return `Email: не более ${LIMITS.emailMax} символов`;
    }
    if (!EMAIL_PATTERN.test(email)) return 'Введите корректный email';
    return '';
}

export function validateLogin(value) {
    if (!value) return '';
    const login = value.trim();
    if (login.includes('@')) return validateEmail(login);
    return validatePhone(sanitizePhone(login));
}

/**
 * Выполненность требований к паролю в порядке отображения в PasswordRules.
 * @param {string} password
 * @returns {boolean[]}
 */
export function checkPasswordRules(password) {
    return [
        password.length >= LIMITS.passwordMin,
        /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password),
        /\d/.test(password),
    ];
}

export function validatePassword(value) {
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

export function validateLoginPassword(value) {
    if (!value) return '';
    if (byteLength(value) > LIMITS.passwordMax) {
        return PASSWORD_TOO_LONG;
    }
    return '';
}

/**
 * @param {string} value
 * @param {string} password
 * @returns {string}
 */
export function validatePasswordRepeat(value, password) {
    if (!value) return '';
    if (value !== password) return 'Пароли не совпадают';
    return '';
}

/**
 * Логин — это email или телефон. Телефон приводится к «+7XXXXXXXXXX»,
 * email не трогаем (в нём может быть что угодно, в т.ч. цифра в начале).
 * @param {string} value
 * @returns {string}
 */
export function normalizeLogin(value) {
    return /^[+\d\s()-]+$/.test(value) ? sanitizePhone(value) : value;
}