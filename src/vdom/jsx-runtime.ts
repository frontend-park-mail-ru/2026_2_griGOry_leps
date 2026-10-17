// Сюда компилируется JSX (jsxImportSource в tsconfig.json и vite.config.js), здесь же типы для JSX

import { h, Fragment, type Child, type ComponentClass, type FunctionComponent, type Key, type Props, type VNode } from './h';

export { Fragment };

export function jsx(
    type: string | ComponentClass | FunctionComponent,
    props: Props & { children?: Child },
    key?: Key,
): VNode | VNode[] {
    const { children, ...rest } = props;
    if (key !== undefined) rest.key = key;
    return children === undefined ? h(type, rest) : h(type, rest, children);
}

export { jsx as jsxs };

export interface DomAttributes {
    [attribute: string]: unknown;
    key?: Key;
    ref?(el: HTMLElement | null): void;
    children?: Child;
    onClick?(event: MouseEvent): void;
    onInput?(event: Event): void;
    onChange?(event: Event): void;
    onSubmit?(event: SubmitEvent): void;
    onScroll?(event: Event): void;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace JSX {
    type Element = VNode | VNode[];
    interface ElementClass { render(): Child }
    interface ElementAttributesProperty { props: object }
    interface ElementChildrenAttribute { children: object }
    interface IntrinsicAttributes { key?: Key }
    interface IntrinsicElements { [tag: string]: DomAttributes }
}
