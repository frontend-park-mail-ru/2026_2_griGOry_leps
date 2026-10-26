/** Тело ошибки бэка */
export interface ErrorBody {
    error?: string;
    field?: string;
    listing_ids?: number[];
    order_id?: number;
    order_number?: number;
}

export interface ApiErrorOptions {
    network?: boolean;
    timeout?: boolean;
    field?: string;
    reason?: string;
    listingIds?: number[];
    orderId?: number;
    orderNumber?: number;
    retryAfter?: number;
}

export class ApiError extends Error {
    /** HTTP-статус, 0 при сетевой ошибке */
    status: number;
    network: boolean;
    timeout: boolean;
    /** Поле формы, к которому бэк отнёс ошибку */
    field: string;
    /** Текст ошибки от бэка, например "listing is sold" */
    reason: string;
    /** Недоступные объявления (409 "cart items are unavailable") */
    listingIds: number[];
    /** Заказ, из-за которого нельзя удалить объявление (409 "listing has active order") */
    orderId: number | null;
    orderNumber: number | null;
    /** Через сколько секунд можно повторить запрос после 429, 0 — неизвестно */
    retryAfter: number;

    constructor(status: number, options: ApiErrorOptions = {}) {
        const { network = false, timeout = false, field = '', reason = '' } = options;

        let message = `HTTP ${status}`;
        if (timeout) message = 'Timeout';
        else if (network) message = 'Network error';
        else if (reason) message = `HTTP ${status}: ${reason}`;

        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.network = network;
        this.timeout = timeout;
        this.field = field;
        this.reason = reason;
        this.listingIds = options.listingIds ?? [];
        this.orderId = options.orderId ?? null;
        this.orderNumber = options.orderNumber ?? null;
        this.retryAfter = options.retryAfter ?? 0;
    }
}

export async function readErrorBody(response: Response): Promise<ErrorBody> {
    const body = await response.clone().json().catch(() => null);
    return body && typeof body === 'object' ? body : {};
}

/** Бросает ApiError со всеми подробностями из тела ответа, если статус не 2xx */
export async function ensureOk(response: Response): Promise<void> {
    if (response.ok) return;

    const body = await readErrorBody(response);
    throw new ApiError(response.status, {
        field: body.field ?? '',
        reason: body.error ?? '',
        listingIds: body.listing_ids,
        orderId: body.order_id,
        orderNumber: body.order_number,
        retryAfter: Number(response.headers.get('Retry-After')) || 0,
    });
}

/** Проверяет статус и разбирает JSON */
export async function json<T>(response: Response): Promise<T> {
    await ensureOk(response);
    return response.json();
}
