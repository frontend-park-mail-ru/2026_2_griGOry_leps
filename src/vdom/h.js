/**
 * @module vdom/h
 * @description Создание виртуальных узлов. Сюда компилируется JSX:
 * `<div class="card">Текст</div>` превращается в `h('div', { class: 'card' }, 'Текст')`.
 */

/** Тип текстового узла */
export const TEXT = '#text';

/** Тип пустого места на позиции `{cond && <Tag />}` */
export const EMPTY = '#empty';

/**
 * @typedef {Object} VNode
 * @property {string|Function} type Тег, TEXT или класс компонента
 * @property {Object} props Атрибуты, обработчики событий, ref
 * @property {VNode[]} children
 * @property {(string|number|null)} key Ключ для сравнения списков
 * @property {(Node|null)} dom Реальный DOM-узел после монтирования
 * @property {(module:vdom/component.Component|undefined)} instance Экземпляр классового компонента
 */

/**
 * Фрагмент `<>...</>`: группирует узлы без обёртки, дети встраиваются в родителя.
 * @param {{children: VNode[]}} props
 * @returns {VNode[]}
 */
export function Fragment(props) {
    return props.children;
}

/**
 * @param {*} type
 * @returns {boolean} true для классового компонента (наследника Component)
 */
export function isComponentClass(type) {
    return typeof type === 'function' && Boolean(type.prototype?.isVdomComponent);
}

/**
 * @param {string} value
 * @returns {VNode}
 */
export function createTextVNode(value) {
    return { type: TEXT, props: { nodeValue: value }, children: [], key: null, dom: null };
}

/**
 * @returns {VNode} Пустое место (в DOM — комментарий)
 */
export function createEmptyVNode() {
    return { type: EMPTY, props: {}, children: [], key: null, dom: null };
}

/**
 * Приводит детей к плоскому массиву VNode: раскрывает массивы и фрагменты,
 * строки и числа превращает в текстовые узлы, null и булевы значения — в пустое место.
 * @param {Array<*>} children
 * @param {VNode[]} [result]
 * @returns {VNode[]}
 */
export function normalizeChildren(children, result = []) {
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
 * Создаёт виртуальный узел.
 *
 * Функциональный компонент вызывается сразу и подставляет свою разметку:
 * у него нет состояния, поэтому хранить его отдельно не нужно.
 * Классовый компонент остаётся узлом, его экземпляр живёт между перерисовками.
 * @param {string|Function} type
 * @param {?Object} props
 * @param {...*} children
 * @returns {VNode|VNode[]}
 */
export function h(type, props, ...children) {
    const flatChildren = normalizeChildren(children);
    const { key = null, ...rest } = props ?? {};

    if (type === Fragment) return flatChildren;

    if (typeof type === 'function' && !isComponentClass(type)) {
        const result = type({ ...rest, children: flatChildren });
        if (key !== null && result && !Array.isArray(result) && typeof result === 'object') {
            result.key = key;
        }
        return result;
    }

    if (isComponentClass(type)) {
        return { type, props: { ...rest, children: flatChildren }, children: [], key, dom: null };
    }

    return { type, props: rest, children: flatChildren, key, dom: null };
}
