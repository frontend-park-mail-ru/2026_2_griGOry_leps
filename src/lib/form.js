/**
 * @module form
 * @description Живая валидация формы без привязки к DOM: хранит значения и ошибки,
 * а страница перерисовывает поля через VDOM, когда они меняются.
 */

import { debounce } from '@/lib/debounce.js';

/** Пауза после последнего нажатия клавиши, после которой показываются ошибки */
const VALIDATION_DELAY_MS = 300;

/**
 * @typedef {Object} FieldRule
 * @property {function(string, Object<string, string>): string} validate Текст ошибки или ''
 * @property {function(string): string} [sanitize] На каждый ввод
 * @property {function(string): string} [normalize] По окончании ввода и при отправке
 * @property {string} [required] Текст ошибки для пустого поля, показывается только после сабмита
 */

/**
 * Валидация «по вводу»: ошибки показываются, когда пользователь сделал паузу в 300 мс,
 * а не на каждое нажатие клавиши. При уходе из поля и при отправке — сразу.
 * Поля, которых пользователь уже касался, перепроверяются при любом вводе,
 * поэтому «Повторите пароль» реагирует и на изменение «Пароля».
 * @example
 * const validation = new FormValidation(rules, () => this.setState({
 *     values: { ...validation.values },
 *     errors: { ...validation.errors },
 * }));
 * // <input onInput={(e) => validation.input('email', e.target.value)} />
 */
export class FormValidation {
    /**
     * @param {Record<string, FieldRule>} rules
     * @param {function(): void} onUpdate Значения или ошибки изменились — пора перерисовать форму
     */
    constructor(rules, onUpdate) {
        this.rules = rules;
        this.onUpdate = onUpdate;

        /** @type {Record<string, string>} */
        this.values = Object.fromEntries(Object.keys(rules).map((name) => [name, '']));
        /** @type {Record<string, string>} */
        this.errors = {};

        this.touched = new Set();
        this.submitted = false;

        this.validateTouchedDebounced = debounce(() => {
            this.validateTouched();
            this.onUpdate();
        }, VALIDATION_DELAY_MS);
    }

    /**
     * @param {string} name
     * @returns {boolean} Есть ли такое поле в форме
     */
    has(name) {
        return name in this.rules;
    }

    /**
     * Пользователь ввёл символ: значение (например, телефон) форматируется сразу, проверка — после паузы.
     * @param {string} name
     * @param {string} value
     */
    input(name, value) {
        const rule = this.rules[name];
        if (!rule) return;

        this.values[name] = rule.sanitize ? rule.sanitize(value) : value;
        this.touched.add(name);
        this.onUpdate();
        this.validateTouchedDebounced();
    }

    /**
     * Пользователь закончил ввод и ушёл из поля: нормализуем значение и проверяем сразу.
     * @param {string} name
     */
    change(name) {
        const rule = this.rules[name];
        if (!rule) return;

        if (rule.normalize) this.values[name] = rule.normalize(this.values[name]);
        if (this.touched.has(name)) {
            this.validateTouchedDebounced.cancel();
            this.validateTouched();
        }
        this.onUpdate();
    }

    /**
     * @param {string} name
     * @returns {string} Текст ошибки или ''
     */
    validateField(name) {
        const value = this.values[name] ?? '';
        const message = value === ''
            ? (this.submitted ? (this.rules[name].required ?? '') : '')
            : this.rules[name].validate(value, this.values);

        this.errors[name] = message;
        return message;
    }

    validateTouched() {
        this.touched.forEach((name) => this.validateField(name));
    }

    /**
     * Проверяет все поля.
     * @returns {?Record<string, string>} Значения формы или null, если есть ошибки
     */
    validateAll() {
        this.validateTouchedDebounced.cancel();
        this.submitted = true;

        let isValid = true;
        Object.keys(this.rules).forEach((name) => {
            const rule = this.rules[name];
            if (rule.normalize) this.values[name] = rule.normalize(this.values[name]);
            this.touched.add(name);
            if (this.validateField(name)) isValid = false;
        });
        this.onUpdate();

        return isValid ? { ...this.values } : null;
    }

    /**
     * Ошибка от бэка для конкретного поля.
     * @param {string} name
     * @param {string} message
     */
    setError(name, message) {
        this.errors[name] = message;
        this.onUpdate();
    }

    /** Отменяет отложенную проверку, когда страница уходит */
    destroy() {
        this.validateTouchedDebounced.cancel();
    }
}

/**
 * Переводит ошибку ответа бэка в текст: для конкретного поля, если бэк его указал,
 * иначе — общий текст для формы.
 * @param {module:api.ApiError} err
 * @param {Object} options
 * @param {string[]} options.fields Поля, которые есть в форме
 * @param {string} options.fallback
 * @param {Object<number, string>} [options.byStatus]
 * @param {Object<string, string>} [options.conflictMessages] Тексты для 409 по имени поля
 * @returns {{field: (string|undefined), message: string}} field есть, если ошибка относится к полю
 */
export function describeApiError(err, { fields, fallback, byStatus = {}, conflictMessages = {} }) {
    if (err?.field && fields.includes(err.field)) {
        return {
            field: err.field,
            message: err.status === 409
                ? (conflictMessages[err.field] ?? 'Такое значение уже занято')
                : 'Проверьте значение поля',
        };
    }

    if (err?.timeout) return { message: 'Сервер не отвечает. Попробуйте ещё раз' };
    if (err?.network) return { message: 'Нет соединения с сервером. Проверьте интернет' };

    return { message: byStatus[err?.status] ?? fallback };
}
