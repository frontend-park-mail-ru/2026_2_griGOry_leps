/**
 * @module vdom/render
 * @description Монтирование и обновление: сравнивает старое и новое виртуальные деревья (diff)
 * и вносит в настоящий DOM только отличия (patch).
 */

import { TEXT, EMPTY, createEmptyVNode, isComponentClass, normalizeChildren } from './h.js';
import { setProp, updateProps } from './props.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Очередь componentDidMount / componentDidUpdate до конца перерисовки:
 * пары [компонент, 'mount' | 'update'].
 * @type {Array<Array<*>>}
 */
let pendingLifecycle = [];

function flushLifecycle() {
    const queue = pendingLifecycle;
    pendingLifecycle = [];
    queue.forEach(([instance, kind]) => {
        if (instance._unmounted) return;
        if (kind === 'mount') instance.componentDidMount?.();
        else instance.componentDidUpdate?.();
    });
}

/**
 * Результат render() компонента приводим к одному узлу.
 * @param {*} output
 * @returns {module:vdom/h~VNode}
 */
function normalizeRoot(output) {
    const nodes = normalizeChildren([output]);
    if (nodes.length > 1) {
        throw new Error('Компонент должен возвращать один корневой элемент');
    }
    return nodes[0] ?? createEmptyVNode();
}

/**
 * Ключи для сравнения списков: key или позиция. Дубли key получают суффикс (`a`, `a#1`).
 * @param {module:vdom/h~VNode[]} children
 * @returns {string[]}
 */
function buildKeys(children) {
    const seen = new Map();

    return children.map((child, i) => {
        if (child.key === null || child.key === undefined) return `i:${i}`;

        const base = `k:${child.key}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return count === 0 ? base : `${base}#${count}`;
    });
}

/**
 * Рисует компонент и запоминает результат.
 * @param {module:vdom/component.Component} instance
 * @returns {module:vdom/h~VNode}
 */
function renderInstance(instance) {
    instance._dirty = false;
    const rendered = normalizeRoot(instance.render());
    rendered.owner = instance;
    return rendered;
}

/**
 * @param {module:vdom/h~VNode} vnode
 * @param {boolean} isSvg
 * @returns {Node}
 */
function createNode(vnode, isSvg) {
    if (vnode.type === TEXT) {
        vnode.dom = document.createTextNode(vnode.props.nodeValue);
        return vnode.dom;
    }

    if (vnode.type === EMPTY) {
        vnode.dom = document.createComment('');
        return vnode.dom;
    }

    if (isComponentClass(vnode.type)) {
        const instance = new vnode.type(vnode.props);
        vnode.instance = instance;
        instance._host = vnode;
        instance._isSvg = isSvg;
        instance._rendered = renderInstance(instance);
        vnode.dom = createNode(instance._rendered, isSvg);
        pendingLifecycle.push([instance, 'mount']);
        return vnode.dom;
    }

    const svg = isSvg || vnode.type === 'svg';
    const dom = svg
        ? document.createElementNS(SVG_NS, vnode.type)
        : document.createElement(vnode.type);

    vnode.children.forEach((child) => dom.appendChild(createNode(child, svg && vnode.type !== 'foreignObject')));
    Object.entries(vnode.props).forEach(([name, value]) => setProp(dom, name, value, undefined, svg));

    vnode.dom = dom;
    vnode.props.ref?.(dom);
    return dom;
}

/**
 * Вызывает componentWillUnmount и сбрасывает ref во всём поддереве.
 * Сам DOM-узел удаляет вызывающий код.
 * @param {module:vdom/h~VNode} vnode
 */
function unmount(vnode) {
    if (vnode.instance) {
        vnode.instance.componentWillUnmount?.();
        vnode.instance._unmounted = true;
        unmount(vnode.instance._rendered);
        return;
    }
    vnode.props.ref?.(null);
    vnode.children.forEach(unmount);
}

/**
 * После перерисовки компонента его корневой DOM-узел мог смениться:
 * обновляем ссылку у узла-хозяина и у всех компонентов выше, чей корень — этот компонент.
 * @param {module:vdom/component.Component} instance
 */
function syncHostDom(instance) {
    let current = instance;
    while (current) {
        current._host.dom = current._rendered.dom;
        current = current._host.owner;
    }
}

/**
 * Перерисовывает компонент и вносит отличия в DOM.
 * @param {module:vdom/component.Component} instance
 */
function updateComponent(instance) {
    if (instance._unmounted || !instance._rendered) return;

    const prev = instance._rendered;
    const next = renderInstance(instance);

    patch(prev.dom.parentNode, prev, next, instance._isSvg);
    instance._rendered = next;
    syncHostDom(instance);
    pendingLifecycle.push([instance, 'update']);
}

/** Компоненты, вызвавшие setState, которые ещё не перерисованы */
const dirtyComponents = new Set();
let flushScheduled = false;

/** Перерисовывает компоненты, изменившие состояние. */
function flushUpdates() {
    flushScheduled = false;
    const queue = [...dirtyComponents];
    dirtyComponents.clear();

    queue.forEach((instance) => {
        if (instance._dirty) updateComponent(instance);
    });
    flushLifecycle();
}

/**
 * Планирует перерисовку компонента в микрозадаче: несколько setState подряд дают одну перерисовку.
 * @param {module:vdom/component.Component} instance
 */
export function enqueueUpdate(instance) {
    instance._dirty = true;
    dirtyComponents.add(instance);

    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushUpdates);
    }
}

/**
 * Сравнивает два узла одного места и обновляет DOM.
 * @param {Node} parentDom
 * @param {module:vdom/h~VNode} oldVNode
 * @param {module:vdom/h~VNode} newVNode
 * @param {boolean} isSvg
 */
function patch(parentDom, oldVNode, newVNode, isSvg) {
    if (oldVNode.type !== newVNode.type) {
        const dom = createNode(newVNode, isSvg);
        parentDom.replaceChild(dom, oldVNode.dom);
        unmount(oldVNode);
        return;
    }

    if (newVNode.type === EMPTY) {
        newVNode.dom = oldVNode.dom;
        return;
    }

    if (newVNode.type === TEXT) {
        newVNode.dom = oldVNode.dom;
        if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
            newVNode.dom.nodeValue = newVNode.props.nodeValue;
        }
        return;
    }

    if (oldVNode.instance) {
        const instance = oldVNode.instance;
        newVNode.instance = instance;
        instance._host = newVNode;
        instance.props = newVNode.props;

        const next = renderInstance(instance);
        patch(parentDom, instance._rendered, next, isSvg);
        instance._rendered = next;
        newVNode.dom = next.dom;
        pendingLifecycle.push([instance, 'update']);
        return;
    }

    const dom = oldVNode.dom;
    const svg = isSvg || newVNode.type === 'svg';
    newVNode.dom = dom;

    patchChildren(dom, oldVNode.children, newVNode.children, svg && newVNode.type !== 'foreignObject');
    updateProps(dom, oldVNode.props, newVNode.props, svg);
    if (oldVNode.props.ref !== newVNode.props.ref) {
        oldVNode.props.ref?.(null);
        newVNode.props.ref?.(dom);
    }
}

/**
 * Сравнивает списки детей. Узлы с одинаковым key (или без key, но на той же позиции)
 * переиспользуются и при необходимости переставляются, лишние удаляются, новые создаются.
 * Родитель целиком управляется VDOM: посторонних DOM-узлов в нём быть не должно.
 * @param {Element} parentDom
 * @param {module:vdom/h~VNode[]} oldChildren
 * @param {module:vdom/h~VNode[]} newChildren
 * @param {boolean} isSvg
 */
function patchChildren(parentDom, oldChildren, newChildren, isSvg) {
    const oldByKey = new Map();
    buildKeys(oldChildren).forEach((key, i) => oldByKey.set(key, oldChildren[i]));

    let prevDom = null;

    buildKeys(newChildren).forEach((key, i) => {
        const child = newChildren[i];
        const old = oldByKey.get(key);

        if (old) {
            oldByKey.delete(key);
            patch(parentDom, old, child, isSvg);
        } else {
            createNode(child, isSvg);
        }

        const expected = prevDom ? prevDom.nextSibling : parentDom.firstChild;
        if (child.dom !== expected) parentDom.insertBefore(child.dom, expected);
        prevDom = child.dom;
    });

    oldByKey.forEach((child) => {
        unmount(child);
        child.dom.parentNode?.removeChild(child.dom);
    });
}

/**
 * Рисует виртуальные узлы внутри контейнера сразу (синхронно). При повторном вызове
 * для того же контейнера сравнивает с прошлым результатом и меняет только разницу.
 * @param {Element} container
 * @param {*} vnodes Узел, массив узлов или фрагмент
 * @example
 * render(document.getElementById('app'), <App />);
 */
export function render(container, vnodes) {
    const next = normalizeChildren([vnodes]);

    if (!container.__vchildren) {
        container.textContent = '';
        container.__vchildren = [];
    }

    patchChildren(container, container.__vchildren, next, container instanceof SVGElement);
    container.__vchildren = next;
    flushLifecycle();
}
