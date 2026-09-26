import { registerRoute, initRouter } from "./router/router.js";
import { renderHomePage } from "./pages/home.js";
import { renderAboutPage } from "./pages/about.js";

const app = document.getElementById("app");

if (app) {
  registerRoute("/", () => renderHomePage(app));
  registerRoute("/about", () => renderAboutPage(app));
  registerRoute("/404", () => {
    app.innerHTML = "<p>Страница не найдена</p>";
  });

  initRouter();
}
