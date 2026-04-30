// ============================================================
//  csrf-helper.js — CSRF disabled (handled server-side)
// ============================================================

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'fz_csrf';

function getCsrfTokenFromCookie() { return null; }
async function fetchCsrfToken() { return null; }
async function ensureCsrfToken() { return null; }
async function addCsrfToHeaders(headers = {}) { return headers; }
async function apiCall(url, options = {}) {
    options.credentials = 'include';
    return fetch(url, options);
}
async function initCsrf() { return null; }