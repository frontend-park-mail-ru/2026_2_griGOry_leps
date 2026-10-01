const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_PATTERN = /^[A-Za-z0-9_.]+$/;
const PHONE_PATTERN = /^\+7\d{10}$/;

export const LIMITS = {
    nameMin: 2,
    nameMax: 50,
    nicknameMin: 3,
    nicknameMax: 32,
    phoneMax: 12,
    emailMax: 254,
    passwordMin: 8,
    passwordMax: 72,
};

/**
 * Оставляет в телефоне только «+» в начале и цифры, обрезает по длине.
 * @param {string} value
 * @returns {string}
 */
export function sanitizePhone(value) {
    const plus = value.trimStart().startsWith('+') ? '+' : '';
    return (plus + value.replace(/\D/g, '')).slice(0, LIMITS.phoneMax);
}

/**
 * Каждый валидатор возвращает текст ошибки или пустую строку.
 * @param {string} value
 * @returns {string}
 */
export function validateName(value) {
    const name = value.trim();
    if (!name) return 'Введите имя';
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
        return `Имя: от ${LIMITS.nameMin} до ${LIMITS.nameMax} символов`;
    }
    return '';
}

export function validateNickname(value) {
    if (!value) return 'Введите никнейм';
    if (value.length < LIMITS.nicknameMin || value.length > LIMITS.nicknameMax) {
        return `Никнейм: от ${LIMITS.nicknameMin} до ${LIMITS.nicknameMax} символов`;
    }
    if (!NICKNAME_PATTERN.test(value)) {
        return 'Только латиница, цифры, «_» и «.»';
    }
    return '';
}

export function validatePhone(value) {
    if (!value) return 'Введите телефон';
    if (!PHONE_PATTERN.test(value)) return 'Телефон в формате +7 и 10 цифр';
    return '';
}

export function validateEmail(value) {
    const email = value.trim();
    if (!email) return 'Введите email';
    if (email.length > LIMITS.emailMax) {
        return `Email: не более ${LIMITS.emailMax} символов`;
    }
    if (!EMAIL_PATTERN.test(email)) return 'Введите корректный email';
    return '';
}

export function validateLogin(value) {
    const login = value.trim();
    if (!login) return 'Введите телефон или email';
    if (login.includes('@')) return validateEmail(login);
    return validatePhone(login);
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
    if (!value) return 'Введите пароль';
    if (value.length > LIMITS.passwordMax) {
        return `Пароль: не более ${LIMITS.passwordMax} символов`;
    }
    if (!checkPasswordRules(value).every(Boolean)) {
        return 'Пароль не соответствует требованиям';
    }
    return '';
}

export function validateLoginPassword(value) {
    if (!value) return 'Введите пароль';
    if (value.length > LIMITS.passwordMax) {
        return `Пароль: не более ${LIMITS.passwordMax} символов`;
    }
    return '';
}

/**
 * @param {string} value
 * @param {string} password
 * @returns {string}
 */
export function validatePasswordRepeat(value, password) {
    if (!value) return 'Повторите пароль';
    if (value !== password) return 'Пароли не совпадают';
    return '';
}
