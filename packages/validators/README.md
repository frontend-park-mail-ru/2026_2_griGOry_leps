# goget-validators

Form field validators with Russian error messages. Each validator returns an error text or `''`; an empty value is not an error.

```sh
npm install goget-validators
```

```ts
import { sanitizePhone, validateEmail, validatePassword } from 'goget-validators';

sanitizePhone('8 (900) 123-45-67');
validateEmail('user@mail.ru');
validatePassword('qwerty');
```

Exports: `LIMITS`, `sanitizePhone`, `normalizeLogin`, `byteLength`, `validateName`, `validatePhone`, `validateEmail`, `validateLogin`, `validateMaxLength`, `validateAbout`, `checkPasswordRules`, `validatePassword`, `validateLoginPassword`, `validatePasswordRepeat`.
