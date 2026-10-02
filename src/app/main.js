import "./styles/style.scss";
import template from "./app.hbs";

import { Header, initHeaderMenu } from "@/components/header/header.js";
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
  app.innerHTML = '<div class="app-loader" aria-label="Загрузка"></div>';

  setAuthCheck(() => getUser() !== null);
  initHeaderMenu();

  void start();
}

async function start() {
  const user = await loadCurrentUser();

  app.innerHTML = template({
    headerHtml: renderHeader(user),
    footerHtml: Footer(),
  });

  const page = document.getElementById("page");

  registerRoute("/", () => HomePage(page));
  registerRoute("/categories", () => CategoriesPage(page));
  registerRoute("/category/:slug", CategoryPage(page));

  registerNotFound(() => NotFoundPage(page));

  initRouter();
}

function renderHeader(user) {
  return Header({
    isAuthenticated: Boolean(user),
    userName: user?.first_name || user?.nickname || user?.email || "",
    userInitial: getInitials(user),
  });
}

async function loadCurrentUser() {
  try {
    const user = await getMe();
    if (user) setUser(user);
    return user;
  } catch (err) {
    logWarn("Не удалось получить текущего пользователя:", err);
    return null;
  }
}

function getInitials(user) {
  const name = user?.first_name || user?.nickname || "";
  return name.trim().slice(0, 2).toUpperCase();
}
