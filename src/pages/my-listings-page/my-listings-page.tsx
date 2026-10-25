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
import { ProfileSidebar } from '@/components/profile-sidebar/profile-sidebar';
import { MyAdCard } from '@/components/my-ad-card/my-ad-card';
import { PageError } from '@/components/page-error/page-error';
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
        modal: null,
        pending: false,
        actionError: '',
    };

    componentDidMount() {
        void this.load();
    }

    load = async () => {
        this.setState({ status: 'loading' });
        try {
            const page = await getMyListings({ limit: LISTINGS_LIMIT });
            this.setState({ status: 'ready', items: page.items ?? [], counts: page.counts ?? null });
        } catch (err) {
            logError('Не удалось загрузить мои объявления:', err);
            this.setState({ status: 'error' });
        }
    };

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

    renderTabs() {
        const { counts } = this.state;

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

    renderSkeleton() {
        return (
            <div class="my-listings__list" aria-busy="true" aria-label="Загрузка">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <div key={i} class="my-listings__skeleton">
                        <span class="my-listings__skeleton-photo" />
                        <span class="my-listings__skeleton-bars">
                            <span class="my-listings__skeleton-bar my-listings__skeleton-bar--title" />
                            <span class="my-listings__skeleton-bar" />
                            <span class="my-listings__skeleton-bar" />
                            <span class="my-listings__skeleton-bar my-listings__skeleton-bar--short" />
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    renderEmpty() {
        if (!this.state.counts?.all) {
            return (
                <div class="my-listings__empty">
                    <span class="my-listings__empty-icon" aria-hidden="true">📦</span>
                    <h2 class="my-listings__empty-title">У вас пока нет объявлений</h2>
                    <p class="my-listings__empty-text">Отпустите лишнее: создайте объявление в несколько кликов</p>
                    <button type="button" class="my-listings__empty-action" disabled>Разместить объявление</button>
                </div>
            );
        }

        const { title, text } = EMPTY_TAB_TEXT[this.props.tab];
        return (
            <div class="my-listings__empty">
                <h2 class="my-listings__empty-title">{title}</h2>
                <p class="my-listings__empty-text">{text}</p>
            </div>
        );
    }

    renderList() {
        const { status, items } = this.state;

        if (status === 'loading') return this.renderSkeleton();
        if (status === 'error') return <PageError onRetry={this.load} />;

        const statuses = TABS.find(({ tab }) => tab === this.props.tab)?.statuses ?? [];
        const visible = items.filter((item) => statuses.includes(item.status));
        if (visible.length === 0) return this.renderEmpty();

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
        const { counts } = this.state;

        return (
            <div class="my-listings-page">
                <div class="my-listings-page__layout">
                    <ProfileSidebar
                        profile={profile}
                        active="listings"
                        listingsCount={counts ? counts.all : null}
                        onLogout={onLogout}
                    />

                    <section class="my-listings">
                        <h1 class="my-listings__title">Мои объявления</h1>
                        {this.renderTabs()}
                        {this.renderList()}
                    </section>
                </div>
                {this.renderModal()}
            </div>
        );
    }
}
