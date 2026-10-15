import { TEXT, EMPTY, createEmptyVNode, isComponentClass, normalizeChildren, type Child, type VNode } from './h';
import { setProp, updateProps } from './props';
import type { Component } from './component';

export type Ref = (dom: Node | null) => void;
export type Container = Element & { __vchildren?: VNode[] };

const SVG_NS = 'http://www.w3.org/2000/svg';

/** componentDidMount / componentDidUpdate вызываются после всей перерисовки, а не посреди неё */
let pendingLifecycle: Array<[Component, 'mount' | 'update']> = [];

function flushLifecycle() {
    const queue = pendingLifecycle;
    pendingLifecycle = [];
    queue.forEach(([instance, kind]) => {
        if (instance._unmounted) return;
        if (kind === 'mount') instance.componentDidMount?.();
        else instance.componentDidUpdate?.();
    });
}

// render() должен вернуть один корень; null превращается в пустое место
function normalizeRoot(output: Child): VNode {
    const nodes = normalizeChildren([output]);
    if (nodes.length > 1) {
        throw new Error('Компонент должен возвращать один корневой элемент');
    }
    return nodes[0] ?? createEmptyVNode();
}

/** Ключ — key или позиция. Повторяющиеся key получают суффикс (`a`, `a#1`) */
function buildKeys(children: VNode[]): string[] {
    const seen = new Map<string, number>();

    return children.map((child, i) => {
        if (child.key === null || child.key === undefined) return `i:${i}`;

        const base = `k:${child.key}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return count === 0 ? base : `${base}#${count}`;
    });
}

function renderInstance(instance: Component): VNode {
    instance._dirty = false;
    const rendered = normalizeRoot(instance.render());
    rendered.owner = instance;
    return rendered;
}

function createNode(vnode: VNode, isSvg: boolean): Node {
    if (vnode.type === TEXT) {
        vnode.dom = document.createTextNode(vnode.props.nodeValue as string);
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

    const tag = vnode.type as string;
    const svg = isSvg || tag === 'svg';
    const dom = svg
        ? document.createElementNS(SVG_NS, tag)
        : document.createElement(tag);

    vnode.children.forEach((child) => dom.appendChild(createNode(child, svg && tag !== 'foreignObject')));
    Object.entries(vnode.props).forEach(([name, value]) => setProp(dom, name, value, undefined, svg));

    vnode.dom = dom;
    (vnode.props.ref as Ref | undefined)?.(dom);
    return dom;
}

/** Только lifecycle и ref, сам DOM-узел удаляет вызывающий код */
function unmount(vnode: VNode): void {
    if (vnode.instance) {
        vnode.instance.componentWillUnmount?.();
        vnode.instance._unmounted = true;
        if (vnode.instance._rendered) unmount(vnode.instance._rendered);
        return;
    }
    (vnode.props.ref as Ref | undefined)?.(null);
    vnode.children.forEach(unmount);
}

/**
 * После перерисовки корневой DOM-узел компонента мог смениться — обновляем ссылку
 * у его узла в дереве родителя и у всех компонентов выше, чей корень — этот компонент.
 */
function syncHostDom(instance: Component): void {
    let current: Component | undefined = instance;
    while (current?._host && current._rendered) {
        current._host.dom = current._rendered.dom;
        current = current._host.owner;
    }
}

function updateComponent(instance: Component): void {
    const prev = instance._rendered;
    const parentDom = prev?.dom?.parentNode;
    if (instance._unmounted || !prev || !parentDom) return;

    const next = renderInstance(instance);

    patch(parentDom, prev, next, instance._isSvg);
    instance._rendered = next;
    syncHostDom(instance);
    pendingLifecycle.push([instance, 'update']);
}

const dirtyComponents = new Set<Component>();
let flushScheduled = false;

function flushUpdates() {
    flushScheduled = false;
    const queue = [...dirtyComponents];
    dirtyComponents.clear();

    queue.forEach((instance) => {
        if (instance._dirty) updateComponent(instance);
    });
    flushLifecycle();
}

/** Перерисовка в микрозадаче: несколько setState подряд дают одну перерисовку */
export function enqueueUpdate(instance: Component): void {
    instance._dirty = true;
    dirtyComponents.add(instance);

    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushUpdates);
    }
}

function patch(parentDom: Node, oldVNode: VNode, newVNode: VNode, isSvg: boolean): void {
    if (oldVNode.type !== newVNode.type) {
        const dom = createNode(newVNode, isSvg);
        parentDom.replaceChild(dom, oldVNode.dom!);
        unmount(oldVNode);
        return;
    }

    if (newVNode.type === EMPTY) {
        newVNode.dom = oldVNode.dom;
        return;
    }

    if (newVNode.type === TEXT) {
        newVNode.dom = oldVNode.dom!;
        if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
            newVNode.dom.nodeValue = newVNode.props.nodeValue as string;
        }
        return;
    }

    if (oldVNode.instance) {
        const instance = oldVNode.instance;
        newVNode.instance = instance;
        instance._host = newVNode;
        instance.props = newVNode.props;

        const next = renderInstance(instance);
        patch(parentDom, instance._rendered!, next, isSvg);
        instance._rendered = next;
        newVNode.dom = next.dom;
        pendingLifecycle.push([instance, 'update']);
        return;
    }

    const dom = oldVNode.dom as Element;
    const svg = isSvg || newVNode.type === 'svg';
    newVNode.dom = dom;

    patchChildren(dom, oldVNode.children, newVNode.children, svg && newVNode.type !== 'foreignObject');
    updateProps(dom, oldVNode.props, newVNode.props, svg);
    if (oldVNode.props.ref !== newVNode.props.ref) {
        (oldVNode.props.ref as Ref | undefined)?.(null);
        (newVNode.props.ref as Ref | undefined)?.(dom);
    }
}

/**
 * Узлы с тем же key (или без key на той же позиции) переиспользуются и переставляются.
 * В родителе не должно быть DOM-узлов, добавленных в обход VDOM.
 */
function patchChildren(parentDom: Node, oldChildren: VNode[], newChildren: VNode[], isSvg: boolean): void {
    const oldByKey = new Map<string, VNode>();
    buildKeys(oldChildren).forEach((key, i) => oldByKey.set(key, oldChildren[i]));

    let prevDom: Node | null = null;

    buildKeys(newChildren).forEach((key, i) => {
        const child = newChildren[i];
        const old = oldByKey.get(key);

        if (old) {
            oldByKey.delete(key);
            patch(parentDom, old, child, isSvg);
        } else {
            createNode(child, isSvg);
        }

        const expected: Node | null = prevDom ? prevDom.nextSibling : parentDom.firstChild;
        if (child.dom !== expected) parentDom.insertBefore(child.dom!, expected);
        prevDom = child.dom;
    });

    oldByKey.forEach((child) => {
        unmount(child);
        child.dom?.parentNode?.removeChild(child.dom);
    });
}

/** Повторный вызов для того же контейнера меняет в DOM только разницу */
export function render(container: Container, vnodes: Child): void {
    const next = normalizeChildren([vnodes]);

    if (!container.__vchildren) {
        container.textContent = '';
        container.__vchildren = [];
    }

    patchChildren(container, container.__vchildren, next, container instanceof SVGElement);
    container.__vchildren = next;
    flushLifecycle();
}
