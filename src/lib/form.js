import { setFieldError } from '@/components/form-field/form-field.js';
import { setFormError } from '@/components/auth-form/auth-form.js';

/**
 * @typedef {Object} FieldRule
 * @property {function(string, Object<string, string>): string} validate
 * @property {function(string): string} [sanitize] На каждый ввод
 * @property {function(string): string} [normalize] По окончании ввода и при отправке
 * @property {string} [required] Текст ошибки для пустого поля, показывается только после сабмита
 */

/**
 * @param {HTMLFormElement} form
 * @returns {Record<string, string>}
 */
function readValues(form) {
    const values = {};
    new FormData(form).forEach((value, name) => {
        values[name] = String(value);
    });
    return values;
}

/**
 * Валидация «по вводу»: ошибка появляется сразу, пока пользователь печатает.
 * Поля, которых пользователь уже касался, перепроверяются при любом вводе,
 * поэтому «Повторите пароль» реагирует и на изменение «Пароля».
 * @param {HTMLFormElement} form
 * @param {Record<string, FieldRule>} rules
 * @param {function(Object<string, string>): void} [onInput]
 * @returns {{validateAll: function(): ?Object<string, string>}}
 */
export function bindLiveValidation(form, rules, onInput) {
    const touched = new Set();
    let submitted = false;

    const validateField = (name, values) => {
        const rule = rules[name];
        const value = values[name] ?? '';

        let message = '';
        if (value === '') {
            message = submitted ? (rule.required ?? '') : '';
        } else {
            message = rule.validate(value, values);
        }

        setFieldError(form, name, message);
        return message;
    };

    /**
     * @param {HTMLInputElement} input
     * @param {Object} [options]
     * @param {boolean} [options.normalize]
     */
    const transform = (input, { normalize = false } = {}) => {
        const rule = rules[input.name];
        if (rule.sanitize) input.value = rule.sanitize(input.value);
        if (normalize && rule.normalize) input.value = rule.normalize(input.value);
    };

    form.addEventListener('input', (e) => {
        const input = /** @type {HTMLInputElement} */ (e.target);
        const rule = rules[input.name];
        if (!rule) return;

        transform(input);

        touched.add(input.name);
        const values = readValues(form);
        touched.forEach((name) => validateField(name, values));
        onInput?.(values);
    });

    // normalize применяется, когда пользователь закончил ввод (blur) и перед отправкой
    form.addEventListener('change', (e) => {
        const input = /** @type {HTMLInputElement} */ (e.target);
        const rule = rules[input.name];
        if (!rule?.normalize) return;

        transform(input, { normalize: true });
        if (touched.has(input.name)) validateField(input.name, readValues(form));
    });

    return {
        /**
         * Проверяет все поля. Возвращает значения или null, если есть ошибки.
         */
        validateAll() {
            submitted = true;

            Object.keys(rules).forEach((name) => {
                const input = form.elements.namedItem(name);
                if (input instanceof HTMLInputElement) {
                    transform(input, { normalize: true });
                }
            });

            const values = readValues(form);
            let isValid = true;

            Object.keys(rules).forEach((name) => {
                touched.add(name);
                if (validateField(name, values)) isValid = false;
            });
            onInput?.(values);

            return isValid ? values : null;
        },
    };
}

/**
 * Показывает ошибку ответа бэка: подсвечивает поле из `field`,
 * иначе выводит общее сообщение над кнопкой.
 * @param {HTMLFormElement} form
 * @param {module:api.ApiError} err
 * @param {Object} messages
 * @param {string} messages.fallback
 * @param {Object<number, string>} [messages.byStatus]
 * @param {Object<string, string>} [messages.conflictMessages] Тексты для 409 по имени поля
 */
export function showApiError(form, err, { fallback, byStatus = {}, conflictMessages = {} }) {
    if (err?.field && form.querySelector(`[data-error-for="${err.field}"]`)) {
        setFieldError(
            form,
            err.field,
            err.status === 409
                ? (conflictMessages[err.field] ?? 'Такое значение уже занято')
                : 'Проверьте значение поля',
        );
        return;
    }

    if (err?.network) {
        setFormError(form, 'Нет соединения с сервером. Проверьте интернет');
        return;
    }

    setFormError(form, byStatus[err?.status] ?? fallback);
}
