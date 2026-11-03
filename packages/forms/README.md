# goget-forms

Form validation state without a framework. Errors appear after a typing pause, immediately on blur and on submit; required-field errors appear only after submit.

```sh
npm install goget-forms
```

```ts
import { FormValidation } from 'goget-forms';

const form = new FormValidation({
    name: { validate: (value) => (value.length < 2 ? 'Слишком короткое имя' : ''), required: 'Введите имя' },
}, render);

input.addEventListener('input', () => form.input('name', input.value));
input.addEventListener('change', () => form.change('name'));

const values = form.validateAll();
form.destroy();
```

Exports: `FormValidation`, types `FormValues`, `FieldRule`.
