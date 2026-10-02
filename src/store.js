/**
 * @module store
 * @description Хранилище текущего пользователя в памяти с подпиской на изменения.
 * Пользователь `null` означает гостя.
 */

/** @type {(module:api~User|null)} */
let currentUser = null;

/** @type {Array<function((module:api~User|null)): void>} */
const listeners = [];

/**
 * Сохраняет пользователя и оповещает подписчиков.
 * @param {(module:api~User|null)} user Пользователь или null для гостя
 * @returns {void}
 */
export function setUser(user) {
  currentUser = user;
  listeners.forEach((fn) => fn(user));
}

/**
 * Сбрасывает пользователя (выход) и оповещает подписчиков.
 * @returns {void}
 */
export function clearUser() {
  setUser(null);
}

/**
 * Возвращает текущего пользователя.
 * @returns {(module:api~User|null)} Пользователь или null, если это гость
 */
export function getUser() {
  return currentUser;
}

/**
 * Подписывает функцию на изменения пользователя.
 * @param {function((module:api~User|null)): void} fn Колбэк, получает нового пользователя
 * @returns {function(): void} Функция отписки
 * @example
 * const off = subscribe((user) => renderHeader(user));
 * // позже: off();
 */
export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index > -1) listeners.splice(index, 1);
  };
}
