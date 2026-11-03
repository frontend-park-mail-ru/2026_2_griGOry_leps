import { plural } from '@/lib/core';
import { ApiError } from '@/lib/api';

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
