/**
 * @module app
 * @description Точка входа: проверяет сессию, рисует шапку и футер, регистрирует маршруты.
 */

import "./styles/style.scss";
import template from "./app.hbs";

import { Header, initHeaderMenu } from "@/components/header/header.js";
import { Footer } from "@/components/footer/footer.js";
import {
  registerRoute,
  registerNotFound,
  setAuthCheck,
  initRouter,
  navigate,
} from "@/router/router.js";
import { getMe, logout } from "@/lib/api.js";
import { getUser, setUser, clearUser, subscribe } from "@/store.js";
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
  app.innerHTML = '<div class="app-loader" aria-label="Загрузка"></div>';

  setAuthCheck(() => getUser() !== null);
  initHeaderMenu();

  void start();
}

/**
 * Ждёт ответа /me, рисует каркас страницы и запускает роутер.
 * @returns {Promise<void>}
 */
async function start() {
  const user = await loadCurrentUser();

  app.innerHTML = template({
    headerHtml: renderHeader(user),
    footerHtml: Footer(),
  });

  const page = document.getElementById("page");

  subscribe(updateHeader);
  app.addEventListener("click", handleLogout);
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
}

/**
 * @param {(module:api~User|null)} user
 * @returns {string} HTML шапки для гостя или авторизованного
 */
function renderHeader(user) {
  return Header({
    isAuthenticated: Boolean(user),
    userName: user?.first_name || user?.nickname || user?.email || "",
    userInitial: getInitials(user),
  });
}

/**
 * Перерисовывает шапку при входе и выходе.
 * @param {(module:api~User|null)} user
 */
function updateHeader(user) {
  const header = document.querySelector(".header");
  if (header) header.outerHTML = renderHeader(user);
}

/**
 * Клик по «Выйти» в меню аватара.
 * @param {MouseEvent} e
 */
async function handleLogout(e) {
  const button = e.target.closest('[data-action="logout"]');
  if (!button) return;

  button.disabled = true;
  try {
    await logout();
    clearUser();
    navigate("/");
  } catch (err) {
    logWarn("Не удалось выйти:", err);
    button.disabled = false;
  }
}

/**
 * @returns {Promise<(module:api~User|null)>} null для гостя или если бэк недоступен
 */
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

/**
 * Две первые буквы имени для аватара.
 * @param {(module:api~User|null)} user
 * @returns {string}
 */
function getInitials(user) {
  const name = user?.first_name || user?.nickname || "";
  return name.trim().slice(0, 2).toUpperCase();
}
