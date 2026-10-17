import { mockCategories, mockPromos, type Category, type Promo } from './data';
import { logWarn } from '@/lib/logger';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const DEFAULT_TIMEOUT_MS = 10000;
const UPLOAD_TIMEOUT_MS = 60000;

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_ERROR = 'invalid csrf token';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type Price = string;
export type ListingStatus = 'draft' | 'moderation' | 'active' | 'closed' | 'sold';
export type CloseReason = 'sold_on_goget' | 'sold_elsewhere' | 'changed_mind' | 'other';
export type Condition = 'new' | 'used_good' | 'used_repair';
export type Sort = 'newest' | 'price_asc' | 'price_desc';
export type DeliveryMethod = 'courier' | 'pickup_point' | 'self_pickup';
export type PaymentMethod = 'card' | 'sbp' | 'cod';

export interface User {
    id: number;
    email: string;
    first_name: string;
    phone: string;
}

export interface City {
    id: number;
    name: string;
}

export interface Profile extends User {
    phone_verified: boolean;
    city: City | null;
    about: string;
    avatar_url: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
}

export interface UpdateProfileData {
    first_name?: string;
    phone?: string;
    email?: string;
    city_id?: number;
    about?: string;
}

export interface CategoryNode {
    id: number;
    name: string;
    slug: string;
    /** Пустой массив у листа */
    children: CategoryNode[];
}

export interface AdCard {
    id: number;
    title: string;
    price: Price;
    is_free?: boolean;
    image_url: string | null;
    city: string;
    has_delivery: boolean;
    category_id?: number;
    created_at: string;
}

export interface AdPage<T = AdCard> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface MyAdCard extends AdCard {
    status: ListingStatus;
    close_reason: CloseReason | null;
    updated_at: string;
}

export interface MyListingPage extends AdPage<MyAdCard> {
    counts: Record<'all' | ListingStatus, number>;
}

export interface SellerAdPage extends AdPage {
    categories: { id: number; name: string; count: number }[];
}

export interface UploadedPhoto {
    id: number;
    url: string;
    thumb_url: string;
}

export interface ListingPhoto extends UploadedPhoto {
    is_main: boolean;
}

export interface SellerShort {
    id: number;
    first_name: string;
    avatar_url: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
}

export interface SellerProfile extends SellerShort {
    location: string;
    phone_verified: boolean;
    completed_sales_count: number;
    active_listings_count: number;
}

export interface Listing {
    id: number;
    title: string;
    category: { id: number; name: string; path: string } | null;
    description: string;
    photos: ListingPhoto[];
    price: Price | null;
    is_free: boolean;
    is_negotiable: boolean;
    condition: Condition | null;
    city: string;
    address: string | null;
    has_delivery: boolean;
    attributes: { key: string; name: string; value: string }[];
    status: ListingStatus;
    close_reason: CloseReason | null;
    seller: SellerShort;
    is_owner: boolean;
    in_cart: boolean;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ListingData {
    category_id?: number;
    title?: string;
    photo_ids?: number[];
    description?: string;
    price?: string;
    is_free?: boolean;
    is_negotiable?: boolean;
    condition?: Condition;
    address?: string;
    has_delivery?: boolean;
}

export interface CreateListingData extends ListingData {
    publish?: boolean;
}

export interface ListingsQuery {
    q?: string;
    category_id?: number;
    city?: string;
    price_min?: string;
    price_max?: string;
    has_delivery?: boolean;
    sort?: Sort;
    limit?: number;
    offset?: number;
}

export interface PageQuery {
    limit?: number;
    offset?: number;
}

export interface CartItem {
    listing_id: number;
    title: string | null;
    price: Price | null;
    image_url: string | null;
    address: string | null;
    delivery_from: string | null;
    availability: 'available' | 'unavailable';
    unavailable_reason: 'sold' | 'closed' | 'deleted' | null;
}

export interface Cart {
    items_count: number;
    groups: {
        seller: { id: number; first_name: string; avatar_url: string | null; rating: number };
        items: CartItem[];
    }[];
}

export interface CartCount {
    items_count: number;
}

export interface OrderItem {
    listing_id: number;
    seller_id: number;
    title: string;
    price: Price;
    image_url: string | null;
}

export interface Recipient {
    first_name: string;
    phone: string;
}

export interface CheckoutQuote {
    items: OrderItem[];
    items_total: Price;
    sellers: {
        seller_id: number;
        first_name: string;
        items_count: number;
        delivery_methods: { method: DeliveryMethod; price: Price; available: boolean; hint: string }[];
    }[];
    addresses: { id: number; label: string; text: string; is_default: boolean }[];
    delivery_slots: { dates: string[]; times: string[] };
    recipient: Recipient;
    payment_methods: { method: PaymentMethod }[];
}

export interface OrderDelivery {
    by_seller: { seller_id: number; method: DeliveryMethod }[];
    address_id?: number | null;
    address?: { text: string } | null;
    date?: string | null;
    time_slot?: string | null;
    comment?: string;
}

export interface CreateOrderData {
    listing_ids: number[];
    delivery: OrderDelivery;
    recipient: Recipient;
    payment_method: PaymentMethod;
}

export interface Order {
    id: number;
    number: number;
    status: 'awaiting_payment' | 'placed' | 'cancelled';
    pay_until: string | null;
    items: OrderItem[];
    totals: { items: Price; delivery: Price; total: Price };
    delivery: OrderDelivery & { address_text: string | null };
    payment: {
        method: PaymentMethod;
        status: 'pending' | 'processing' | 'paid' | 'failed' | 'on_delivery';
        confirmation_url: string | null;
    };
    created_at: string;
}

interface ErrorBody {
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
}

export class ApiError extends Error {
    status: number;
    network: boolean;
    timeout: boolean;
    field: string;
    reason: string;
    listingIds: number[];
    orderId: number | null;
    orderNumber: number | null;

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
    }
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
    const body = await response.clone().json().catch(() => null);
    return body && typeof body === 'object' ? body : {};
}

async function ensureOk(response: Response): Promise<void> {
    if (response.ok) return;

    const body = await readErrorBody(response);
    throw new ApiError(response.status, {
        field: body.field ?? '',
        reason: body.error ?? '',
        listingIds: body.listing_ids,
        orderId: body.order_id,
        orderNumber: body.order_number,
    });
}

async function json<T>(response: Response): Promise<T> {
    await ensureOk(response);
    return response.json();
}

export type RequestOptions = RequestInit & { timeout?: number };

let csrfToken: string | null = null;
let csrfLoading: Promise<string> | null = null;

export function resetCsrfToken(): void {
    csrfToken = null;
}

async function send(endpoint: string, { timeout = DEFAULT_TIMEOUT_MS, ...options }: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = timeout > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeout)
        : null;

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            signal: controller.signal,
        });
        const body = await response.text();
        return new Response(body || null, response);
    } catch {
        throw timedOut
            ? new ApiError(0, { timeout: true })
            : new ApiError(0, { network: true });
    } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
    }
}

async function getCsrfToken(): Promise<string> {
    if (csrfToken !== null) return csrfToken;

    csrfLoading ??= (async () => {
        const response = await send('/csrf', { method: 'GET' });
        if (response.status === 404) return '';

        const { csrf_token: token } = await json<{ csrf_token: string }>(response);
        return token;
    })().finally(() => {
        csrfLoading = null;
    });

    csrfToken = await csrfLoading;
    return csrfToken;
}

async function isCsrfRejected(response: Response): Promise<boolean> {
    if (response.status !== 403) return false;
    return (await readErrorBody(response)).error === CSRF_ERROR;
}

/**
 * Базовый запрос к API: cookie, таймаут, JSON-заголовок для строкового тела.
 * К POST/PUT/PATCH/DELETE добавляет CSRF-токен; если бэк его отверг
 * (например, токен истёк), берёт новый и повторяет запрос один раз.
 * Бросает ApiError только при сетевой ошибке или таймауте, HTTP-статус проверяет вызывающий.
 * @param options параметры fetch и timeout в мс (0 — без таймаута)
 */
export async function request(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = new Headers(options.headers);

    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (!UNSAFE_METHODS.has(method)) {
        return send(endpoint, { ...options, headers });
    }

    const sendWithToken = async () => {
        const token = await getCsrfToken();
        if (token) headers.set(CSRF_HEADER, token);
        else headers.delete(CSRF_HEADER);
        return send(endpoint, { ...options, headers });
    };

    const response = await sendWithToken();
    if (!(await isCsrfRejected(response))) return response;

    resetCsrfToken();
    return sendWithToken();
}

function query(params: object = {}): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const str = search.toString();
    return str ? `?${str}` : '';
}

function jsonBody(data: unknown): RequestOptions {
    return { body: JSON.stringify(data) };
}

function fileBody(file: Blob): RequestOptions {
    const form = new FormData();
    form.append('file', file);
    return { body: form, timeout: UPLOAD_TIMEOUT_MS };
}

export async function getMe(): Promise<Profile | null> {
    const response = await request('/me');

    if (response.status >= 400 && response.status < 500) {
        return null;
    }

    return json(response);
}

export async function login({ login, password }: { login: string; password: string }): Promise<User> {
    const response = await request('/login', { method: 'POST', ...jsonBody({ login, password }) });
    const user = await json<User>(response);
    resetCsrfToken();
    return user;
}

export interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    phone: string;
}

export async function register({ email, password, first_name, phone }: RegisterData): Promise<User> {
    const response = await request('/register', {
        method: 'POST',
        ...jsonBody({ email, password, first_name, phone }),
    });
    const user = await json<User>(response);
    resetCsrfToken();
    return user;
}

export async function logout(): Promise<void> {
    const response = await request('/logout', { method: 'POST' });
    await ensureOk(response);
    resetCsrfToken();
}

export async function updateProfile(data: UpdateProfileData): Promise<Profile> {
    return json(await request('/me', { method: 'PATCH', ...jsonBody(data) }));
}

export async function uploadAvatar(file: Blob): Promise<{ avatar_url: string | null }> {
    return json(await request('/me/avatar', { method: 'POST', ...fileBody(file) }));
}

export async function changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await ensureOk(await request('/me/password', { method: 'PUT', ...jsonBody(data) }));
}

export async function getMyListings(params: PageQuery & { status?: ListingStatus } = {}): Promise<MyListingPage> {
    return json(await request(`/me/listings${query(params)}`));
}

export async function getCities(search = ''): Promise<City[]> {
    return json(await request(`/cities${query({ query: search })}`));
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
    return json(await request('/categories'));
}

export function getCategories(): Promise<Category[]> {
    return Promise.resolve(mockCategories);
}

export function getPromos(): Promise<Promo[]> {
    return Promise.resolve(mockPromos);
}

export async function getListings(params: ListingsQuery = {}): Promise<AdPage> {
    return json(await request(`/listings${query(params)}`));
}

export async function getProducts(): Promise<AdCard[]> {
    try {
        return (await getListings()).items ?? [];
    } catch (err) {
        logWarn('API недоступен:', err);
        return [];
    }
}

export async function getListing(id: number): Promise<Listing> {
    return json(await request(`/listings/${id}`));
}

export async function createListing(data: CreateListingData): Promise<Listing> {
    return json(await request('/listings', { method: 'POST', ...jsonBody(data) }));
}

export async function updateListing(id: number, data: ListingData): Promise<Listing> {
    return json(await request(`/listings/${id}`, { method: 'PATCH', ...jsonBody(data) }));
}

export async function deleteListing(id: number): Promise<void> {
    await ensureOk(await request(`/listings/${id}`, { method: 'DELETE' }));
}

export async function closeListing(id: number, reason: CloseReason): Promise<Listing> {
    return json(await request(`/listings/${id}/close`, { method: 'POST', ...jsonBody({ reason }) }));
}

/** Фото загружается до отправки формы, в форму уходит его id */
export async function uploadListingPhoto(file: Blob): Promise<UploadedPhoto> {
    return json(await request('/listing-photos', { method: 'POST', ...fileBody(file) }));
}

export async function getSeller(id: number): Promise<SellerProfile> {
    return json(await request(`/sellers/${id}`));
}

export async function getSellerListings(
    id: number,
    params: PageQuery & { category_id?: number; sort?: Sort } = {},
): Promise<SellerAdPage> {
    return json(await request(`/sellers/${id}/listings${query(params)}`));
}

export async function getCart(): Promise<Cart> {
    return json(await request('/cart'));
}

export async function addToCart(listingId: number): Promise<CartCount> {
    return json(await request('/cart/items', { method: 'POST', ...jsonBody({ listing_id: listingId }) }));
}

export async function removeFromCart(listingId: number): Promise<CartCount> {
    return json(await request(`/cart/items/${listingId}`, { method: 'DELETE' }));
}

export async function removeFromCartBulk(listingIds: number[]): Promise<CartCount> {
    return json(await request('/cart/items/bulk-delete', { method: 'POST', ...jsonBody({ listing_ids: listingIds }) }));
}

export async function getCheckoutQuote(listingIds: number[]): Promise<CheckoutQuote> {
    return json(await request('/checkout/quote', { method: 'POST', ...jsonBody({ listing_ids: listingIds }) }));
}

/**
 * @param idempotencyKey один ключ на одну попытку оформления: при повторе после
 * сетевой ошибки передайте тот же ключ, чтобы не создать заказ дважды
 */
export async function createOrder(data: CreateOrderData, idempotencyKey: string = crypto.randomUUID()): Promise<Order> {
    return json(await request('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        ...jsonBody(data),
    }));
}

export async function getOrder(id: number): Promise<Order> {
    return json(await request(`/orders/${id}`));
}

export async function payOrder(id: number, method: PaymentMethod): Promise<Order> {
    return json(await request(`/orders/${id}/payment`, { method: 'POST', ...jsonBody({ method }) }));
}
