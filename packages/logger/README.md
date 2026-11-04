# goget-logger

Console logger that can be switched off, for example in production builds.

```sh
npm install goget-logger
```

```ts
import { createLogger } from 'goget-logger';

const logger = createLogger({ enabled: import.meta.env.DEV });

logger.warn('Не удалось загрузить данные', error);
```

`createLogger(options?)` returns `{ error, warn, info }` with the same arguments as `console.*`. `enabled` is `true` by default; with `false` nothing is written.
