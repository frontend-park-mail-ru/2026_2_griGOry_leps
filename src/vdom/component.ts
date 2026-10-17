import { enqueueUpdate } from './render';
import type { Child, VNode } from './h';

/**
 * setState перерисовывает только этот компонент.
 * componentDidMount — после вставки в DOM, componentDidUpdate — после каждой перерисовки,
 * componentWillUnmount — перед удалением (тут снимаем подписки).
 */
export class Component<P extends object = object, S extends object = object> {
    props: P;
    state: S;

    /** Узел компонента в дереве родителя */
    _host?: VNode;
    _rendered?: VNode;
    _dirty = false;
    _unmounted = false;
    _isSvg = false;

    constructor(props: P) {
        this.props = props;
        this.state = {} as S;
    }

    get isVdomComponent(): boolean {
        return true;
    }

    componentDidMount?(): void;
    componentDidUpdate?(): void;
    componentWillUnmount?(): void;

    setState(update: Partial<S> | ((state: S, props: P) => Partial<S>)): void {
        const patch = typeof update === 'function' ? update(this.state, this.props) : update;
        this.state = { ...this.state, ...patch };
        enqueueUpdate(this);
    }

    render(): Child {
        return null;
    }
}
