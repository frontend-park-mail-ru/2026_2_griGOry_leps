import { login } from '../api.js';
import { setUser } from '../store.js';
import { navigate } from '../router/router.js';

export function renderLoginPage(root) {
  root.innerHTML = `
    <h1>Вход в GO&GET</h1>
    <form id="login-form">
      <div>
        <label>Телефон или Email</label>
        <input type="text" name="login" required placeholder="+7 900 123-45-67" />
      </div>
      <div>
        <label>Пароль</label>
        <input type="password" name="password" required />
      </div>
      <button type="submit">Войти</button>
      <p id="error-msg" style="color: red; margin-top: 10px;"></p>
    </form>
  `;

  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const formData = new FormData(form);
    const loginData = {
      login: formData.get('login'),
      password: formData.get('password'),
    };

    try {
      const user = await login(loginData);
      setUser(user);
      navigate('/');
    } catch (err) {
      errorMsg.textContent = err.message || 'Неверный логин или пароль';
    }
  });
}