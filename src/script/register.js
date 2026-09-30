const form = document.getElementById('register-form');

const fields = {
    firstName: document.getElementById('field-first-name'),
    nickname:  document.getElementById('field-nickname'),
    phone:     document.getElementById('field-phone'),
    email:     document.getElementById('field-email'),
    password:  document.getElementById('field-password'),
    password2: document.getElementById('field-password2'),
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);

    const el = form.elements;
    const payload = {
        first_name: el.first_name.value.trim(),
        nickname:   el.nickname.value.trim(),
        phone:      normalizePhone(el.phone.value.trim()),
        email:      el.email.value.trim().toLowerCase(),
        password:   el.password.value,
    };
    const password2 = el.password2.value;
    let hasError = false;

    if (payload.first_name === '') {
        setError(fields.firstName, 'Введите имя');
        hasError = true;
    }

    if (payload.nickname === '') {
        setError(fields.nickname, 'Введите никнейм');
        hasError = true;
    } else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(payload.nickname)) {
        setError(fields.nickname, 'Только латиница, цифры, _ и . — от 3 до 30 символов');
        hasError = true;
    }

    if (payload.phone === '') {
        setError(fields.phone, 'Введите телефон');
        hasError = true;
    } else if (!/^\+7\d{10}$/.test(payload.phone)) {
        setError(fields.phone, 'Введите номер в формате +7 900 000-00-00');
        hasError = true;
    }

    if (payload.email === '') {
        setError(fields.email, 'Введите email');
        hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        setError(fields.email, 'Введите корректный email, например name@mail.ru');
        hasError = true;
    }

    const pwErr = validatePassword(payload.password);
    if (pwErr) {
        setError(fields.password, pwErr);
        hasError = true;
    }

    if (payload.password !== password2) {
        setError(fields.password2, 'Пароли не совпадают');
        hasError = true;
    }

    if (hasError) return;
    let res;
    try {
        res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
    } catch {
        setError(fields.email, 'Нет связи с сервером');
        return;
    }

    if (res.ok) {
        const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login: payload.email, password: payload.password }),
        });
        window.location.href = loginRes.ok ? '/' : '/login';
        return;
    }

    const data = await res.json().catch(() => ({}));
    const msg = data.error || 'Не удалось зарегистрироваться';

    if (msg.includes('email')) {
        setError(fields.email, msg);
    } else if (msg.includes('телефон') || msg.includes('phone')) {
        setError(fields.phone, msg);
    } else if (msg.includes('никнейм') || msg.includes('nickname')) {
        setError(fields.nickname, msg);
    } else if (msg.includes('пароль') || msg.includes('password')) {
        setError(fields.password, msg);
    } else {
        setError(fields.email, msg);
    }
});

const passwordInput = form.elements.password;
const rulesList = form.querySelector('[data-password-rules]');

passwordInput.addEventListener('input', () => {
    const v = passwordInput.value;
    updateRule(rulesList, 'length', v.length >= 8);
    updateRule(rulesList, 'case',   /[a-z]/.test(v) && /[A-Z]/.test(v));
    updateRule(rulesList, 'digit',  /\d/.test(v));
});

function setError(fieldEl, message) {
    if (!fieldEl) return;
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

function validatePassword(pw) {
    if (pw.length < 8) return 'Пароль должен быть минимум 8 символов';
    if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return 'Нужны заглавная и строчная буквы';
    if (!/\d/.test(pw)) return 'Нужна хотя бы одна цифра';
    return null;
}

function normalizePhone(v) {
    const digits = v.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return '+7' + digits.slice(1);
    if (digits.length === 11 && digits.startsWith('7')) return '+' + digits;
    if (digits.length === 10) return '+7' + digits;
    return v;
}

function updateRule(list, rule, ok) {
    const li = list.querySelector(`[data-rule="${rule}"]`);
    if (li) li.classList.toggle('is-ok', ok);
}

document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.closest('.auth-input-wrap').querySelector('input');
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.setAttribute('aria-label',
            input.type === 'password' ? 'Показать пароль' : 'Скрыть пароль');
    });
});