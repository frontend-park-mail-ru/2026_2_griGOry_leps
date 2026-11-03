# goget-debounce

Debounce a function: it runs once after the calls stop for `ms` milliseconds, with the last arguments.

```sh
npm install goget-debounce
```

```ts
import { debounce } from 'goget-debounce';

const save = debounce((value: string) => api.save(value), 300);

input.addEventListener('input', () => save(input.value));
save.cancel();
```
