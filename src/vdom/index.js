/**
 * @module vdom
 * @description Собственный виртуальный DOM: JSX → виртуальное дерево → diff → точечные изменения DOM.
 *
 * - `h`, `Fragment` — во что компилируется JSX (подключаются в .jsx автоматически, см. vite.config.js);
 * - `Component` — компонент с состоянием;
 * - `render` — отрисовать дерево в контейнер.
 */

export { h, Fragment } from './h.js';
export { Component } from './component.js';
export { render } from './render.js';
