import { setFieldError } from '@/components/form-field/form-field.js';
import { setFormError } from '@/components/auth-form/auth-form.js';

/**
 * @typedef {{
 *   validate: (value: string, values: Record<string, string>) => string,
 *   sanitize?: (value: string) => string,
 * }} FieldRule
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

    const validateField = (name, values) => {
        const message = rules[name].validate(values[name] ?? '', values);
        setFieldError(form, name, message);
        return message;
    };

    form.addEventListener('input', (e) => {
        const input = /** @type {HTMLInputElement} */ (e.target);
        const rule = rules[input.name];
        if (!rule) return;

        if (rule.sanitize) input.value = rule.sanitize(input.value);

        touched.add(input.name);
        const values = readValues(form);
        touched.forEach((name) => validateField(name, values));
        onInput?.(values);
    });

    return {
        /**
         * Проверяет все поля. Возвращает значения или null, если есть ошибки.
         */
        validateAll() {
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
 * @param {{ fallback: string, byStatus?: Record<number, string> }} messages
 */
export function showApiError(form, err, { fallback, byStatus = {} }) {
    if (err?.field && form.querySelector(`[data-error-for="${err.field}"]`)) {
        setFieldError(
            form,
            err.field,
            err.status === 409 ? 'Такое значение уже занято' : 'Проверьте значение поля',
        );
        return;
    }

    if (err?.network) {
        setFormError(form, 'Нет соединения с сервером. Проверьте интернет');
        return;
    }

    setFormError(form, byStatus[err?.status] ?? fallback);
}
