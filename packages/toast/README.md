# goget-toast

Framework-agnostic store for toast notifications. A toast hides itself after `TOAST_DURATION_MS` (4 s); a new toast replaces the current one.

```sh
npm install goget-toast
```

```ts
import { getToast, showToast, subscribeToast } from 'goget-toast';

subscribeToast(() => render(getToast()));

showToast('Сохранено');
showToast('Не удалось сохранить', 'error', { label: 'Повторить', onClick: retry });
```

Exports: `showToast`, `hideToast`, `getToast`, `subscribeToast`, `ToastTimer`, `TOAST_DURATION_MS`, types `ToastType`, `ToastAction`, `ToastState`.
