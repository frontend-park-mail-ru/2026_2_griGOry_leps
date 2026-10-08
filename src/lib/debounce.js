/**
 * @module debounce
 * @description Откладывает вызов функции, пока не пройдёт `ms` миллисекунд без новых вызовов.
 * Используется, чтобы не подсвечивать поля формы красным на каждое нажатие клавиши.
 */

/**
 * @template {function(...*): void} F
 * @param {F} fn
 * @param {number} ms
 * @returns {F & {cancel: function(): void}} Обёртка с методом `cancel` для отмены отложенного вызова
 */
export function debounce(fn, ms) {
    let timer;

    function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    }

    debounced.cancel = () => clearTimeout(timer);

    return debounced;
}
