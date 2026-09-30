import Handlebars from 'handlebars/dist/handlebars.js';

/**
 * Компилирует шаблон страницы.
 * @param {string} source текст .hbs-файла
 * @returns {(context?: object) => string}
 */
export function compileTemplate(source) {
  return Handlebars.compile(source);
}

/**
 * Регистрирует компонент как partial (`{{> name}}`, `{{#> name}}…{{/name}}`)
 * и возвращает функцию, рисующую его отдельно.
 * @param {string} name имя partial'а
 * @param {string} source текст .hbs-файла
 * @returns {(context?: object) => string}
 */
export function registerComponent(name, source) {
  Handlebars.registerPartial(name, source);
  return Handlebars.compile(source);
}
