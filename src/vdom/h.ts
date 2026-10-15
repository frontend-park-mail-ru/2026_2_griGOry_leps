import type { Component } from './component';

export const TEXT = '#text';

/** Место под `{cond && <Tag />}`, в DOM — комментарий */
export const EMPTY = '#empty';

export type Props = Record<string, unknown>;

export type ComponentClass = new (props: Props) => Component;
export type FunctionComponent = (props: Props) => Child;

export type Key = string | number | null;

export interface VNode {
    type: string | ComponentClass;
    props: Props;
    children: VNode[];
    key: Key;
    dom: Node | null;
    instance?: Component;
    /** Компонент, чей render() вернул этот узел */
    owner?: Component;
}

/** null и boolean превращаются в пустое место */
export type Child = VNode | string | number | boolean | null | undefined | Child[];

export function Fragment(props: { children?: VNode[] }): VNode[] {
    return props.children ?? [];
}

export function isComponentClass(type: unknown): type is ComponentClass {
    return typeof type === 'function' && Boolean(type.prototype?.isVdomComponent);
}

export function createTextVNode(value: string): VNode {
    return { type: TEXT, props: { nodeValue: value }, children: [], key: null, dom: null };
}

export function createEmptyVNode(): VNode {
    return { type: EMPTY, props: {}, children: [], key: null, dom: null };
}

export function normalizeChildren(children: Child[], result: VNode[] = []): VNode[] {
    for (const child of children) {
        if (child === null || child === undefined || typeof child === 'boolean') {
            result.push(createEmptyVNode());
        } else if (Array.isArray(child)) {
            normalizeChildren(child, result);
        } else if (typeof child === 'string' || typeof child === 'number') {
            result.push(createTextVNode(String(child)));
        } else {
            result.push(child);
        }
    }
    return result;
}

/**
 * Сюда компилируется JSX.
 * Функциональный компонент вызывается сразу: состояния у него нет, хранить его незачем.
 * Классовый остаётся узлом, чтобы экземпляр жил между перерисовками.
 */
export function h(
    type: string | ComponentClass | FunctionComponent,
    props: Props | null,
    ...children: Child[]
): VNode | VNode[] {
    const flatChildren = normalizeChildren(children);
    const { key = null, ...rest } = props ?? {};

    if (type === Fragment) return flatChildren;

    if (isComponentClass(type)) {
        return { type, props: { ...rest, children: flatChildren }, children: [], key: key as Key, dom: null };
    }

    if (typeof type === 'function') {
        const result = type({ ...rest, children: flatChildren });
        if (key !== null && result && !Array.isArray(result) && typeof result === 'object') {
            result.key = key as Key;
        }
        return result as VNode | VNode[];
    }

    return { type, props: rest, children: flatChildren, key: key as Key, dom: null };
}
