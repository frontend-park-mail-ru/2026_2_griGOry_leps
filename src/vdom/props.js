/**
 * @module vdom/props
 * @description Применение атрибутов, свойств и обработчиков событий к реальному DOM-узлу.
 */

/** Свойства, которые нужно писать в сам DOM-объект, а не в атрибут: иначе поле ввода не обновится */
const DOM_PROPERTIES = new Set(['value', 'checked', 'selected']);

/**
 * Один общий обработчик на тип события: при перерисовке меняется только функция
 * в `__listeners`, а addEventListener/removeEventListener не вызываются заново.
 * @this {HTMLElement}
 * @param {Event} event
 */
function eventProxy(event) {
    this.__listeners[event.type](event);
}

/**
 * @param {string} name Например, onClick
 * @returns {boolean}
 */
function isEventProp(name) {
    return name.length > 2 && name.startsWith('on') && name[2] === name[2].toUpperCase();
}

/**
 * @param {HTMLElement} dom
 * @param {string} name
 * @param {(function(Event): void|undefined)} handler
 */
function setEventListener(dom, name, handler) {
    const event = name.slice(2).toLowerCase();
    dom.__listeners ??= {};

    if (handler) {
        if (!dom.__listeners[event]) dom.addEventListener(event, eventProxy);
        dom.__listeners[event] = handler;
    } else if (dom.__listeners[event]) {
        dom.removeEventListener(event, eventProxy);
        delete dom.__listeners[event];
    }
}

/**
 * @param {HTMLElement} dom
 * @param {(string|Object|undefined)} value
 * @param {(string|Object|undefined)} oldValue
 */
function setStyle(dom, value, oldValue) {
    if (typeof value === 'string' || value === null || value === undefined) {
        if (value) dom.setAttribute('style', value);
        else dom.removeAttribute('style');
        return;
    }

    if (typeof oldValue === 'string') dom.removeAttribute('style');

    const prev = typeof oldValue === 'object' && oldValue ? oldValue : {};
    Object.keys(prev).forEach((key) => {
        if (!(key in value)) dom.style[key] = '';
    });
    Object.entries(value).forEach(([key, val]) => {
        dom.style[key] = val ?? '';
    });
}

/**
 * Устанавливает или убирает одно свойство узла.
 * @param {Element} dom
 * @param {string} name
 * @param {*} value Новое значение; undefined — убрать
 * @param {*} oldValue
 * @param {boolean} isSvg
 */
export function setProp(dom, name, value, oldValue, isSvg) {
    if (name === 'children' || name === 'key' || name === 'ref') return;

    if (isEventProp(name)) {
        setEventListener(dom, name, value);
        return;
    }

    if (name === 'style') {
        setStyle(dom, value, oldValue);
        return;
    }

    const attr = name === 'className' ? 'class' : name;

    if (!isSvg && DOM_PROPERTIES.has(attr) && attr in dom) {
        const next = attr === 'value' ? (value ?? '') : Boolean(value);
        // Пишем, только если значение действительно другое: иначе курсор в поле прыгнет в конец
        if (dom[attr] !== next) dom[attr] = next;
        return;
    }

    if (value === null || value === undefined || value === false) {
        dom.removeAttribute(attr);
    } else if (value === true) {
        dom.setAttribute(attr, '');
    } else {
        dom.setAttribute(attr, String(value));
    }
}

/**
 * Приводит свойства узла от старых к новым: удаляет пропавшие, обновляет изменившиеся.
 * @param {Element} dom
 * @param {Object} oldProps
 * @param {Object} newProps
 * @param {boolean} isSvg
 */
export function updateProps(dom, oldProps, newProps, isSvg) {
    Object.keys(oldProps).forEach((name) => {
        if (!(name in newProps)) setProp(dom, name, undefined, oldProps[name], isSvg);
    });

    Object.keys(newProps).forEach((name) => {
        const value = newProps[name];
        // value/checked сверяем с DOM всегда: пользователь мог изменить поле сам
        if (value !== oldProps[name] || DOM_PROPERTIES.has(name)) {
            setProp(dom, name, value, oldProps[name], isSvg);
        }
    });
}
