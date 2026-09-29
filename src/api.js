const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },

    credentials: 'include',
  });
  return response;
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Неверный логин или пароль');
  }

  return await getMe();
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ошибка регистрации');
  }

  return await login({ login: data.email, password: data.password });
}

export async function logout() {
  await request('/logout', { method: 'POST' });
}