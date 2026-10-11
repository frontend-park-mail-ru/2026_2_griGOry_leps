import { describe, it, expect, beforeEach, vi } from 'vitest';
import { h, Component, render } from './index.js';

let root;

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('h', () => {
    it('выкидывает null, false и раскрывает массивы во фрагменте', () => {
        const vnode = h('ul', null, [h('li', null, 'a'), null, false], <>{'b'}</>);
        expect(vnode.children.map((c) => c.props.nodeValue ?? c.type)).toEqual(['li', 'b']);
    });

    it('переносит key функционального компонента на его разметку', () => {
        const Item = ({ text }) => <li>{text}</li>;
        expect(<Item key="a" text="A" />).toMatchObject({ type: 'li', key: 'a' });
    });

    it('сразу вызывает функциональный компонент', () => {
        const Title = ({ text }) => <h1>{text}</h1>;
        expect(<Title text="Привет" />).toMatchObject({ type: 'h1' });
    });
});

describe('render', () => {
    it('создаёт элементы, атрибуты и текст', () => {
        render(root, <a class="link" href="/x" data-link aria-hidden={false}>Текст {42}</a>);

        expect(root.innerHTML).toBe('<a class="link" href="/x" data-link="">Текст 42</a>');
    });

    it('обновляет только изменившиеся атрибуты и текст, не пересоздавая узлы', () => {
        render(root, <p class="a">один</p>);
        const p = root.firstChild;

        render(root, <p class="b">два</p>);

        expect(root.firstChild).toBe(p);
        expect(p.className).toBe('b');
        expect(p.textContent).toBe('два');
    });

    it('заменяет узел, если сменился тег', () => {
        render(root, <p>текст</p>);
        render(root, <span>текст</span>);
        expect(root.innerHTML).toBe('<span>текст</span>');
    });

    it('при перестановке по key переиспользует DOM-узлы', () => {
        const list = (items) => <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>;
        render(root, list(['a', 'b', 'c']));
        const [a, b, c] = root.querySelectorAll('li');

        render(root, list(['c', 'a', 'b']));
        const after = [...root.querySelectorAll('li')];

        expect(after.map((li) => li.textContent)).toEqual(['c', 'a', 'b']);
        expect(after).toEqual([c, a, b]);
        expect(after[1]).toBe(a);
        expect(b.isConnected).toBe(true);
    });

    it('удаляет лишние и добавляет новые элементы списка', () => {
        const list = (items) => <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>;
        render(root, list(['a', 'b', 'c']));
        render(root, list(['b', 'd']));
        expect(root.querySelector('ul').innerHTML).toBe('<li>b</li><li>d</li>');
    });

    it('условный рендер: {cond && <Tag />}', () => {
        const view = (show) => <div>{show && <b>есть</b>}<i>всегда</i></div>;
        render(root, view(false));
        expect(root.firstChild.innerHTML).toBe('<i>всегда</i>');
        render(root, view(true));
        expect(root.firstChild.innerHTML).toBe('<b>есть</b><i>всегда</i>');
    });

    it('вешает обработчики событий и меняет их без повторной подписки', () => {
        const first = vi.fn();
        const second = vi.fn();

        render(root, <button onClick={first}>ok</button>);
        root.firstChild.click();
        render(root, <button onClick={second}>ok</button>);
        root.firstChild.click();
        render(root, <button>ok</button>);
        root.firstChild.click();

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('булевы атрибуты: disabled добавляется и снимается', () => {
        render(root, <button disabled>ok</button>);
        expect(root.firstChild.disabled).toBe(true);
        render(root, <button disabled={false}>ok</button>);
        expect(root.firstChild.hasAttribute('disabled')).toBe(false);
    });

    it('value поля ввода пишется в свойство и не трогается, если не изменилось', () => {
        render(root, <input value="abc" />);
        const input = root.firstChild;
        const setter = vi.spyOn(input, 'value', 'set');

        render(root, <input value="abc" />);
        expect(setter).not.toHaveBeenCalled();

        render(root, <input value="abcd" />);
        expect(input.value).toBe('abcd');
    });

    it('создаёт SVG в правильном пространстве имён', () => {
        render(root, <svg viewBox="0 0 10 10"><path d="M0 0" /></svg>);
        expect(root.querySelector('path').namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it('вызывает ref с элементом и null при удалении', () => {
        const ref = vi.fn();
        render(root, <div><span ref={ref} /></div>);
        expect(ref).toHaveBeenLastCalledWith(root.querySelector('span'));
        render(root, <div />);
        expect(ref).toHaveBeenLastCalledWith(null);
    });

    it('принимает массив узлов как корень', () => {
        render(root, [<header />, <main />]);
        expect(root.innerHTML).toBe('<header></header><main></main>');
    });
});

describe('Component', () => {
    class Counter extends Component {
        state = { count: 0 };

        render() {
            return (
                <button onClick={() => this.setState({ count: this.state.count + 1 })}>
                    {this.props.label}: {this.state.count}
                </button>
            );
        }
    }

    it('перерисовывается по setState, сохраняя DOM-узел', () => {
        render(root, <Counter label="Клики" />);
        const button = root.firstChild;

        button.click();
        button.click();

        expect(root.firstChild).toBe(button);
        expect(button.textContent).toBe('Клики: 2');
    });

    it('сохраняет состояние, когда родитель меняет пропсы', () => {
        render(root, <div><Counter label="A" /></div>);
        root.querySelector('button').click();

        render(root, <div><Counter label="B" /></div>);

        expect(root.textContent).toBe('B: 1');
    });

    it('вызывает componentDidMount после вставки и componentWillUnmount при удалении', () => {
        const calls = [];

        class Probe extends Component {
            componentDidMount() {
                calls.push(['mount', document.body.contains(this._rendered.dom)]);
            }
            componentWillUnmount() {
                calls.push(['unmount']);
            }
            render() {
                return <i>probe</i>;
            }
        }

        render(root, <div><Probe /></div>);
        render(root, <div />);

        expect(calls).toEqual([['mount', true], ['unmount']]);
    });

    it('не перерисовывается после удаления', () => {
        let instance;
        class Late extends Component {
            constructor(props) {
                super(props);
                instance = this;
            }
            render() {
                return <i>{this.state.text ?? 'было'}</i>;
            }
        }

        render(root, <Late />);
        render(root, <b />);

        expect(() => instance.setState({ text: 'стало' })).not.toThrow();
        expect(root.innerHTML).toBe('<b></b>');
    });

    it('вложенный компонент меняет корневой тег без поломки родителя', () => {
        class Toggle extends Component {
            state = { on: false };
            render() {
                return this.state.on
                    ? <b onClick={() => this.setState({ on: false })}>on</b>
                    : <i onClick={() => this.setState({ on: true })}>off</i>;
            }
        }

        render(root, <section><Toggle /><span>после</span></section>);
        root.querySelector('i').click();

        expect(root.firstChild.innerHTML).toBe('<b>on</b><span>после</span>');

        render(root, <section><Toggle /><span>после!</span></section>);
        expect(root.firstChild.innerHTML).toBe('<b>on</b><span>после!</span>');
    });
});
