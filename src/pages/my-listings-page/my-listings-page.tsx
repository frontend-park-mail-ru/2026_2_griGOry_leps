import { Component } from '@/vdom';
import {
    closeListing,
    deleteListing,
    getMyListings,
    type CloseReason,
    type ListingStatus,
    type MyAdCard as MyAd,
    type MyListingPage,
    type Profile,
} from '@/lib/api';
import { logError } from '@/lib/logger';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import { MyAdCard } from '@/components/my-ad-card/my-ad-card';
import { PageError } from '@/components/page-error/page-error';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Skeleton } from '@/components/skeleton/skeleton';
import { CloseListingModal } from '@/components/close-listing-modal/close-listing-modal';
import { DeleteListingModal } from '@/components/delete-listing-modal/delete-listing-modal';
import './my-listings-page.scss';

export type MyListingsTab = 'active' | 'closed' | 'drafts';

type Counts = MyListingPage['counts'];

export interface MyListingsPageProps {
    tab: MyListingsTab;
    profile: Profile;
    onLogout: () => Promise<void>;
}

export interface MyListingsPageState {
    status: 'loading' | 'error' | 'ready';
    items: MyAd[];
    counts: Counts | null;
    complete: boolean;
    loadingMore: boolean;
    moreError: boolean;
    modal: { type: 'close' | 'delete'; ad: MyAd } | null;
    pending: boolean;
    actionError: string;
}

const TABS: { tab: MyListingsTab; href: string; label: string; statuses: ListingStatus[] }[] = [
    { tab: 'active', href: '/profile/listings', label: 'Активные', statuses: ['active', 'moderation', 'rejected'] },
    { tab: 'closed', href: '/profile/listings/closed', label: 'Снятые', statuses: ['closed', 'sold'] },
    { tab: 'drafts', href: '/profile/listings/drafts', label: 'Черновики', statuses: ['draft'] },
];

const EMPTY_TAB_TEXT: Record<MyListingsTab, { title: string; text: string }> = {
    active: { title: 'Нет активных объявлений', text: 'Опубликованные объявления и объявления на проверке появятся здесь' },
    closed: { title: 'Нет снятых объявлений', text: 'Здесь будут проданные и снятые с продажи объявления' },
    drafts: { title: 'Нет черновиков', text: 'Незаконченные объявления сохранятся здесь' },
};

const LISTINGS_LIMIT = 60;

const SKELETON_ROWS = 3;

function countStatuses(counts: Counts | null, statuses: ListingStatus[]): number {
    return counts ? statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0) : 0;
}

function countItems(items: MyAd[]): Counts {
    const counts: Counts = { all: items.length, draft: 0, moderation: 0, rejected: 0, active: 0, closed: 0, sold: 0 };
    items.forEach(({ status }) => { counts[status] = (counts[status] ?? 0) + 1; });
    return counts;
}

function moveCount(counts: Counts | null, from: ListingStatus, to: ListingStatus | null): Counts | null {
    if (!counts) return counts;
    const next = { ...counts, [from]: Math.max((counts[from] ?? 0) - 1, 0) };
    if (to) next[to] = (next[to] ?? 0) + 1;
    else next.all = Math.max(next.all - 1, 0);
    return next;
}

export class MyListingsPage extends Component<MyListingsPageProps, MyListingsPageState> {
    state: MyListingsPageState = {
        status: 'loading',
        items: [],
        counts: null,
        complete: false,
        loadingMore: false,
        moreError: false,
        modal: null,
        pending: false,
        actionError: '',
    };

    observer: IntersectionObserver | null = null;

    sentinel: Element | null = null;

    componentDidMount() {
        if (typeof IntersectionObserver !== 'undefined') {
            this.observer = new IntersectionObserver(this.handleIntersect, { rootMargin: '400px 0px' });
        }
        void this.load();
    }

    componentWillUnmount() {
        this.observer?.disconnect();
        this.observer = null;
    }

    setSentinel = (el: Element | null) => {
        if (el === this.sentinel) return;
        if (this.sentinel) this.observer?.unobserve(this.sentinel);
        this.sentinel = el;
        if (el) this.observer?.observe(el);
    };

    handleIntersect = (entries: IntersectionObserverEntry[]) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) void this.loadMore();
    };

    load = async () => {
        this.setState({ status: 'loading', moreError: false });
        try {
            const page = await getMyListings({ limit: LISTINGS_LIMIT });
            const items = page.items ?? [];
            this.setState({
                status: 'ready',
                items,
                counts: page.counts ?? null,
                complete: items.length >= (page.total ?? 0),
            });
        } catch (err) {
            logError('Не удалось загрузить мои объявления:', err);
            this.setState({ status: 'error' });
        }
    };

    loadMore = async () => {
        const { status, complete, loadingMore, items } = this.state;
        if (status !== 'ready' || complete || loadingMore) return;

        this.setState({ loadingMore: true, moreError: false });
        try {
            const page = await getMyListings({ limit: LISTINGS_LIMIT, offset: items.length });
            const next = [...this.state.items, ...(page.items ?? [])];
            this.setState({
                items: next,
                counts: page.counts ?? this.state.counts,
                complete: next.length >= (page.total ?? 0) || (page.items ?? []).length === 0,
                loadingMore: false,
            });
            this.recheckSentinel();
        } catch (err) {
            logError('Не удалось догрузить мои объявления:', err);
            this.setState({ loadingMore: false, moreError: true });
        }
    };

    recheckSentinel() {
        const el = this.sentinel;
        if (!el || !this.observer) return;
        this.observer.unobserve(el);
        this.observer.observe(el);
    }

    openModal = (type: 'close' | 'delete', ad: MyAd) => {
        this.setState({ modal: { type, ad }, pending: false, actionError: '' });
    };

    closeModal = () => {
        if (!this.state.pending) this.setState({ modal: null, actionError: '' });
    };

    confirmClose = async (reason: CloseReason) => {
        const ad = this.state.modal?.ad;
        if (!ad) return;

        this.setState({ pending: true, actionError: '' });
        try {
            const listing = await closeListing(ad.id, reason);
            this.setState(({ items, counts }) => ({
                items: items.map((item) => (item.id === ad.id
                    ? { ...item, status: listing.status, close_reason: listing.close_reason, updated_at: listing.updated_at }
                    : item)),
                counts: moveCount(counts, ad.status, listing.status),
                modal: null,
                pending: false,
            }));
        } catch (err) {
            logError('Не удалось снять объявление с продажи:', err);
            this.setState({ pending: false, actionError: 'Не удалось снять объявление. Попробуйте ещё раз' });
        }
    };

    confirmDelete = async () => {
        const ad = this.state.modal?.ad;
        if (!ad) return;

        this.setState({ pending: true, actionError: '' });
        try {
            await deleteListing(ad.id);
            this.setState(({ items, counts }) => ({
                items: items.filter((item) => item.id !== ad.id),
                counts: moveCount(counts, ad.status, null),
                modal: null,
                pending: false,
            }));
        } catch (err) {
            logError('Не удалось удалить объявление:', err);
            this.setState({ pending: false, actionError: 'Не удалось удалить объявление. Попробуйте ещё раз' });
        }
    };

    getCounts(): Counts | null {
        const { status, items, counts, complete } = this.state;
        if (status !== 'ready') return null;
        return complete || !counts ? countItems(items) : counts;
    }

    renderTabs() {
        const counts = this.getCounts();

        return (
            <nav class="my-listings__tabs" aria-label="Статус объявлений">
                {TABS.map(({ tab, href, label, statuses }) => {
                    const active = tab === this.props.tab;
                    return (
                        <a
                            key={tab}
                            href={href}
                            data-link
                            class={active ? 'my-listings__tab my-listings__tab--active' : 'my-listings__tab'}
                            aria-current={active ? 'page' : undefined}
                        >
                            {counts ? `${label} · ${countStatuses(counts, statuses)}` : label}
                        </a>
                    );
                })}
            </nav>
        );
    }

    renderSkeletonRow(key: number) {
        return (
            <div key={`skeleton-${key}`} class="my-listings__skeleton">
                <Skeleton width={144} height={108} radius={12} />
                <span class="my-listings__skeleton-bars">
                    <Skeleton width="100%" height={28} />
                    <Skeleton width="100%" height={16} />
                    <Skeleton width="100%" height={16} />
                    <Skeleton width={200} height={16} />
                </span>
            </div>
        );
    }

    renderSkeleton() {
        return (
            <div class="my-listings__list" aria-busy="true" aria-label="Загрузка">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => this.renderSkeletonRow(i))}
            </div>
        );
    }

    renderEmpty() {
        if (!this.getCounts()?.all) {
            return (
                <EmptyState
                    card
                    emoji="📦"
                    title="У вас пока нет объявлений"
                    text="Отпустите лишнее: создайте объявление в несколько кликов"
                    action={{ label: 'Разместить объявление', disabled: true }}
                />
            );
        }

        const { title, text } = EMPTY_TAB_TEXT[this.props.tab];
        return <EmptyState card title={title} text={text} />;
    }

    renderTail() {
        const { complete, loadingMore, moreError } = this.state;
        if (complete) return null;
        if (moreError) return <PageError onRetry={this.loadMore} />;

        return (
            <>
                {loadingMore && this.renderSkeletonRow(0)}
                <div class="my-listings__sentinel" ref={this.setSentinel} aria-hidden="true" />
            </>
        );
    }

    renderList() {
        const { status, items, complete } = this.state;

        if (status === 'loading') return this.renderSkeleton();
        if (status === 'error') return <PageError onRetry={this.load} />;

        const statuses = TABS.find(({ tab }) => tab === this.props.tab)?.statuses ?? [];
        const visible = items.filter((item) => statuses.includes(item.status));
        if (visible.length === 0 && complete) return this.renderEmpty();

        return (
            <div class="my-listings__list">
                {visible.map((ad) => (
                    <MyAdCard
                        key={ad.id}
                        ad={ad}
                        onCloseListing={(item) => this.openModal('close', item)}
                        onDelete={(item) => this.openModal('delete', item)}
                    />
                ))}
                {this.renderTail()}
            </div>
        );
    }

    renderModal() {
        const { modal, pending, actionError } = this.state;
        if (!modal) return null;

        if (modal.type === 'close') {
            return (
                <CloseListingModal
                    key={`close-${modal.ad.id}`}
                    pending={pending}
                    error={actionError}
                    onConfirm={this.confirmClose}
                    onClose={this.closeModal}
                />
            );
        }

        return (
            <DeleteListingModal
                title={modal.ad.title}
                pending={pending}
                error={actionError}
                onConfirm={this.confirmDelete}
                onClose={this.closeModal}
            />
        );
    }

    render() {
        const { profile, onLogout } = this.props;
        const counts = this.getCounts();

        return (
            <ProfileLayout profile={profile} active="listings" listingsCount={counts ? counts.all : null} onLogout={onLogout}>
                <section class="my-listings">
                    <h1 class="my-listings__title">Мои объявления</h1>
                    {this.renderTabs()}
                    {this.renderList()}
                </section>
                {this.renderModal()}
            </ProfileLayout>
        );
    }
}
