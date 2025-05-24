// API Configuration
const API_BASE_URL = 'https://library-management-system-production-1a71.up.railway.app/api';
const CSRF_URL = 'https://library-management-system-production-1a71.up.railway.app/sanctum/csrf-cookie';
// Common function to display errors
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
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
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
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
// Login Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const loginButton = e.target.querySelector('button[type="submit"]');
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        const data = await makeRequest(
            `${API_BASE_URL}/auth/login`,
            'POST',
            { email, password }
        );
        localStorage.setItem('token', data.access_token);
        // Get user info to determine role
        const userData = await makeRequest(
            `${API_BASE_URL}/auth/me`,
            'GET',
            null,
            true
        );
        window.location.href = userData.user.role === 'admin' 
            ? 'admin-dashboard.html' 
            : 'user-dashboard.html';
    } catch (error) {
        showError(error.message);
    } finally {
        const loginButton = e.target.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    }
});
// Registration Handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        password_confirmation: document.getElementById('password_confirmation').value,
       
    };
    
    // Basic client-side validation
    if (formData.password !== formData.password_confirmation) {
        showError('Passwords do not match');
        return;
    }
    if (formData.password.length < 8) {
        showError('Password must be at least 8 characters');
        return;
    }
    
    try {
        const registerButton = e.target.querySelector('button[type="submit"]');
        registerButton.disabled = true;
        registerButton.textContent = 'Registering...';
        
        const result = await makeRequest(
            `${API_BASE_URL}/auth/register`,
            'POST',
            formData
        );
        
        localStorage.setItem('token', result.access_token);
        
        // Get user info to determine role after registration
        const userData = await makeRequest(
            `${API_BASE_URL}/auth/me`,
            'GET',
            null,
            true
        );
        
        // Redirect based on the actual role from the user data
        window.location.href = userData.user.role === 'admin' 
            ? 'admin-dashboard.html' 
            : 'user-dashboard.html';
            
    } catch (error) {
        showError(error.message);
    } finally {
        const registerButton = e.target.querySelector('button[type="submit"]');
        if (registerButton) {
            registerButton.disabled = false;
            registerButton.textContent = 'Register';
        }
    }
});
// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token && (window.location.pathname.includes('login.html') || 
                  window.location.pathname.includes('register.html'))) {
        // Redirect to appropriate dashboard if already logged in
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
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
});
// Add this function to your existing auth.js
async function logoutUser() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        // Show loading state if called from other pages
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = 'Logging out...';
        }
        // Send logout request to backend
        await fetch('https://library-management-system-production-1a71.up.railway.app/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        // Clear frontend authentication tokens
        localStorage.removeItem('token');
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, clear token and redirect
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}
// Update your existing logout button event listener
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
});
