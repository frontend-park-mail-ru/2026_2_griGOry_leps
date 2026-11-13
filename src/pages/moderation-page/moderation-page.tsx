import { Component } from 'goget-vdom';
import {
    ApiError, approveModerationListing, getModerationListing, getModerationQueue, rejectModerationListing,
    type ModerationItem, type ModerationSnapshot, type Profile,
} from '@/lib/api';
import { formatDay, logWarn } from '@/lib/core';
import { CONDITION_LABELS, priceText } from '@/lib/listings';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import { ListingGallery } from '@/components/listing-gallery/listing-gallery';
import './moderation-page.scss';

interface Props {
    profile: Profile;
    onLogout: () => Promise<void>;
}

interface State {
    status: 'loading' | 'ready' | 'forbidden' | 'error';
    items: ModerationItem[];
    hasMore: boolean;
    loadingMore: boolean;
    selectedId: number | null;
    detail: ModerationSnapshot | null;
    detailStatus: 'idle' | 'loading' | 'error';
    reason: string;
    reasonError: string;
    actionError: string;
    notice: string;
    busy: boolean;
}

function errorText(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.network) return 'Нет соединения с сервером. Проверьте интернет';
        if (err.timeout) return 'Сервер не отвечает. Попробуйте ещё раз';
        if (err.status === 401) return 'Сессия истекла. Войдите снова';
        if (err.status === 403) return 'Нет доступа к модерации';
    }
    return 'Не удалось выполнить действие. Попробуйте ещё раз';
}

export class ModerationPage extends Component<Props, State> {
    state: State = {
        status: 'loading', items: [], hasMore: false, loadingMore: false,
        selectedId: null, detail: null, detailStatus: 'idle', reason: '', reasonError: '',
        actionError: '', notice: '', busy: false,
    };

    private selectionRequest = 0;

    componentDidMount() {
        void this.loadQueue();
    }

    loadQueue = async () => {
        this.setState({ status: 'loading', actionError: '' });
        try {
            const { items, limit } = await getModerationQueue();
            const selectedId = items.some(({ id }) => id === this.state.selectedId)
                ? this.state.selectedId : items[0]?.id ?? null;
            this.setState({ status: 'ready', items, hasMore: items.length === limit });
            if (selectedId !== null) this.selectItem(selectedId);
            else {
                this.selectionRequest++;
                this.setState({ selectedId: null, detail: null, detailStatus: 'idle' });
            }
        } catch (err) {
            logWarn('Не удалось загрузить очередь модерации:', err);
            this.setState({ status: err instanceof ApiError && err.status === 403 ? 'forbidden' : 'error' });
        }
    };

    loadMore = async () => {
        const { items, hasMore, loadingMore } = this.state;
        if (!hasMore || loadingMore || items.length === 0) return;
        this.setState({ loadingMore: true });
        try {
            const { items: next, limit } = await getModerationQueue(items[items.length - 1].id);
            this.setState({
                items: [...this.state.items, ...next.filter(({ id }) => !this.state.items.some((item) => item.id === id))],
                hasMore: next.length === limit,
                actionError: '',
            });
        } catch (err) {
            logWarn('Не удалось загрузить следующую страницу модерации:', err);
            this.setState({ actionError: errorText(err) });
        } finally {
            this.setState({ loadingMore: false });
        }
    };

    selectItem = async (id: number) => {
        if (this.state.busy) return;
        const requestId = ++this.selectionRequest;
        this.setState({ selectedId: id, detail: null, detailStatus: 'loading', reason: '', reasonError: '', actionError: '' });
        try {
            const detail = await getModerationListing(id);
            if (requestId === this.selectionRequest) this.setState({ detail, detailStatus: 'idle' });
        } catch (err) {
            if (requestId !== this.selectionRequest) return;
            logWarn('Не удалось открыть объявление для модерации:', err);
            if (err instanceof ApiError && err.status === 403) {
                this.setState({ status: 'forbidden', detail: null });
            } else if (err instanceof ApiError && err.status === 404) {
                this.setState({ detailStatus: 'error', actionError: 'Объявление уже недоступно для проверки. Обновите очередь' });
            } else {
                this.setState({ detailStatus: 'error', actionError: errorText(err) });
            }
        }
    };

    handleReason = (event: Event) => {
        this.setState({ reason: (event.target as HTMLTextAreaElement).value, reasonError: '' });
    };

    decide = async (approve: boolean) => {
        const { detail, busy, reason } = this.state;
        if (!detail || busy) return;
        const trimmed = reason.trim();
        if (!approve && !trimmed) {
            this.setState({ reasonError: 'Напишите причину отклонения' });
            return;
        }
        this.setState({ busy: true, actionError: '', reasonError: '', notice: '' });
        try {
            if (approve) await approveModerationListing(detail.listing.id, detail.revision);
            else await rejectModerationListing(detail.listing.id, detail.revision, trimmed);
            this.selectionRequest++;
            this.setState({ selectedId: null, detail: null, detailStatus: 'idle', reason: '',
                notice: approve ? 'Объявление одобрено' : 'Объявление отклонено', busy: false });
            await this.loadQueue();
        } catch (err) {
            logWarn('Не удалось принять решение по объявлению:', err);
            if (err instanceof ApiError && err.status === 409) {
                this.setState({ busy: false });
                await this.loadQueue();
                this.setState({ actionError: 'Объявление изменилось или уже проверено. Очередь обновлена' });
            } else if (err instanceof ApiError && err.status === 403) {
                this.setState({ status: 'forbidden' });
            } else if (err instanceof ApiError && err.field === 'reason') {
                this.setState({ reasonError: 'Укажите причину длиной до 500 символов' });
            } else {
                this.setState({ actionError: errorText(err) });
            }
        } finally {
            this.setState({ busy: false });
        }
    };

    renderQueue() {
        const { items, selectedId, hasMore, loadingMore } = this.state;
        return (
            <section class="moderation__queue" aria-label="Очередь объявлений">
                <div class="moderation__queue-head">
                    <h2 class="moderation__queue-title">На проверке</h2>
                    <button type="button" class="moderation__refresh" onClick={this.loadQueue}>Обновить</button>
                </div>
                {items.length === 0 ? <p class="moderation__empty">Новых объявлений пока нет</p> : (
                    <ul class="moderation__list">
                        {items.map((item) => (
                            <li key={item.id}>
                                <button type="button"
                                    class={selectedId === item.id ? 'moderation__item moderation__item--active' : 'moderation__item'}
                                    aria-current={selectedId === item.id ? 'true' : undefined}
                                    onClick={() => this.selectItem(item.id)} disabled={this.state.busy}>
                                    <span class="moderation__item-title">{item.title || 'Без названия'}</span>
                                    <span class="moderation__item-meta">№ {item.id} · {formatDay(item.updated_at)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {hasMore && <button type="button" class="moderation__more" onClick={this.loadMore}
                    disabled={loadingMore}>{loadingMore ? 'Загружаем…' : 'Показать ещё'}</button>}
            </section>
        );
    }

    renderDetail() {
        const { selectedId, detail, detailStatus, reason, reasonError, busy } = this.state;
        if (selectedId === null) return <div class="moderation__detail moderation__empty">Выберите объявление из очереди</div>;
        if (detailStatus === 'loading') return <div class="moderation__detail" aria-busy="true">Загружаем объявление…</div>;
        if (detailStatus === 'error') return <div class="moderation__detail">
            <p>Не удалось открыть объявление</p>
            <button type="button" class="moderation__refresh" onClick={() => this.selectItem(selectedId)}>Повторить</button>
        </div>;
        if (!detail) return null;
        const { listing } = detail;
        return (
            <article class="moderation__detail">
                <p class="moderation__eyebrow">Объявление № {listing.id}</p>
                <h2 class="moderation__title">{listing.title || 'Без названия'}</h2>
                <p class="moderation__price">{priceText(listing)}</p>
                <ListingGallery key={listing.id} photos={listing.photos} title={listing.title} />
                <dl class="moderation__facts">
                    <div class="moderation__fact"><dt class="moderation__term">Категория</dt><dd class="moderation__value">{listing.category?.name ?? 'Не указана'}</dd></div>
                    <div class="moderation__fact"><dt class="moderation__term">Состояние</dt><dd class="moderation__value">{listing.condition ? CONDITION_LABELS[listing.condition] : 'Не указано'}</dd></div>
                    <div class="moderation__fact"><dt class="moderation__term">Город</dt><dd class="moderation__value">{listing.city || 'Не указан'}</dd></div>
                    {listing.address && <div class="moderation__fact"><dt class="moderation__term">Адрес</dt><dd class="moderation__value">{listing.address}</dd></div>}
                    <div class="moderation__fact"><dt class="moderation__term">Доставка</dt><dd class="moderation__value">{listing.has_delivery ? 'Есть' : 'Нет'}</dd></div>
                    <div class="moderation__fact"><dt class="moderation__term">Продавец</dt><dd class="moderation__value">{listing.seller.first_name || `Пользователь № ${listing.seller.id}`}</dd></div>
                    {listing.attributes.map((attribute) => (
                        <div key={attribute.key} class="moderation__fact"><dt class="moderation__term">{attribute.name}</dt><dd class="moderation__value">{attribute.value}</dd></div>
                    ))}
                </dl>
                <h3 class="moderation__subtitle">Описание</h3>
                <p class="moderation__description">{listing.description || 'Описание не добавлено'}</p>
                <div class="moderation__decision">
                    <h3 class="moderation__subtitle">Решение</h3>
                    <label class="moderation__reason-label" for="moderation-reason">Причина отклонения</label>
                    <textarea class="moderation__reason" id="moderation-reason" value={reason} maxlength={500}
                        placeholder="Что продавцу нужно исправить?" onInput={this.handleReason}
                        aria-invalid={String(Boolean(reasonError))} disabled={busy} />
                    <span class="moderation__hint">{reason.length} / 500 · нужна только при отклонении</span>
                    {reasonError && <p class="moderation__error" role="alert">{reasonError}</p>}
                    <div class="moderation__actions">
                        <button type="button" class="moderation__approve" disabled={busy} onClick={() => this.decide(true)}>
                            {busy ? 'Сохраняем…' : 'Одобрить'}
                        </button>
                        <button type="button" class="moderation__reject" disabled={busy} onClick={() => this.decide(false)}>
                            Отклонить
                        </button>
                    </div>
                </div>
            </article>
        );
    }

    render() {
        const { status, actionError, notice } = this.state;
        return (
            <ProfileLayout profile={this.props.profile} active="moderation" onLogout={this.props.onLogout}>
                <section class="moderation">
                    <h1 class="moderation__heading">Модерация объявлений</h1>
                    {notice && <p class="moderation__notice" role="status">{notice}</p>}
                    {actionError && <p class="moderation__error" role="alert">{actionError}</p>}
                    {status === 'loading' && <p aria-busy="true">Загружаем очередь…</p>}
                    {status === 'forbidden' && <p>У этого аккаунта нет доступа к модерации.</p>}
                    {status === 'error' && <div><p>Не удалось загрузить очередь.</p>
                        <button type="button" class="moderation__refresh" onClick={this.loadQueue}>Повторить</button></div>}
                    {status === 'ready' && <div class="moderation__columns">{this.renderQueue()}{this.renderDetail()}</div>}
                </section>
            </ProfileLayout>
        );
    }
}
