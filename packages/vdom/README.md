# goget-vdom

Tiny virtual DOM: class components with `setState` and batched updates, function components, keyed children, refs and a JSX runtime.

```sh
npm install goget-vdom
```

`tsconfig.json`:

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "goget-vdom" } }
```

```tsx
import { Component, render } from 'goget-vdom';

class Counter extends Component<{ start: number }, { count: number }> {
    state = { count: this.props.start };

    render() {
        return <button onClick={() => this.setState({ count: this.state.count + 1 })}>{this.state.count}</button>;
    }
}

render(document.getElementById('app')!, <Counter start={0} />);
```

Exports: `h` (`createElement`), `Fragment`, `Component`, `render`, types `Child`, `VNode`; `goget-vdom/jsx-runtime` and `goget-vdom/jsx-dev-runtime` for the JSX transform.
