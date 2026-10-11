/**
 * @module vdom/component
 * @description Базовый класс компонента с состоянием.
 */

import { updateComponent } from './render.js';

/**
 * Компонент с собственным состоянием. Наследник описывает разметку в render(),
 * а при изменении данных вызывает setState — и перерисовывается только он сам.
 *
 * Жизненный цикл:
 * - componentDidMount() — после вставки в DOM (подписки, таймеры, загрузка данных);
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
     * Обновляет состояние и перерисовывает компонент.
     * @param {(Object|function(Object, Object): Object)} update Часть состояния или функция от старого состояния
     */
    setState(update) {
        const patch = typeof update === 'function' ? update(this.state, this.props) : update;
        this.state = { ...this.state, ...patch };
        updateComponent(this);
    }

    /**
     * @returns {*} Виртуальный узел
     */
    render() {
        return null;
    }
}

Component.prototype.isVdomComponent = true;
