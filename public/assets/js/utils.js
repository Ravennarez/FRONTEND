// API Configuration
const API_BASE_URL = 'https://library-management-system-production-1a71.up.railway.app/api';
const CSRF_URL = 'https://library-management-system-production-1a71.up.railway.app/sanctum/csrf-cookie';

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }
    return true;
}

// Redirect if not authenticated
function requireAuth() {
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Redirect if authenticated
function redirectIfAuth() {
    if (checkAuth()) {
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            window.location.href = data.user.role === 'admin' 
                ? 'admin-dashboard.html' 
                : 'user-dashboard.html';
        })
        .catch(() => {
            localStorage.removeItem('token');
        });
    }
}

// Common function to display messages
function showMessage(message, type = 'error', elementId = 'message') {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    messageElement.className = `${type}-message`;
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Common function to handle API requests
async function makeRequest(url, method, body = null, requiresAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };

    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            throw new Error('Not authenticated');
        }
        headers['Authorization'] = `Bearer ${token}`;
    
    }

    const options = {
        method,
        headers,
        credentials: 'include' // Important for cookies
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

        const response = await fetch(url, options);
        
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

// Load user data
async function loadUserData() {
    try {
        const data = await makeRequest(`${API_BASE_URL}/auth/me`, 'GET', null, true);
        return data.user;
    } catch (error) {
        console.error('Failed to load user data:', error);
        return null;
    }
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

// Logout user
async function logoutUser() {
    try {
        await makeRequest(`${API_BASE_URL}/auth/logout`, 'POST', null, true);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Initialize common UI elements
function initCommonUI() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
    
    // User dropdown
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userAvatar') && !e.target.closest('#userDropdown')) {
                userDropdown.classList.remove('show');
            }
        });
    }
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Export functions for use in other files
export {
    API_BASE_URL,
    CSRF_URL,
    checkAuth,
    requireAuth,
    redirectIfAuth,
    showMessage,
    makeRequest,
    loadUserData,
    initTheme,
    toggleTheme,
    logoutUser,
    initCommonUI,
    formatDate,
    debounce
};
