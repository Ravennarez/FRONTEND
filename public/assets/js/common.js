// Common functions and utilities
const API_BASE_URL = 'https://library-management-system-production-1a71.up.railway.app/api';
const CSRF_URL = 'https://library-management-system-production-1a71.up.railway.app/sanctum/csrf-cookie';

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html') &&
            !window.location.pathname.includes('forgot-password.html') &&
            !window.location.pathname.includes('reset-password.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }
    return true;
}

// Show error message
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccess(message, elementId = 'success-message') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

// Make API request
async function makeRequest(url, method, body = null, requiresAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };

    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    const options = {
        method,
        headers,
        credentials: 'include'
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        // First get CSRF cookie for all modifying requests
        if (method !== 'GET') {
            await fetch(CSRF_URL, {
                credentials: 'include'
            });
        }

        const response = await fetch(`${API_BASE_URL}${url}`, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Logout function
async function logout() {
    try {
        await makeRequest('/auth/logout', 'POST');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Initialize navbar
function initNavbar() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const profileBtn = document.getElementById('profile-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            dropdownMenu.classList.toggle('show');
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-dropdown')) {
            dropdownMenu.classList.remove('show');
        }
    });
}
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#faf5f0',
                    100: '#f3e9dd',
                    200: '#e6d1b9',
                    300: '#d8b38d',
                    400: '#c98e5e',
                    500: '#b87b4a',
                    600: '#a5693f',
                    700: '#8a5735',
                    800: '#6f462d',
                    900: '#5c3a26',
                },
                dark: {
                    800: '#1e1e2d',
                    900: '#121218',
                }
            },
            fontFamily: {
                sans: ['Roboto', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
        }
    }
}

// Initialize the app
function initApp() {
    initTheme();
    checkAuth();
    initNavbar();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
