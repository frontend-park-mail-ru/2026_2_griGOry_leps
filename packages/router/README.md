# goget-router

History API router for single-page apps: path params, auth guards with return to the page after login, `a[data-link]` clicks without reload, and scroll restoration on «Back».

```sh
npm install goget-router
```

```ts
import { initRouter, registerNotFound, registerRoute, setAuthCheck, setErrorHandler } from 'goget-router';

setAuthCheck(() => Boolean(currentUser));
setErrorHandler((...args) => console.error(...args));

registerRoute('/', () => renderHome());
registerRoute('/listing/:id', ({ id }) => renderListing(id));
registerRoute('/cart', () => renderCart(), { requireAuth: true });
registerRoute('/login', () => renderLogin(), { guestOnly: true });
registerNotFound(() => renderNotFound());

initRouter();
```

Links: `<a href="/listing/3" data-link>`. Ctrl/Cmd/Shift/Alt and middle clicks, `target="_blank"`, `download` and external links are left to the browser. Carousels marked with `data-scroll-key` keep their horizontal scroll on «Back».

Exports: `registerRoute`, `registerNotFound`, `initRouter`, `navigate`, `redirect`, `resolveRoute`, `recheckGuards`, `setAuthCheck`, `setErrorHandler`, `setLoginPath`, `loginUrl`, `goToLogin`, `nextPath`, types `RouteParams`, `RouteHandler`, `RouteOptions`, `Route`, `ScrollState`, `ErrorHandler`.
