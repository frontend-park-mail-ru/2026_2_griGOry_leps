import { registerRoute, initRouter } from "./router/router.js";
import { renderHomePage } from "./pages/home.js";
import { renderAboutPage } from "./pages/about.js";
import { renderLoginPage } from "./pages/login.js";
import { getMe } from "./api.js";
import { setUser } from "./store.js";

const app = document.getElementById("app");

if (app) {
  registerRoute("/", () => renderHomePage(app));
  registerRoute("/about", () => renderAboutPage(app));
  registerRoute("/login", () => renderLoginPage(app));
  registerRoute("/404", () => {
    app.innerHTML = "<p>Страница не найдена</p>";
  });

  async function initAuth() {
    try {
      const user = await getMe();
      if (user) {
        setUser(user);
        console.log("Сессия восстановлена:", user.nickname);
      } else {
        console.log("Гость");
      }
    } catch (e) {
      console.log("Гость (ошибка)", e);
    }
  }

  initAuth().then(() => initRouter());
}