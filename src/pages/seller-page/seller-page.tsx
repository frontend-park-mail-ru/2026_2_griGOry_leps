import { Component } from '@/vdom';
import {
    ApiError,
    getSeller,
    getSellerListings,
    getSellerReviews,
    reportSeller,
    type AdCard,
    type ReportReason,
    type Review,
    type ReviewPage,
    type ReviewSort,
    type SellerAdPage,
    type SellerProfile,
    type Sort,
} from '@/lib/api';
import { logError, logWarn } from '@/lib/logger';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { SellerHeader } from '@/components/seller-header/seller-header';
import { ProductCard } from '@/components/product-card/product-card';
import { ReviewCard } from '@/components/review-card/review-card';
import { RatingSummary } from '@/components/rating-summary/rating-summary';
import { ReportSellerModal } from '@/components/report-seller-modal/report-seller-modal';
import { Select } from '@/components/select/select';
import { PageError } from '@/components/page-error/page-error';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page';
import { Toast, ToastTimer, type ToastState } from '@/components/toast/toast';
import './seller-page.scss';

export type SellerTab = 'listings' | 'reviews';

type LoadStatus = 'idle' | 'loading' | 'error' | 'ready';

export interface SellerPageProps {
    sellerId: number;
    tab: SellerTab;
}

export interface SellerPageState {
    status: 'loading' | 'error' | 'not-found' | 'ready';
    seller: SellerProfile | null;
    listingsStatus: LoadStatus;
    listings: AdCard[];
    categories: SellerAdPage['categories'];
    categoryId: number | null;
    sort: Sort;
    refreshingListings: boolean;
    reviewsStatus: LoadStatus;
    reviews: Review[];
    reviewsPage: Omit<ReviewPage, 'items'> | null;
    reviewSort: ReviewSort;
    withPhotos: boolean;
    loadingMoreReviews: boolean;
    refreshingReviews: boolean;
    reportOpen: boolean;
    reportPending: boolean;
    reportError: string;
    toast: ToastState | null;
}

const LISTINGS_LIMIT = 60;

const REVIEWS_LIMIT = 10;

const SKELETON_CARDS = 6;

const LISTING_SORTS: { value: Sort; label: string }[] = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'price_asc', label: 'Сначала дешевле' },
    { value: 'price_desc', label: 'Сначала дороже' },
];

const REVIEW_SORTS: { value: ReviewSort; label: string }[] = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'rating_desc', label: 'Сначала положительные' },
    { value: 'rating_asc', label: 'Сначала отрицательные' },
];

function sellerUrl(id: number, tab: SellerTab = 'listings'): string {
    return tab === 'listings' ? `/seller/${id}` : `/seller/${id}/${tab}`;
}

function initialState(): SellerPageState {
    return {
        status: 'loading',
        seller: null,
        listingsStatus: 'idle',
        listings: [],
        categories: [],
        categoryId: null,
        sort: 'newest',
        refreshingListings: false,
        reviewsStatus: 'idle',
        reviews: [],
        reviewsPage: null,
        reviewSort: 'newest',
        withPhotos: false,
        loadingMoreReviews: false,
        refreshingReviews: false,
        reportOpen: false,
        reportPending: false,
        reportError: '',
        toast: null,
    };
}

export class SellerPage extends Component<SellerPageProps, SellerPageState> {
    state: SellerPageState = initialState();

    loadedId: number | null = null;

    requestId = 0;

    listingsRequest = 0;

    reviewsRequest = 0;

    toasts = new ToastTimer((toast) => this.setState({ toast }));

    componentDidMount() {
        void this.load();
    }

    componentDidUpdate() {
        if (this.props.sellerId !== this.loadedId) {
            this.listingsRequest += 1;
            this.reviewsRequest += 1;
            this.setState(initialState());
            void this.load();
            return;
        }
        this.ensureTabData();
    }

    componentWillUnmount() {
        this.requestId += 1;
        this.listingsRequest += 1;
        this.reviewsRequest += 1;
        this.toasts.stop();
    }

    load = async () => {
        const id = this.props.sellerId;
        const requestId = ++this.requestId;
        this.loadedId = id;
        if (!Number.isInteger(id) || id <= 0) {
            this.setState({ status: 'not-found' });
            return;
        }
        this.setState({ status: 'loading' });

        try {
            const seller = await getSeller(id);
            if (requestId !== this.requestId) return;
            this.setState({ status: 'ready', seller });
            this.ensureTabData();
        } catch (err) {
            if (requestId !== this.requestId) return;
            if (err instanceof ApiError && err.status === 404) {
                this.setState({ status: 'not-found' });
                return;
            }
            logError('Не удалось загрузить продавца:', err);
            this.setState({ status: 'error' });
        }
    };

    ensureTabData() {
        const { status, listingsStatus, reviewsStatus } = this.state;
        if (status !== 'ready') return;
        if (this.props.tab === 'listings' && listingsStatus === 'idle') void this.loadListings();
        if (this.props.tab === 'reviews' && reviewsStatus === 'idle') void this.loadReviews();
    }

    loadListings = async () => {
        const { sellerId } = this.props;
        const { categoryId, sort } = this.state;
        const request = ++this.listingsRequest;

        if (this.state.listingsStatus === 'ready') this.setState({ refreshingListings: true });
        else this.setState({ listingsStatus: 'loading' });
        try {
            const page = await getSellerListings(sellerId, {
                limit: LISTINGS_LIMIT,
                sort,
                category_id: categoryId ?? undefined,
            });
            if (request !== this.listingsRequest) return;
            this.setState({
                listingsStatus: 'ready',
                refreshingListings: false,
                listings: page.items ?? [],
                categories: page.categories ?? [],
            });
        } catch (err) {
            if (request !== this.listingsRequest) return;
            logError('Не удалось загрузить объявления продавца:', err);
            if (this.state.listingsStatus === 'ready') {
                this.setState({ refreshingListings: false });
                this.toasts.show('error', 'Не удалось загрузить объявления. Попробуйте ещё раз');
            } else {
                this.setState({ listingsStatus: 'error' });
            }
        }
    };

    loadReviews = async (more = false) => {
        const { sellerId } = this.props;
        const { reviewSort, withPhotos, reviews } = this.state;
        const offset = more ? reviews.length : 0;
        const request = ++this.reviewsRequest;

        if (more) this.setState({ loadingMoreReviews: true });
        else if (this.state.reviewsStatus === 'ready') this.setState({ refreshingReviews: true, loadingMoreReviews: false });
        else this.setState({ reviewsStatus: 'loading' });
        try {
            const { items, ...page } = await getSellerReviews(sellerId, {
                limit: REVIEWS_LIMIT,
                offset,
                sort: reviewSort,
                with_photos: withPhotos || undefined,
            });
            if (request !== this.reviewsRequest) return;
            this.setState(({ reviews: current }) => ({
                reviewsStatus: 'ready',
                loadingMoreReviews: false,
                refreshingReviews: false,
                reviews: more ? [...current, ...(items ?? [])] : (items ?? []),
                reviewsPage: page,
            }));
        } catch (err) {
            if (request !== this.reviewsRequest) return;
            logError('Не удалось загрузить отзывы:', err);
            if (more || this.state.reviewsStatus === 'ready') {
                this.setState({ loadingMoreReviews: false, refreshingReviews: false });
                this.toasts.show('error', 'Не удалось загрузить отзывы. Попробуйте ещё раз');
            } else {
                this.setState({ reviewsStatus: 'error' });
            }
        }
    };

    selectCategory = (categoryId: number | null) => {
        if (categoryId === this.state.categoryId) return;
        this.setState({ categoryId });
        void this.loadListings();
    };

    changeSort = (sort: string) => {
        this.setState({ sort: sort as Sort });
        void this.loadListings();
    };

    changeReviewSort = (sort: string) => {
        this.setState({ reviewSort: sort as ReviewSort });
        void this.loadReviews();
    };

    toggleWithPhotos = () => {
        this.setState({ withPhotos: !this.state.withPhotos });
        void this.loadReviews();
    };

    pageUrl(): string {
        return new URL(sellerUrl(this.props.sellerId), window.location.origin).href;
    }

    copyLink = async () => {
        try {
            await navigator.clipboard.writeText(this.pageUrl());
            this.toasts.show('success', 'Ссылка скопирована');
        } catch (err) {
            logWarn('Не удалось скопировать ссылку:', err);
            this.toasts.show('error', 'Не удалось скопировать ссылку');
        }
    };

    share = async () => {
        if (typeof navigator.share !== 'function') {
            await this.copyLink();
            return;
        }
        try {
            await navigator.share({ title: this.state.seller?.first_name ?? 'Продавец на GoGET', url: this.pageUrl() });
        } catch (err) {
            if (!(err instanceof DOMException && err.name === 'AbortError')) logWarn('Не удалось поделиться:', err);
        }
    };

    openReport = () => {
        this.setState({ reportOpen: true, reportPending: false, reportError: '' });
    };

    closeReport = () => {
        if (!this.state.reportPending) this.setState({ reportOpen: false, reportError: '' });
    };

    confirmReport = async (reason: ReportReason, comment: string) => {
        this.setState({ reportPending: true, reportError: '' });
        try {
            await reportSeller(this.props.sellerId, { reason, comment });
            this.setState({ reportOpen: false, reportPending: false });
            this.toasts.show('success', 'Жалоба отправлена. Спасибо!');
        } catch (err) {
            logError('Не удалось отправить жалобу:', err);
            this.setState({ reportPending: false, reportError: 'Не удалось отправить жалобу. Попробуйте ещё раз' });
        }
    };

    renderTabs() {
        const { sellerId, tab } = this.props;
        const { seller } = this.state;
        const listingsCount = seller?.active_listings_count;
        const reviewsCount = seller?.reviews_count;

        const tabs: { value: SellerTab; label: string }[] = [
            { value: 'listings', label: listingsCount === undefined ? 'Объявления' : `Объявления · ${listingsCount}` },
            { value: 'reviews', label: reviewsCount === undefined ? 'Отзывы' : `Отзывы · ${reviewsCount}` },
        ];

        return (
            <nav class="seller-page__tabs" aria-label="Разделы продавца">
                {tabs.map(({ value, label }) => (
                    <a
                        key={value}
                        href={sellerUrl(sellerId, value)}
                        data-link
                        class={value === tab ? 'seller-page__tab seller-page__tab--active' : 'seller-page__tab'}
                        aria-current={value === tab ? 'page' : undefined}
                    >
                        {label}
                    </a>
                ))}
            </nav>
        );
    }

    renderGridSkeleton() {
        return (
            <div class="seller-page__grid" aria-busy="true" aria-label="Загрузка">
                {Array.from({ length: SKELETON_CARDS }, (_, i) => (
                    <div key={i} class="seller-page__card-skeleton">
                        <span class="seller-page__bar seller-page__bar--image" />
                        <span class="seller-page__bar seller-page__bar--price" />
                        <span class="seller-page__bar seller-page__bar--wide" />
                        <span class="seller-page__bar seller-page__bar--narrow" />
                    </div>
                ))}
            </div>
        );
    }

    renderHeaderSkeleton() {
        return (
            <div class="seller-page__header-skeleton" aria-busy="true" aria-label="Загрузка">
                <span class="seller-page__bar seller-page__bar--avatar" />
                <span class="seller-page__header-bars">
                    <span class="seller-page__bar seller-page__bar--title" />
                    <span class="seller-page__bar" />
                    <span class="seller-page__bar" />
                    <span class="seller-page__bar seller-page__bar--short" />
                </span>
            </div>
        );
    }

    renderFilters() {
        const { categories, categoryId, sort } = this.state;
        const all = categories.reduce((sum, { count }) => sum + count, 0);
        const chip = (id: number | null, label: string) => (
            <button
                key={id ?? 'all'}
                type="button"
                class={id === categoryId ? 'seller-page__chip seller-page__chip--active' : 'seller-page__chip'}
                aria-pressed={String(id === categoryId)}
                onClick={() => this.selectCategory(id)}
            >
                {label}
            </button>
        );

        return (
            <div class="seller-page__filters">
                <div class="seller-page__chips">
                    {chip(null, `Все · ${all}`)}
                    {categories.map(({ id, name, count }) => chip(id, `${name} · ${count}`))}
                </div>
                <Select
                    id="seller-sort"
                    inline
                    label="Сортировка"
                    options={LISTING_SORTS}
                    value={sort}
                    onChange={this.changeSort}
                />
            </div>
        );
    }

    renderListings() {
        const { listingsStatus, listings, categories, refreshingListings } = this.state;

        if (listingsStatus === 'error') return <PageError onRetry={() => this.loadListings()} />;
        if (listingsStatus !== 'ready') return this.renderGridSkeleton();

        if (categories.length === 0 && listings.length === 0) {
            return (
                <div class="seller-page__empty">
                    <span class="seller-page__empty-icon" aria-hidden="true">🗂</span>
                    <h2 class="seller-page__empty-title">У продавца сейчас нет активных объявлений</h2>
                    <p class="seller-page__empty-text">Подпишитесь, пришлём уведомление, когда появится что-то новое</p>
                    <button type="button" class="seller-page__empty-action" disabled>Подписаться на продавца</button>
                </div>
            );
        }

        return (
            <>
                {this.renderFilters()}
                <div
                    class={refreshingListings ? 'seller-page__grid seller-page__grid--refreshing' : 'seller-page__grid'}
                    aria-busy={refreshingListings ? 'true' : undefined}
                >
                    {listings.map((ad) => <ProductCard key={ad.id} {...ad} />)}
                </div>
            </>
        );
    }

    renderReviews() {
        const {
            reviewsStatus, reviews, reviewsPage, reviewSort, withPhotos, loadingMoreReviews, refreshingReviews,
        } = this.state;

        if (reviewsStatus === 'error') return <PageError onRetry={() => this.loadReviews()} />;
        if (reviewsStatus !== 'ready' || !reviewsPage) {
            return <div class="seller-page__reviews-loading" aria-busy="true" aria-label="Загрузка" />;
        }

        const distribution = reviewsPage.distribution ?? {};
        const summaryTotal = Object.values(distribution).reduce((sum, count) => sum + count, 0);

        return (
            <div class="seller-page__reviews">
                <RatingSummary
                    rating={reviewsPage.rating}
                    total={summaryTotal}
                    distribution={distribution}
                />
                <div
                    class={refreshingReviews ? 'seller-page__review-list seller-page__review-list--refreshing' : 'seller-page__review-list'}
                    aria-busy={refreshingReviews ? 'true' : undefined}
                >
                    <div class="seller-page__review-controls">
                        <Select
                            id="seller-review-sort"
                            inline
                            label="Сортировка отзывов"
                            options={REVIEW_SORTS}
                            value={reviewSort}
                            onChange={this.changeReviewSort}
                        />
                        <button
                            type="button"
                            class={withPhotos ? 'seller-page__photo-filter seller-page__photo-filter--active' : 'seller-page__photo-filter'}
                            aria-pressed={String(withPhotos)}
                            onClick={this.toggleWithPhotos}
                        >
                            Только с фото
                        </button>
                    </div>
                    {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
                    {reviews.length < reviewsPage.total && (
                        <button
                            type="button"
                            class="seller-page__more"
                            disabled={loadingMoreReviews || refreshingReviews}
                            onClick={() => this.loadReviews(true)}
                        >
                            {loadingMoreReviews ? 'Загружаем…' : 'Показать ещё отзывы'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    renderContent() {
        const { tab } = this.props;
        const { status, seller } = this.state;

        if (status === 'loading' || !seller) {
            return (
                <>
                    {this.renderHeaderSkeleton()}
                    {this.renderTabs()}
                    {this.renderGridSkeleton()}
                </>
            );
        }

        return (
            <>
                <SellerHeader
                    seller={seller}
                    reviewsHref={sellerUrl(seller.id, 'reviews')}
                    onShare={this.share}
                    onCopyLink={this.copyLink}
                    onReport={this.openReport}
                />
                {this.renderTabs()}
                {tab === 'listings' && this.renderListings()}
                {tab === 'reviews' && this.renderReviews()}
            </>
        );
    }

    render() {
        const { status, reportOpen, reportPending, reportError, toast } = this.state;

        if (status === 'error') {
            return (
                <div class="seller-page">
                    <PageError onRetry={this.load} />
                </div>
            );
        }

        if (status === 'not-found') return <NotFoundPage />;

        return (
            <div class="seller-page">
                <Breadcrumbs flush strong items={[{ label: 'Главная', href: '/' }, { label: 'Все категории' }]} />
                {this.renderContent()}
                {reportOpen && (
                    <ReportSellerModal
                        pending={reportPending}
                        error={reportError}
                        onConfirm={this.confirmReport}
                        onClose={this.closeReport}
                    />
                )}
                {toast && <Toast key={toast.id} type={toast.type} message={toast.message} />}
            </div>
        );
    }
}
