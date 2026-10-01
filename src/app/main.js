import "./styles/style.scss";
import template from "./app.hbs";

import { Header } from "@/components/header/header.js";
import { Footer } from "@/components/footer/footer.js";
import {
  registerRoute,
  registerNotFound,
  setAuthCheck,
  initRouter,
} from "@/router/router.js";
import { getMe } from "@/lib/api.js";
import { getUser, setUser } from "@/store.js";
import { logWarn } from "@/lib/logger.js";

import { HomePage } from "@/pages/home-page/home-page.js";
import { CategoriesPage } from "@/pages/categories-page/categories-page.js";
import { CategoryPage } from "@/pages/category-page/category-page.js";
import { NotFoundPage } from "@/pages/not-found-page/not-found-page.js";

const app = document.getElementById("app");

if (app) {
  app.innerHTML = template({
    headerHtml: Header({ isAuthenticated: false }),
    footerHtml: Footer(),
  });

  const page = document.getElementById("page");

  setAuthCheck(() => getUser() !== null);

  registerRoute("/", () => HomePage(page));
  registerRoute("/categories", () => CategoriesPage(page));
  registerRoute("/category/:slug", CategoryPage(page));

  registerNotFound(() => NotFoundPage(page));

  initRouter();
  void loadCurrentUser();
}

async function loadCurrentUser() {
  try {
    const user = await getMe();
    if (user) setUser(user);

    const header = document.querySelector(".header");
    header?.insertAdjacentHTML(
      "afterend",
      Header({
        isAuthenticated: Boolean(user),
        userName: user?.first_name || user?.nickname || user?.email || "",
        userInitial: (user?.first_name || user?.nickname || user?.email || "")
          .charAt(0)
          .toUpperCase(),
      }),
    );
    header?.remove();
  } catch (err) {
    logWarn("Не удалось получить текущего пользователя:", err);
  }
}
