function logout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
    }).then(() => window.location.href = '/');
}