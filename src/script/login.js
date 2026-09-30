const form = document.getElementById('login-form');
const loginField = document.getElementById('field-login');
const passwordField = document.getElementById('field-password');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearErrors(form);

    const loginValue = form.login.value.trim();
    const passwordValue = form.password.value;

    let hasError = false;

    if (loginValue === '') {
        setError(loginField, 'Введите email или телефон');
        hasError = true;
    } else if (!isValidLogin(loginValue)) {
        setError(loginField, loginValue.includes('@')
            ? 'Введите корректный email, например name@mail.ru'
            : 'Номер указан не полностью — введите 10 цифр после +7');
        hasError = true;
    }

    if (passwordValue === '') {
        setError(passwordField, 'Введите пароль');
        hasError = true;
    }

    if (hasError) return;
    let res;
    try {
        res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login: loginValue, password: passwordValue }),
        });
    } catch {
        setError(passwordField, 'Нет связи с сервером');
        return;
    }

    if (res.ok) {
        window.location.href = '/';
        return;
    }

    const data = await res.json().catch(() => ({}));
    const msg = data.error || 'Неверный пароль. Попробуйте ещё раз';

    // Определяем, к какому полю привязать ошибку
    if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('телефон')) {
        setError(loginField, msg);
    } else {
        setError(passwordField, msg);
    }
});

function isValidLogin(v) {
    if (v.includes('@')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }
    const digits = v.replace(/\D/g, '');
    return digits.length === 11 || digits.length === 10;
}

function setError(fieldEl, message) {
    fieldEl.classList.add('auth-field--error');
    const errEl = fieldEl.querySelector('.auth-field-error');
    if (errEl) {
        errEl.textContent = message;
        errEl.hidden = false;
    }
}

function clearErrors(form) {
    form.querySelectorAll('.auth-field--error').forEach(el => {
        el.classList.remove('auth-field--error');
    });
    form.querySelectorAll('.auth-field-error').forEach(el => {
        el.textContent = '';
        el.hidden = true;
    });
}

document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.closest('.auth-input-wrap').querySelector('input');
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.setAttribute('aria-label',
            input.type === 'password' ? 'Показать пароль' : 'Скрыть пароль');
    });
});