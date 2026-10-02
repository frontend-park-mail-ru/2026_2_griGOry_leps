import { setFieldError } from '@/components/form-field/form-field.js';
import { setFormError } from '@/components/auth-form/auth-form.js';

/**
 * @typedef {{
 *   validate: (value: string, values: Record<string, string>) => string,
 *   sanitize?: (value: string) => string,
 *   normalize?: (value: string) => string,
 *   required?: string,
 * }} FieldRule
 * sanitize — на каждый ввод, normalize — по окончании ввода и при отправке,
 * required — текст ошибки для пустого поля (показывается только после сабмита).
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
 * @param {(values: Record<string, string>) => void} [onInput]
 * @returns {{ validateAll: () => Record<string, string> | null }}
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
     * @param {{ normalize?: boolean }} [options]
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
 * @param {{ status?: number, field?: string, network?: boolean }} err
 * @param {{
 *   fallback: string,
 *   byStatus?: Record<number, string>,
 *   conflictMessages?: Record<string, string>,
 * }} messages conflictMessages — тексты для 409 по имени поля
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
