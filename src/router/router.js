/** @typedef {() => void} RouteHandler */

/** @type {Record<string, RouteHandler>} */
const routes = {};

/**
 * @param {string} path
 * @param {RouteHandler} handler
 */
export function registerRoute(path, handler) {
  routes[path] = handler;
}

/** @param {string} path */
export function navigate(path) {
  history.pushState({}, "", path);
  resolveRoute();
}

export function resolveRoute() {
  const handler = routes[location.pathname] ?? routes["/404"];
  handler?.();
}

export function initRouter() {
  document.body.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const link = target.closest("a[data-link]");
    if (link instanceof HTMLAnchorElement) {
      e.preventDefault();
      navigate(link.getAttribute("href") ?? "/");
    }
  });

  window.addEventListener("popstate", resolveRoute);
  resolveRoute();
}
