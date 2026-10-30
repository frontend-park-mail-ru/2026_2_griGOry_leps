import { debounce, type Debounced } from '@/lib/debounce';
import { ApiError } from '@/lib/api';
import { plural } from '@/lib/format';

const VALIDATION_DELAY_MS = 300;

export type FormValues = Record<string, string>;

export interface FieldRule {
    validate: (value: string, values: FormValues) => string;
    /** Вызывается на каждый ввод */
    sanitize?: (value: string) => string;
    /** По окончании ввода и при отправке */
    normalize?: (value: string) => string;
    /** Ошибка для пустого поля, показывается только после отправки */
    required?: string;
}

/**
 * Ошибки показываются после паузы в вводе, а при уходе из поля и при отправке — сразу.
 * Поля, которые уже трогали, перепроверяются при любом вводе, поэтому
 * «Повторите пароль» реагирует и на изменение «Пароля».
 */
export class FormValidation {
    rules: Record<string, FieldRule>;
    onUpdate: () => void;
    values: FormValues;
    errors: FormValues = {};
    /** Поля, которые пользователь уже трогал: только у них показываем ошибки */
    touched = new Set<string>();
    submitted = false;
    validateTouchedDebounced: Debounced<[]>;

    constructor(rules: Record<string, FieldRule>, onUpdate: () => void) {
        this.rules = rules;
        this.onUpdate = onUpdate;
        this.values = Object.fromEntries(Object.keys(rules).map((name) => [name, '']));

        this.validateTouchedDebounced = debounce(() => {
            this.validateTouched();
            this.onUpdate();
        }, VALIDATION_DELAY_MS);
    }

    has(name: string): boolean {
        return name in this.rules;
    }

    /** Телефон форматируется сразу, а проверка ждёт паузы */
    input(name: string, value: string): void {
        const rule = this.rules[name];
        if (!rule) return;

        this.values[name] = rule.sanitize ? rule.sanitize(value) : value;
        this.touched.add(name);
        this.onUpdate();
        this.validateTouchedDebounced();
    }

    /** Ушли из поля: нормализуем и проверяем без паузы */
    change(name: string): void {
        const rule = this.rules[name];
        if (!rule) return;

        if (rule.normalize) this.values[name] = rule.normalize(this.values[name]);
        if (this.touched.has(name)) {
            this.validateTouchedDebounced.cancel();
            this.validateTouched();
        }
        this.onUpdate();
    }

    validateField(name: string): string {
        const value = this.values[name] ?? '';
        const message = value === ''
            ? (this.submitted ? (this.rules[name].required ?? '') : '')
            : this.rules[name].validate(value, this.values);

        this.errors[name] = message;
        return message;
    }

    validateTouched(): void {
        this.touched.forEach((name) => this.validateField(name));
    }

    /** null, если есть ошибки */
    validateAll(): FormValues | null {
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

    setError(name: string, message: string): void {
        this.errors[name] = message;
        this.onUpdate();
    }

    /** Вызывать в componentWillUnmount, иначе отложенная проверка сработает после ухода со страницы */
    destroy(): void {
        this.validateTouchedDebounced.cancel();
    }
}

export interface ApiErrorMessages {
    fields: string[];
    fallback: string;
    byStatus?: Record<number, string>;
    /** Тексты для 409 по имени поля */
    conflictMessages?: Record<string, string>;
}

export function tooManyRequestsText(seconds: number): string {
    if (seconds <= 0) return 'Слишком много попыток. Попробуйте позже';
    if (seconds < 60) return `Слишком много попыток. Попробуйте через ${seconds} ${plural(seconds, ['секунду', 'секунды', 'секунд'])}`;
    const minutes = Math.ceil(seconds / 60);
    return `Слишком много попыток. Попробуйте через ${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`;
}

/** field есть, если ошибку надо показать под полем, иначе это общая ошибка формы */
export function describeApiError(
    err: unknown,
    { fields, fallback, byStatus = {}, conflictMessages = {} }: ApiErrorMessages,
): { field?: string; message: string } {
    if (!(err instanceof ApiError)) return { message: fallback };

    if (err.field && fields.includes(err.field)) {
        return {
            field: err.field,
            message: err.status === 409
                ? (conflictMessages[err.field] ?? 'Такое значение уже занято')
                : 'Проверьте значение поля',
        };
    }

    if (err.status === 429) return { message: tooManyRequestsText(err.retryAfter) };
    if (err.status === 403 && err.reason === 'email not verified') {
        return { message: 'Сначала подтвердите почту — ссылка в письме, которое мы отправили' };
    }
    if (err.timeout) return { message: 'Сервер не отвечает. Попробуйте ещё раз' };
    if (err.network) return { message: 'Нет соединения с сервером. Проверьте интернет' };

    return { message: byStatus[err.status] ?? fallback };
}
