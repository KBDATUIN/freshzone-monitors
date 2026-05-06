// ============================================================
//  FRESHZONE — role-guard.js
//  Centralised auth & role utilities
// ============================================================

// Storage for the current user - populated after async check
let _currentUser = null;

// Initialize - call this on page load to verify authentication
async function initAuthGuard() {
    // Always validate the session with the backend.
    // localStorage may be stale if user switches accounts without clearing it.
    _currentUser = await hydrateSessionUser();

    if (!_currentUser) {
        // No valid session - clear stale cache and redirect to login
        localStorage.removeItem('currentUser');
        alert('Access denied. Please login first.');
        window.location.href = 'auth.html';
        return null;
    }

    // Cache fresh user data for convenience
    localStorage.setItem('currentUser', JSON.stringify(_currentUser));
    return _currentUser;
}

// Get current user (returns null if not authenticated)
function getCurrentUser() {
    return _currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return _currentUser !== null && _currentUser !== undefined;
}

function isAdmin() {
    return _currentUser?.position === 'Administrator';
}

function isStaff() {
    return _currentUser?.position === 'Staff / Teachers';
}

function requireAdmin() {
    if (!isAdmin()) {
        alert('Access denied: Administrator only.');
        window.location.href = 'dashboard.html';
    }
}

// Auto-initialize on page load if on a protected page
(function autoProtect() {
    // Pages that need protection
    const protectedPages = ['dashboard.html', 'history.html', 'admin.html', 'profile.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (protectedPages.includes(currentPage)) {
        initAuthGuard();
    }
})();
