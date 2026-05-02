function requireAdmin() {
    if (!isAdmin()) {
        showNotification('Access denied: Administrator only.', 'error');
        window.location.href = 'dashboard.html';
    }
}