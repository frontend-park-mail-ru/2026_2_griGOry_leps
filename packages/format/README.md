# goget-format

Formatters for Russian UI texts: prices, dates, ratings and plurals. Built on `Intl`, no dependencies.

```sh
npm install goget-format
```

```ts
import { formatPrice, formatPosted, plural } from 'goget-format';

formatPrice('15000.00');
formatPrice('13500.5');
formatPosted('2026-11-01T10:00:00Z');
plural(5, ['день', 'дня', 'дней']);
```

Exports: `formatPrice`, `formatDay`, `formatSince`, `formatSinceYear`, `formatPosted`, `formatCountdown`, `formatRating`, `formatStars`, `formatAddress`, `plural`.
