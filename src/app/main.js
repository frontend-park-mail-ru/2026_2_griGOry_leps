import "./styles/style.scss";
import template from "./app.hbs";

import { Header } from "@/components/header/header.js";
import { Footer } from "@/components/footer/footer.js";
import {
  registerRoute,
  registerNotFound,
  setAuthCheck,
  recheckGuards,
  initRouter,
} from "@/router/router.js";
import { getMe } from "@/lib/api.js";
import { getUser, setUser, subscribe } from "@/store.js";
import { logWarn } from "@/lib/logger.js";

import { HomePage } from "@/pages/home-page/home-page.js";
import { CategoriesPage } from "@/pages/categories-page/categories-page.js";
import { CategoryPage } from "@/pages/category-page/category-page.js";
import { LoginPage } from "@/pages/login-page/login-page.js";
import { RegisterPage } from "@/pages/register-page/register-page.js";
import { TermsPage } from "@/pages/terms-page/terms-page.js";
import { NotFoundPage } from "@/pages/not-found-page/not-found-page.js";

const app = document.getElementById("app");

if (app) {
  app.innerHTML = template({
    headerHtml: Header({ isAuthenticated: false }),
    footerHtml: Footer(),
  });

  const page = document.getElementById("page");

  setAuthCheck(() => getUser() !== null);
  subscribe(renderHeader);

  // Страницы авторизации скрывают общие хедер и футер (см. style.scss)
  const withLayout = (layout, handler) => (params) => {
    app.dataset.layout = layout;
    return handler(params);
  };

  registerRoute("/", withLayout("main", () => HomePage(page)));
  registerRoute("/categories", withLayout("main", () => CategoriesPage(page)));
  registerRoute("/category/:slug", withLayout("main", CategoryPage(page)));

  registerRoute("/login", withLayout("auth", () => LoginPage(page)), {
    guestOnly: true,
  });
  registerRoute("/register", withLayout("auth", () => RegisterPage(page)), {
    guestOnly: true,
  });
  registerRoute("/terms", withLayout("main", () => TermsPage(page)));

  registerNotFound(withLayout("main", () => NotFoundPage(page)));

  initRouter();
  void loadCurrentUser();
}

function renderHeader(user) {
  const name = user?.first_name || user?.nickname || user?.email || "";

  const header = document.querySelector(".header");
  if (!header) return;

  header.outerHTML = Header({
    isAuthenticated: Boolean(user),
    userName: name,
    userInitial: name.charAt(0).toUpperCase(),
  });
}

async function loadCurrentUser() {
  try {
    const user = await getMe();
    if (!user) return;

    setUser(user);
    recheckGuards();
  } catch (err) {
    logWarn("Не удалось получить текущего пользователя:", err);
  }
}
