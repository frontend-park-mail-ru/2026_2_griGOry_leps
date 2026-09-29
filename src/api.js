const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const headers = { ...options.headers };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export async function getMe() {
  const response = await request('/me');
  if (!response.ok) return null;
  return response.json();
}

export async function login({ login, password }) {
  const response = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });

  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }

  const user = await getMe();
  if (!user) {
    throw new Error('Не удалось получить данные пользователя');
  }
  return user;
}

export async function register(data) {
  const response = await request('/register', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      nickname: data.nickname,
      phone: data.phone,
    }),
  });

  if (!response.ok) {
    throw new Error('Ошибка регистрации');
  }

  return await login({ login: data.email, password: data.password });
}

export async function logout() {
  await request('/logout', { method: 'POST' });
}