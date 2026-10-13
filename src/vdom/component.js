/**
 * @module vdom/component
 * @description Базовый класс компонента с состоянием.
 */

import { enqueueUpdate } from './render.js';

/**
 * Компонент с собственным состоянием. Наследник описывает разметку в render(),
 * а при изменении данных вызывает setState — и перерисовывается только он сам.
 *
 * Жизненный цикл:
 * - componentDidMount() — после вставки в DOM (подписки, таймеры, загрузка данных);
 * - componentDidUpdate() — после каждой перерисовки (DOM уже обновлён);
 * - componentWillUnmount() — перед удалением (отписки).
 * @example
 * class Counter extends Component {
 *     state = { count: 0 };
 *     render() {
 *         return <button onClick={() => this.setState({ count: this.state.count + 1 })}>
 *             {this.state.count}
 *         </button>;
 *     }
 * }
 */
export class Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        this.props = props;
        this.state = {};
    }

    /**
     * Обновляет состояние и планирует перерисовку компонента.
     * @param {(Object|function(Object, Object): Object)} update Часть состояния или функция от старого состояния
     */
    setState(update) {
        const patch = typeof update === 'function' ? update(this.state, this.props) : update;
        this.state = { ...this.state, ...patch };
        enqueueUpdate(this);
    }

    /**
     * @returns {*} Виртуальный узел
     */
    render() {
        return null;
    }
}

Component.prototype.isVdomComponent = true;
