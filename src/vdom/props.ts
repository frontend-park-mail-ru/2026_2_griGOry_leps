import type { Props } from './h';

export type Listener = (event: Event) => void;
export type ListenedElement = Element & { __listeners?: Record<string, Listener> };
export type StyleValue = string | Record<string, string | null | undefined> | null | undefined;

/** Их пишем в свойство DOM-объекта, а не в атрибут, иначе поле ввода не обновится */
const DOM_PROPERTIES = new Set(['value', 'checked', 'selected']);

/** Один обработчик на тип события: при перерисовке меняется только функция в `__listeners` */
function eventProxy(this: ListenedElement, event: Event) {
    this.__listeners?.[event.type]?.(event);
}

function isEventProp(name: string): boolean {
    return name.length > 2 && name.startsWith('on') && name[2] === name[2].toUpperCase();
}

function setEventListener(dom: ListenedElement, name: string, handler: Listener | undefined) {
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

function setStyle(dom: HTMLElement, value: StyleValue, oldValue: StyleValue) {
    if (typeof value === 'string' || value === null || value === undefined) {
        if (value) dom.setAttribute('style', value);
        else dom.removeAttribute('style');
        return;
    }

    if (typeof oldValue === 'string') dom.removeAttribute('style');

    const style = dom.style as unknown as Record<string, string>;
    const prev = typeof oldValue === 'object' && oldValue ? oldValue : {};
    Object.keys(prev).forEach((key) => {
        if (!(key in value)) style[key] = '';
    });
    Object.entries(value).forEach(([key, val]) => {
        style[key] = val ?? '';
    });
}

export function setProp(dom: Element, name: string, value: unknown, oldValue: unknown, isSvg: boolean): void {
    if (name === 'children' || name === 'key' || name === 'ref') return;

    if (isEventProp(name)) {
        setEventListener(dom, name, value as Listener | undefined);
        return;
    }

    if (name === 'style') {
        setStyle(dom as HTMLElement, value as StyleValue, oldValue as StyleValue);
        return;
    }

    const attr = name === 'className' ? 'class' : name;

    if (!isSvg && DOM_PROPERTIES.has(attr) && attr in dom) {
        const field = dom as unknown as Record<string, unknown>;
        const next = attr === 'value' ? String(value ?? '') : Boolean(value);
        if (field[attr] !== next) field[attr] = next;
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

export function updateProps(dom: Element, oldProps: Props, newProps: Props, isSvg: boolean): void {
    Object.keys(oldProps).forEach((name) => {
        if (!(name in newProps)) setProp(dom, name, undefined, oldProps[name], isSvg);
    });

    Object.keys(newProps).forEach((name) => {
        const value = newProps[name];
        if (value !== oldProps[name] || DOM_PROPERTIES.has(name)) {
            setProp(dom, name, value, oldProps[name], isSvg);
        }
    });
}
