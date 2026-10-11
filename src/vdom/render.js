/**
 * @module vdom/render
 * @description Монтирование и обновление: сравнивает старое и новое виртуальные деревья (diff)
 * и вносит в настоящий DOM только отличия (patch).
 */

import { TEXT, createTextVNode, isComponentClass, normalizeChildren } from './h.js';
import { setProp, updateProps } from './props.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Компоненты, которые уже вставлены в DOM, но ещё не получили componentDidMount.
 * Вызываем его после того, как закончится текущая перерисовка целиком.
 * @type {import('./component.js').Component[]}
 */
let pendingMounts = [];

function flushMounts() {
    const mounts = pendingMounts;
    pendingMounts = [];
    mounts.forEach((instance) => instance.componentDidMount?.());
}

/**
 * Результат render() компонента приводим к одному узлу.
 * @param {*} output
 * @returns {import('./h.js').VNode}
 */
function normalizeRoot(output) {
    const nodes = normalizeChildren([output]);
    if (nodes.length > 1) {
        throw new Error('Компонент должен возвращать один корневой элемент');
    }
    // Пустой текстовый узел держит место компонента, который ничего не рисует
    return nodes[0] ?? createTextVNode('');
}

/**
 * @param {import('./h.js').VNode} vnode
 * @returns {(string|null)}
 */
function keyOf(vnode, index) {
    return vnode.key !== null && vnode.key !== undefined ? `k:${vnode.key}` : `i:${index}`;
}

/**
 * @param {import('./h.js').VNode} vnode
 * @param {boolean} isSvg
 * @returns {Node}
 */
function createNode(vnode, isSvg) {
    if (vnode.type === TEXT) {
        vnode.dom = document.createTextNode(vnode.props.nodeValue);
        return vnode.dom;
    }

    if (isComponentClass(vnode.type)) {
        const instance = new vnode.type(vnode.props);
        vnode.instance = instance;
        instance._host = vnode;
        instance._isSvg = isSvg;
        instance._rendered = normalizeRoot(instance.render());
        instance._rendered.owner = instance;
        vnode.dom = createNode(instance._rendered, isSvg);
        pendingMounts.push(instance);
        return vnode.dom;
    }

    const svg = isSvg || vnode.type === 'svg';
    const dom = svg
        ? document.createElementNS(SVG_NS, vnode.type)
        : document.createElement(vnode.type);

    Object.entries(vnode.props).forEach(([name, value]) => setProp(dom, name, value, undefined, svg));
    vnode.children.forEach((child) => dom.appendChild(createNode(child, svg && vnode.type !== 'foreignObject')));

    vnode.dom = dom;
    vnode.props.ref?.(dom);
    return dom;
}

/**
 * Вызывает componentWillUnmount и сбрасывает ref во всём поддереве.
 * Сам DOM-узел удаляет вызывающий код.
 * @param {import('./h.js').VNode} vnode
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
 * @param {import('./component.js').Component} instance
 */
function syncHostDom(instance) {
    let current = instance;
    while (current) {
        current._host.dom = current._rendered.dom;
        current = current._host.owner;
    }
}

/**
 * Перерисовывает компонент и вносит отличия в DOM. Вызывается из setState.
 * @param {import('./component.js').Component} instance
 */
export function updateComponent(instance) {
    if (instance._unmounted || !instance._rendered) return;

    const prev = instance._rendered;
    const next = normalizeRoot(instance.render());
    next.owner = instance;

    patch(prev.dom.parentNode, prev, next, instance._isSvg);
    instance._rendered = next;
    syncHostDom(instance);
    flushMounts();
}

/**
 * Сравнивает два узла одного места и обновляет DOM.
 * @param {Node} parentDom
 * @param {import('./h.js').VNode} oldVNode
 * @param {import('./h.js').VNode} newVNode
 * @param {boolean} isSvg
 */
function patch(parentDom, oldVNode, newVNode, isSvg) {
    if (oldVNode.type !== newVNode.type) {
        const dom = createNode(newVNode, isSvg);
        parentDom.replaceChild(dom, oldVNode.dom);
        unmount(oldVNode);
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
        newVNode.dom = oldVNode.dom;

        const next = normalizeRoot(instance.render());
        next.owner = instance;
        patch(parentDom, instance._rendered, next, isSvg);
        instance._rendered = next;
        newVNode.dom = next.dom;
        return;
    }

    const dom = oldVNode.dom;
    const svg = isSvg || newVNode.type === 'svg';
    newVNode.dom = dom;

    updateProps(dom, oldVNode.props, newVNode.props, svg);
    if (oldVNode.props.ref !== newVNode.props.ref) {
        oldVNode.props.ref?.(null);
        newVNode.props.ref?.(dom);
    }

    patchChildren(dom, oldVNode.children, newVNode.children, svg && newVNode.type !== 'foreignObject');
}

/**
 * Сравнивает списки детей. Узлы с одинаковым key (или без key, но на той же позиции)
 * переиспользуются и при необходимости переставляются, лишние удаляются, новые создаются.
 * Родитель целиком управляется VDOM: посторонних DOM-узлов в нём быть не должно.
 * @param {Element} parentDom
 * @param {import('./h.js').VNode[]} oldChildren
 * @param {import('./h.js').VNode[]} newChildren
 * @param {boolean} isSvg
 */
function patchChildren(parentDom, oldChildren, newChildren, isSvg) {
    const oldByKey = new Map();
    oldChildren.forEach((child, i) => oldByKey.set(keyOf(child, i), child));

    let prevDom = null;

    newChildren.forEach((child, i) => {
        const key = keyOf(child, i);
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
 * Рисует виртуальные узлы внутри контейнера. При повторном вызове
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
    flushMounts();
}
