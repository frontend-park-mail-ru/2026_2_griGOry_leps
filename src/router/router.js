import { getUser } from '../store.js';

/** @type {Record<string, { handler: () => void, isProtected: boolean }>} */
const routes = {};

export function registerRoute(path, handler, options = {}) {
  routes[path] = {
    handler,
    isProtected: options.protected ?? false,
  };
}

function isProtectedPath(pathname) {
  return Object.entries(routes).some(([routePath, config]) => {
    if (!config.isProtected) return false;
    const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}(/.*)?$`).test(pathname);
  });
}

export function navigate(path) {
  history.pushState({}, '', path);
  resolveRoute();
}

export function redirect(path) {
  history.replaceState({}, '', path);
  resolveRoute();
}

export function resolveRoute() {
  const path = location.pathname;

  if (isProtectedPath(path) && !getUser()) {
    redirect('/login');
    return;
  }

  const config = routes[path] ?? routes['/404'];
  config?.handler();
}

export function initRouter() {
  document.body.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const link = target.closest('a[data-link]');
    if (link instanceof HTMLAnchorElement) {
      e.preventDefault();
      navigate(link.getAttribute('href') ?? '/');
    }
  });

  window.addEventListener('popstate', resolveRoute);
  resolveRoute();
}