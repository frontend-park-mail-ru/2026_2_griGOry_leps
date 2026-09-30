import { login } from '../../api.js';
import { setUser } from '../../store.js';
import { redirect } from '../../router/router.js';
import { compileTemplate } from '../../core/template.js';
import '../../components/auth-layout/auth-layout.js';
import '../../components/auth-card/auth-card.js';
import '../../components/auth-form/auth-form.js';
import { getAuthTabs } from '../../components/tabs/tabs.js';
import { initFormFields, setFieldError } from '../../components/form-field/form-field.js';
import source from './login.hbs?raw';

const render = compileTemplate(source);

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
    if (!EMAIL_RE.test(value)) errors.login = 'Введите корректный email, например name@mail.ru';
  } else if (!isValidPhone(value)) {
    errors.login = 'Номер указан не полностью — введите 10 цифр после +7';
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
  root.innerHTML = render({ tabs: getAuthTabs('login') });
  initFormFields(root);

  const form = /** @type {HTMLFormElement} */ (root.querySelector('#login-form'));
  const formError = /** @type {HTMLElement} */ (root.querySelector('#form-error'));
  const submitButton = /** @type {HTMLButtonElement} */ (
    form.querySelector('button[type="submit"]')
  );

  /** @param {LoginFormErrors} errors */
  function showFieldErrors(errors) {
    for (const name of /** @type {const} */ (['login', 'password'])) {
      setFieldError(form, name, errors[name]);
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
