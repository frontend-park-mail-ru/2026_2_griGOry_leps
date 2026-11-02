import { redirect, registerRoute, type RouteOptions } from '@/router/router';
import { getUser } from '@/store';
import { loadCheckout, loadOrder } from '@/app/loaders/orders';
import { loadProfile, loadResetPassword } from '@/app/loaders/user';
import { loadCategories, loadHome, loadListingEdit, loadListingNew, loadListingPage } from '@/app/loaders/listings';
import type { Page } from '@/app/page';
import { handleLogout } from '@/app/auth';

import { HomePage } from '@/pages/home-page/home-page';
import { CategoriesPage } from '@/pages/categories-page/categories-page';
import { CategoryPage } from '@/pages/category-page/category-page';
import { LoginPage } from '@/pages/login-page/login-page';
import { RegisterPage } from '@/pages/register-page/register-page';
import { ForgotPasswordPage } from '@/pages/forgot-password-page/forgot-password-page';
import { ResetPasswordPage } from '@/pages/reset-password-page/reset-password-page';
import { VerifyEmailPage, loadVerifyEmail } from '@/pages/verify-email-page/verify-email-page';
import { TermsPage } from '@/pages/terms-page/terms-page';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page';
import { ListingPage } from '@/pages/listing-page/listing-page';
import { ListingFormPage } from '@/pages/listing-form-page/listing-form-page';
import { CartPage } from '@/pages/cart-page/cart-page';
import { checkoutView } from '@/pages/checkout-page/checkout-page';
import { OrderPage } from '@/pages/order-page/order-page';
import { MyListingsPage, type MyListingsTab } from '@/pages/my-listings-page/my-listings-page';
import { ProfileEditPage } from '@/pages/profile-edit-page/profile-edit-page';
import { AddressesPage } from '@/pages/addresses-page/addresses-page';
import { SellerPage, type SellerTab } from '@/pages/seller-page/seller-page';

export type RouteRegistrar = <T = undefined>(path: string | null, page: Page<T>, options?: RouteOptions) => void;

export function registerRoutes(route: RouteRegistrar): void {
    function sellerRoute(path: string, tab: SellerTab) {
        route(path, {
            name: 'seller',
            view: (_, { id }) => <SellerPage sellerId={Number(id)} tab={tab} authorized={getUser() !== null} />,
        });
    }

    function myListingsRoute(path: string, tab: MyListingsTab) {
        route(path, {
            name: 'my-listings',
            load: loadProfile,
            view: (profile) => <MyListingsPage tab={tab} profile={profile} onLogout={handleLogout} />,
        }, { requireAuth: true });
    }

    route('/', {
        name: 'home',
        load: loadHome,
        view: (data) => <HomePage {...data} user={getUser()} />,
    });
    route('/categories', {
        name: 'categories',
        tone: 'gray',
        load: loadCategories,
        view: ({ categories }) => <CategoriesPage categories={categories} />,
    });
    route('/category/:slug', {
        name: 'category',
        view: (_, { slug }) => <CategoryPage slug={slug} />,
    });
    route('/listing/new', {
        name: 'listing-new',
        tone: 'gray',
        load: loadListingNew,
        view: ({ categories }) => <ListingFormPage categories={categories} />,
    }, { requireAuth: true });
    route('/listing/:id/edit', {
        name: 'listing-edit',
        tone: 'gray',
        load: loadListingEdit,
        view: ({ listing, categories }) => (listing
            ? <ListingFormPage listing={listing} categories={categories} />
            : <NotFoundPage />),
    }, { requireAuth: true });
    route('/listing/:id', {
        name: 'listing',
        tone: 'gray',
        load: loadListingPage,
        view: ({ listing, similar }) => (listing
            ? <ListingPage listing={listing} similar={similar} user={getUser()} />
            : <NotFoundPage />),
    });
    route('/cart', { name: 'cart', tone: 'gray', view: () => <CartPage /> }, { requireAuth: true });
    route('/checkout', { name: 'checkout', tone: 'gray', load: loadCheckout, view: checkoutView }, { requireAuth: true });
    route('/orders/:id', {
        name: 'order',
        tone: 'gray',
        load: ({ id }) => loadOrder(id),
        view: (order) => (order ? <OrderPage order={order} /> : <NotFoundPage />),
    }, { requireAuth: true });
    route('/login', { name: 'login', layout: 'auth', view: () => <LoginPage /> }, { guestOnly: true });
    route('/register', { name: 'register', layout: 'auth', view: () => <RegisterPage /> }, { guestOnly: true });
    route('/forgot-password', {
        name: 'forgot-password',
        layout: 'auth',
        view: () => <ForgotPasswordPage />,
    }, { guestOnly: true });
    route('/reset-password', {
        name: 'reset-password',
        layout: 'auth',
        load: loadResetPassword,
        view: (data) => <ResetPasswordPage {...data} />,
    });
    route('/verify-email', {
        name: 'verify-email',
        layout: 'auth',
        load: loadVerifyEmail,
        view: (data) => <VerifyEmailPage {...data} />,
    });
    route('/terms', { name: 'terms', view: () => <TermsPage /> });
    registerRoute('/profile', () => redirect('/profile/listings'), { requireAuth: true });
    myListingsRoute('/profile/listings', 'active');
    myListingsRoute('/profile/listings/closed', 'closed');
    myListingsRoute('/profile/listings/drafts', 'drafts');
    route('/profile/edit', {
        name: 'profile-edit',
        load: loadProfile,
        view: (profile) => <ProfileEditPage profile={profile} onLogout={handleLogout} />,
    }, { requireAuth: true });
    route('/profile/addresses', {
        name: 'profile-addresses',
        load: loadProfile,
        view: (profile) => <AddressesPage profile={profile} onLogout={handleLogout} />,
    }, { requireAuth: true });
    sellerRoute('/seller/:id', 'listings');
    sellerRoute('/seller/:id/reviews', 'reviews');
    route(null, { name: 'not-found', view: () => <NotFoundPage /> });
}
