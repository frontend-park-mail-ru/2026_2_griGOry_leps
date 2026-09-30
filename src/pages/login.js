import { login } from '../api.js';
import { setUser } from '../store.js';
import { redirect } from '../router/router.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;

/**
 * @typedef {Object} LoginFormValues
 * @property {string} login
 * @property {string} password
 */

/**
 * @typedef {Object} LoginFormErrors
 * @property {string} [login]
 * @property {string} [password]
 */

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidPhone(value) {
  if (!/^\+?[\d\s()-]+$/.test(value)) return false;
  return value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS;
}

/**
 * Проверяет поля формы входа. Логика совпадает с бэкендом:
 * если в логине есть «@» — это email, иначе телефон.
 * @param {LoginFormValues} values
 * @returns {LoginFormErrors} пустой объект, если ошибок нет
 */
export function validateLoginForm({ login: loginValue, password }) {
  /** @type {LoginFormErrors} */
  const errors = {};
  const value = loginValue.trim();

  if (!value) {
    errors.login = 'Введите телефон или email';
  } else if (value.includes('@')) {
    if (!EMAIL_RE.test(value)) errors.login = 'Введите корректный email';
  } else if (!isValidPhone(value)) {
    errors.login = 'Введите корректный номер телефона';
  }

  if (!password) {
    errors.password = 'Введите пароль';
  }

  return errors;
}

/**
 * Подбирает сообщение для пользователя по типу ошибки.
 * @param {{ status?: number, network?: boolean } | null | undefined} err
 * @returns {string}
 */
export function getLoginErrorMessage(err) {
  if (err?.network) {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова';
  }
  if (err?.status === 401) {
    return 'Неверный логин или пароль';
  }
  if (err?.status !== undefined && err.status >= 500) {
    return 'Ошибка сервера. Попробуйте позже';
  }
  return 'Не удалось войти. Попробуйте ещё раз';
}

/**
 * Рисует страницу входа.
 * @param {HTMLElement} root
 * @returns {void}
 */
export function renderLoginPage(root) {
  root.innerHTML = `
    <h1>Вход в GO&GET</h1>
    <form id="login-form" novalidate>
      <div>
        <label for="login-input">Телефон или Email</label>
        <input id="login-input" type="text" name="login" autocomplete="username" />
        <p class="form-error" data-error-for="login"></p>
      </div>
      <div>
        <label for="password-input">Пароль</label>
        <input id="password-input" type="password" name="password" autocomplete="current-password" />
        <p class="form-error" data-error-for="password"></p>
      </div>
      <button type="submit">Войти</button>
      <p class="form-error" id="form-error" role="alert"></p>
    </form>
  `;

  const form = /** @type {HTMLFormElement} */ (root.querySelector('#login-form'));
  const formError = /** @type {HTMLElement} */ (root.querySelector('#form-error'));
  const submitButton = /** @type {HTMLButtonElement} */ (
    form.querySelector('button[type="submit"]')
  );

  /** @param {LoginFormErrors} errors */
  function showFieldErrors(errors) {
    for (const name of /** @type {const} */ (['login', 'password'])) {
      const el = form.querySelector(`[data-error-for="${name}"]`);
      if (el) el.textContent = errors[name] ?? '';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    const data = new FormData(form);
    const values = {
      login: String(data.get('login') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    const errors = validateLoginForm(values);
    showFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submitButton.disabled = true;
    try {
      const user = await login({
        login: values.login.trim(),
        password: values.password,
      });
      setUser(user);
      redirect('/');
    } catch (err) {
      formError.textContent = getLoginErrorMessage(err);
    } finally {
      submitButton.disabled = false;
    }
  });
}