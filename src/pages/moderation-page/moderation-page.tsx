import { Component } from 'goget-vdom';
import {
    ApiError, decideModeration, getModerationListing, getModerationQueue,
    type ModerationRequest, type ModerationSnapshot, type Profile,
} from '@/lib/api';
import { formatDay, formatPrice, logWarn } from '@/lib/core';
import { CONDITION_LABELS, priceText } from '@/lib/listings';
import { Button } from '@/components/button/button';
import { ListingGallery } from '@/components/listing-gallery/listing-gallery';
import { Modal } from '@/components/modal/modal';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import './moderation-page.scss';

interface Props {
    profile: Profile;
    onLogout: () => Promise<void>;
}

interface State {
    status: 'loading' | 'ready' | 'forbidden' | 'error';
    items: ModerationRequest[];
    cursor: string | null;
    more: boolean;
    selected: number | null;
    detail: ModerationSnapshot | null;
    detailLoading: boolean;
    detailError: string;
    rejectOpen: boolean;
    reason: string;
    busy: boolean;
    error: string;
    notice: string;
}

const MAX_REASON = 500;

function wasChanged(err: unknown): boolean {
    return err instanceof ApiError && (err.status === 409 || err.status === 404);
}

function requestedAt(value: string): string {
    const day = formatDay(value);
    const time = new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time}`;
}

export class ModerationPage extends Component<Props, State> {
    state: State = {
        status: this.props.profile.is_moderator ? 'loading' : 'forbidden', items: [], cursor: null, more: false,
        selected: null, detail: null, detailLoading: false, detailError: '',
        rejectOpen: false, reason: '', busy: false, error: '', notice: '',
    };

    private queueVersion = 0;
    private detailVersion = 0;
    private mounted = false;

    componentDidMount() {
        this.mounted = true;
        if (this.props.profile.is_moderator) void this.loadQueue();
    }

    componentWillUnmount() {
        this.mounted = false;
        this.queueVersion++;
        this.detailVersion++;
    }

    deny() {
        this.queueVersion++;
        this.detailVersion++;
        this.setState({ status: 'forbidden', items: [], detail: null, rejectOpen: false, busy: false });
    }

    loadQueue = async () => {
        const version = ++this.queueVersion;
        const { selected } = this.state;
        this.detailVersion++;
        this.setState({ status: 'loading', items: [], cursor: null, more: false, detail: null, error: '' });
        try {
            const page = await getModerationQueue();
            if (version !== this.queueVersion) return;
            const next = page.items.some((item) => item.id === selected) ? selected : page.items[0]?.id ?? null;
            this.setState({ status: 'ready', items: page.items, cursor: page.next_cursor, selected: next });
            if (next !== null) void this.select(next);
        } catch (err) {
            if (version !== this.queueVersion) return;
            if (err instanceof ApiError && err.status === 403) this.deny();
            else {
                logWarn('Не удалось загрузить очередь модерации:', err);
                this.setState({ status: 'error' });
            }
        }
    };

    loadMore = async () => {
        const { cursor, more } = this.state;
        if (!cursor || more) return;
        const version = this.queueVersion;
        this.setState({ more: true, error: '' });
        try {
            const page = await getModerationQueue(cursor);
            if (version !== this.queueVersion) return;
            const seen = new Set(this.state.items.map(({ id }) => id));
            this.setState({
                items: [...this.state.items, ...page.items.filter(({ id }) => !seen.has(id))],
                cursor: page.next_cursor,
            });
        } catch (err) {
            if (version !== this.queueVersion) return;
            if (err instanceof ApiError && err.status === 403) this.deny();
            else this.setState({ error: 'Не удалось загрузить следующие объявления. Попробуйте ещё раз.' });
        } finally {
            if (version === this.queueVersion) this.setState({ more: false });
        }
    };

    select = async (id: number) => {
        if (this.state.busy) return;
        const version = ++this.detailVersion;
        this.setState({ selected: id, detail: null, detailLoading: true, detailError: '', rejectOpen: false, reason: '' });
        try {
            const detail = await getModerationListing(id);
            if (version === this.detailVersion) this.setState({ detail, detailLoading: false });
        } catch (err) {
            if (version !== this.detailVersion) return;
            if (err instanceof ApiError && err.status === 403) this.deny();
            else this.setState({
                detailLoading: false,
                detailError: wasChanged(err) ? 'Объявление больше не в очереди. Обновите список.' : 'Не удалось открыть объявление.',
            });
        }
    };

    decide = async (reason?: string) => {
        const { detail, busy } = this.state;
        if (!detail || busy) return;
        if (reason !== undefined && (!reason || [...reason].length > MAX_REASON)) return;
        this.setState({ busy: true, error: '', notice: '' });
        try {
            await decideModeration(detail.listing.id, detail.revision, reason);
            if (!this.mounted) return;
            this.setState({
                busy: false, rejectOpen: false, reason: '', notice: reason === undefined ? 'Объявление одобрено' : 'Объявление отклонено',
            });
            await this.loadQueue();
        } catch (err) {
            if (!this.mounted) return;
            this.setState({ busy: false });
            if (wasChanged(err)) {
                this.setState({ rejectOpen: false, reason: '', notice: 'Объявление изменилось или его уже проверили. Очередь обновлена.' });
                await this.loadQueue();
            } else if (err instanceof ApiError && err.status === 403) {
                this.deny();
            } else {
                const message = err instanceof ApiError && err.field === 'reason'
                    ? 'Укажите причину длиной от 1 до 500 символов.'
                    : 'Не удалось сохранить решение. Попробуйте ещё раз.';
                this.setState({ error: message });
            }
        }
    };

    closeReject = () => {
        if (!this.state.busy) this.setState({ rejectOpen: false, reason: '', error: '' });
    };

    renderReject(detail: ModerationSnapshot) {
        const { reason, busy, error } = this.state;
        const size = [...reason.trim()].length;
        return (
            <Modal title="Отклонить объявление?" description={`${detail.listing.title} · №${detail.listing.id}`}
                onClose={this.closeReject} actions={
                    <>
                        <Button text="Отмена" variant="secondary" disabled={busy} onClick={this.closeReject} />
                        <Button text={busy ? 'Отклоняем…' : 'Отклонить'} variant="danger"
                            disabled={busy || size === 0 || size > MAX_REASON} onClick={() => void this.decide(reason.trim())} />
                    </>
                }>
                <label class="moderation__reason-label" for="moderation-reason">Причина отклонения</label>
                <textarea id="moderation-reason" class="moderation__reason" required maxlength={1000} disabled={busy} value={reason}
                    aria-describedby="moderation-reason-help" aria-invalid={size > MAX_REASON ? 'true' : undefined}
                    onInput={(event: Event) => this.setState({ reason: (event.target as HTMLTextAreaElement).value, error: '' })} />
                <p class="moderation__muted" id="moderation-reason-help">
                    {size > MAX_REASON ? 'Причина должна быть не длиннее 500 символов.' : 'Автор увидит причину в разделе «Мои объявления».'}
                </p>
                {error && <p class="moderation__error" role="alert">{error}</p>}
            </Modal>
        );
    }

    renderDetail(detail: ModerationSnapshot) {
        const { listing } = detail;
        const { busy } = this.state;
        return (
            <article class="moderation__detail">
                <p class="moderation__badge">На проверке</p>
                <h2 class="moderation__title">{listing.title}</h2>
                <p class="moderation__muted">№{listing.id}{listing.category ? ` · ${listing.category.path}` : ''}</p>
                <div class="moderation__preview">
                    <ListingGallery key={listing.id} photos={listing.photos} title={listing.title} openOriginal />
                    <dl class="moderation__facts">
                        <dt class="moderation__term">Цена</dt><dd class="moderation__value">{priceText(listing)}</dd>
                        <dt class="moderation__term">Автор</dt><dd class="moderation__value">{listing.seller.first_name || `Пользователь №${listing.seller.id}`}</dd>
                        <dt class="moderation__term">Город</dt><dd class="moderation__value">{listing.city || 'Не указан'}</dd>
                        {listing.condition && [
                            <dt class="moderation__term">Состояние</dt>,
                            <dd class="moderation__value">{CONDITION_LABELS[listing.condition]}</dd>,
                        ]}
                        <dt class="moderation__term">Отправлено</dt><dd class="moderation__value">{requestedAt(detail.requested_at)}</dd>
                    </dl>
                </div>
                <h3 class="moderation__subtitle">Описание</h3>
                <p class="moderation__description">{listing.description || 'Описание не добавлено'}</p>
                <div class="moderation__actions">
                    <Button text={busy ? 'Сохраняем…' : 'Одобрить'} disabled={busy} onClick={() => void this.decide()} />
                    <Button text="Отклонить" variant="danger" disabled={busy} onClick={() => this.setState({ rejectOpen: true, error: '' })} />
                </div>
            </article>
        );
    }

    renderQueue() {
        const { items, selected, cursor, more, busy, detail, detailLoading, detailError } = this.state;
        if (!items.length) return <p class="moderation__detail">Новых объявлений пока нет.</p>;
        return (
            <div class="moderation__columns">
                <section aria-label="Очередь объявлений">
                    <p class="moderation__muted">Сначала ранние заявки</p>
                    <ul class="moderation__list">
                        {items.map((item) => (
                            <li key={item.id}>
                                <button type="button" class={selected === item.id ? 'moderation__item moderation__item--selected' : 'moderation__item'}
                                    aria-pressed={selected === item.id ? 'true' : 'false'} disabled={busy} onClick={() => void this.select(item.id)}>
                                    <strong>{item.title}</strong>
                                    <span class="moderation__muted">{item.price !== null ? `${formatPrice(item.price)} ₽ · ` : ''}{requestedAt(item.requested_at)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {cursor && <Button variant="outline" text={more ? 'Загружаем…' : 'Показать ещё'} disabled={more || busy} onClick={this.loadMore} />}
                </section>
                {detailLoading && <p class="moderation__detail" aria-busy="true">Загружаем объявление…</p>}
                {detailError && selected !== null && (
                    <div class="moderation__detail">
                        <p role="alert">{detailError}</p>
                        <Button text="Повторить" variant="outline" onClick={() => void this.select(selected)} />
                    </div>
                )}
                {detail && this.renderDetail(detail)}
            </div>
        );
    }

    render() {
        const { status, error, notice, detail, rejectOpen, busy } = this.state;
        return (
            <ProfileLayout profile={this.props.profile} active="moderation" onLogout={this.props.onLogout}>
                <section class="moderation">
                    <h1 class="moderation__heading">Модерация объявлений</h1>
                    {status === 'ready' && (
                        <div class="moderation__bar">
                            <h2 class="moderation__tab">На проверке</h2>
                            <Button text="Обновить" variant="secondary" disabled={busy} onClick={this.loadQueue} />
                        </div>
                    )}
                    {notice && <p class="moderation__notice" role="status">{notice}</p>}
                    {error && !rejectOpen && <p class="moderation__error" role="alert">{error}</p>}
                    {status === 'loading' && <p aria-busy="true">Загружаем очередь…</p>}
                    {status === 'forbidden' && <p>У этого аккаунта нет доступа к модерации.</p>}
                    {status === 'error' && <div><p role="alert">Не удалось загрузить очередь.</p>
                        <Button text="Повторить" variant="outline" onClick={this.loadQueue} /></div>}
                    {status === 'ready' && this.renderQueue()}
                    {rejectOpen && detail && this.renderReject(detail)}
                </section>
            </ProfileLayout>
        );
    }
}
