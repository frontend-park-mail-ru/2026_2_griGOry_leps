import { describe, it, expect, beforeEach, vi } from 'vitest';
import { h, Component, render } from './index.js';

let root;

/** Дождаться отложенной перерисовки после setState */
const flush = () => Promise.resolve();

beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('h', () => {
    it('null и false становятся пустым местом, массивы и фрагменты раскрываются', () => {
        const vnode = h('ul', null, [h('li', null, 'a'), null, false], <>{'b'}</>);
        expect(vnode.children.map((c) => c.props.nodeValue ?? c.type)).toEqual(['li', '#empty', '#empty', 'b']);
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

    it('условный рендер: {cond && <Tag />} не сдвигает соседей', () => {
        const view = (show) => <div>{show && <b>есть</b>}<i>всегда</i></div>;
        render(root, view(false));
        const always = root.querySelector('i');
        expect(root.firstChild.textContent).toBe('всегда');

        render(root, view(true));
        expect(root.firstChild.innerHTML).toBe('<b>есть</b><i>всегда</i>');
        expect(root.querySelector('i')).toBe(always);

        render(root, view(false));
        expect(root.querySelector('i')).toBe(always);
    });

    it('пустое место не мешает CSS-селектору :empty', () => {
        render(root, <p class="error">{null}</p>);
        expect(root.querySelector('p:empty')).not.toBeNull();
        expect(root.textContent).toBe('');
    });

    it('дубли key не оставляют в DOM лишних узлов', () => {
        const list = (items) => <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>;
        render(root, list(['a', 'a', 'b']));
        expect(root.querySelectorAll('li')).toHaveLength(3);

        render(root, list(['b']));
        expect(root.querySelector('ul').innerHTML).toBe('<li>b</li>');
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

    it('числовое value не перезаписывается на каждой перерисовке', () => {
        render(root, <input value={5} />);
        const setter = vi.spyOn(root.firstChild, 'value', 'set');

        render(root, <input value={5} />);

        expect(setter).not.toHaveBeenCalled();
        expect(root.firstChild.value).toBe('5');
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

    it('перерисовывается по setState, сохраняя DOM-узел', async () => {
        render(root, <Counter label="Клики" />);
        const button = root.firstChild;

        button.click();
        await flush();
        button.click();
        await flush();

        expect(root.firstChild).toBe(button);
        expect(button.textContent).toBe('Клики: 2');
    });

    it('сохраняет состояние, когда родитель меняет пропсы', async () => {
        render(root, <div><Counter label="A" /></div>);
        root.querySelector('button').click();
        await flush();

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

    it('не перерисовывается после удаления', async () => {
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

        instance.setState({ text: 'стало' });
        await flush();
        expect(root.innerHTML).toBe('<b></b>');
    });

    it('вложенный компонент меняет корневой тег без поломки родителя', async () => {
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
        await flush();

        expect(root.firstChild.innerHTML).toBe('<b>on</b><span>после</span>');

        render(root, <section><Toggle /><span>после!</span></section>);
        expect(root.firstChild.innerHTML).toBe('<b>on</b><span>после!</span>');
    });

    it('объединяет несколько setState подряд в одну перерисовку', async () => {
        const renders = vi.fn();
        let instance;

        class Form extends Component {
            state = { a: 0, b: 0 };
            constructor(props) {
                super(props);
                instance = this;
            }
            render() {
                renders();
                return <p>{this.state.a}-{this.state.b}</p>;
            }
        }

        render(root, <Form />);
        renders.mockClear();

        instance.setState({ a: 1 });
        instance.setState({ b: 2 });
        instance.setState(({ a }) => ({ a: a + 1 }));
        expect(instance.state).toEqual({ a: 2, b: 2 });

        await flush();
        expect(renders).toHaveBeenCalledTimes(1);
        expect(root.textContent).toBe('2-2');
    });

    it('вызывает componentDidUpdate после перерисовки — своей и от родителя', async () => {
        const updates = vi.fn();
        let instance;

        class Probe extends Component {
            constructor(props) {
                super(props);
                instance = this;
            }
            componentDidUpdate() {
                updates(root.textContent);
            }
            render() {
                return <i>{this.props.text}{this.state.extra}</i>;
            }
        }

        render(root, <Probe text="a" />);
        expect(updates).not.toHaveBeenCalled();

        render(root, <Probe text="b" />);
        expect(updates).toHaveBeenLastCalledWith('b');

        instance.setState({ extra: '!' });
        await flush();
        expect(updates).toHaveBeenLastCalledWith('b!');
    });
});
