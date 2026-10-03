import template from "./header.hbs";
import "./header.scss";

export const Header = (props = {}) => {
  return template({
    isAuthenticated: props.isAuthenticated ?? false,
    userName: props.userName ?? "",
    userInitial: props.userInitial ?? "",
  });
};

export function initHeaderMenu() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest('[data-action="toggle-user-menu"]');
    const menu = document.querySelector(".header__user");
    if (!menu) return;

    if (toggle) {
      menu.classList.toggle("header__user--open");
    } else if (!e.target.closest(".header__menu")) {
      menu.classList.remove("header__user--open");
    }
  });
}
