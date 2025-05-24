import {
    API_BASE_URL,
    requireAuth,
    showMessage,
    makeRequest,
    loadUserData,
    initCommonUI,
    formatDate,
    debounce
} from './utils.js';
// Global variables
let currentPage = 1;
let currentSearch = '';

let currentUsersPage = 1;
let currentUsersSearch = '';

let currentTransactionspage = 1;
let currentTransactionsStatus = '';
let currentTransactionsSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    
    // Initialize common UI
    initCommonUI();
    
    // Load user data
    const user = await loadUserData();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    // Set user avatar
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.textContent = user.name.charAt(0).toUpperCase();
    }
    
    // Load dashboard stats if on dashboard
    if (document.getElementById('booksCount')) {
        await loadDashboardStats();
    }
    // Initialize book management if on books page
    if (document.getElementById('booksTable')) {
        initBookManagement();
    }
    
    // Load dashboard stats if on dashboard
    if (document.getElementById('dashboardStats')) {
        await loadDashboardStats();
    }
    
    // Load users if on users page
    if (document.getElementById('usersTable')) {
        await loadUsers();
        setupUserSearch();
    }
    
    // Load transactions if on transactions page
    if (document.getElementById('transactionsTable')) {
        await loadTransactions();
        setupTransactionFilters();
    }
    // Update dropdown info
document.getElementById('dropdownUserName').textContent = user.name;
document.getElementById('dropdownUserEmail').textContent = user.email;

});
function initBookManagement() {
    setupBookModal();
    setupBookDetailsModal();
    setupBookSearch();
    loadBooks();
}
// Setup book modal
function setupBookModal() {
    const modal = document.getElementById('bookModal');
    const addBtn = document.getElementById('addBookBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBookBtn');
    const form = document.getElementById('bookForm');

    // Clear form and open modal for adding new book
    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add New Book';
        document.getElementById('bookId').value = '';
        form.reset();
        
        // Reset all field states
        const fields = form.querySelectorAll('input, textarea');
        fields.forEach(field => {
            field.disabled = false;
            field.classList.remove('border-red-500');
        });
        
        // Reset submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.querySelector('#submitBtnText').textContent = 'Save Book';
        submitBtn.querySelector('#submitBtnSpinner').classList.add('hidden');
        
        // Remove any existing error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        modal.classList.remove('hidden');
    });

    // Close modal handlers
    const closeModal = () => {
        modal.classList.add('hidden');
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleBookSubmit();
    });
}

// Update the handleBookSubmit function
async function handleBookSubmit() {
    const form = document.getElementById('bookForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const bookId = data.bookId;

    // Validate required fields
    let isValid = true;
    const requiredFields = ['title', 'author', 'isbn', 'genre', 'total_copies'];
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('input, textarea').forEach(field => {
        field.classList.remove('border-red-500');
    });

    // Validate fields
    requiredFields.forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!data[fieldName]) {
            field.classList.add('border-red-500');
            const errorEl = document.createElement('p');
            errorEl.className = 'error-message text-red-500 text-xs mt-1';
            errorEl.textContent = 'This field is required';
            field.parentNode.insertBefore(errorEl, field.nextSibling);
            isValid = false;
        }
    });

    if (!isValid) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.querySelector('#submitBtnText').textContent = bookId ? 'Updating...' : 'Saving...';
        submitBtn.querySelector('#submitBtnSpinner').classList.remove('hidden');

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        };

        const url = bookId ? `${API_BASE_URL}/admin/books/${bookId}` : `${API_BASE_URL}/admin/books`;
        const method = bookId ? 'PUT' : 'POST';

        data.total_copies = parseInt(data.total_copies);

        const response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.errors) {
                Object.entries(result.errors).forEach(([field, messages]) => {
                    const fieldEl = form.querySelector(`[name="${field}"]`);
                    if (fieldEl) {
                        fieldEl.classList.add('border-red-500');
                        const errorEl = document.createElement('p');
                        errorEl.className = 'error-message text-red-500 text-xs mt-1';
                        errorEl.textContent = Array.isArray(messages) ? messages.join(', ') : messages;
                        fieldEl.parentNode.insertBefore(errorEl, fieldEl.nextSibling);
                    }
                });
                throw new Error('Please fix the form errors');
            }
            throw new Error(result.message || 'Request failed');
        }

        console.log('Book operation response:', response);
        form.reset(); // Reset the form
        document.getElementById('bookModal').classList.add('hidden'); // Hide the modal
        await loadBooks(currentPage, currentSearch);

    } catch (error) {
        console.error('Book operation error:', error);
        showMessage(error.message, 'error');
    } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.querySelector('#submitBtnText').textContent = bookId ? 'Update Book' : 'Save Book';
            submitBtn.querySelector('#submitBtnSpinner').classList.add('hidden');
        }
    }
}
// Setup book details modal
function setupBookDetailsModal() {
    const modal = document.getElementById('bookDetailsModal');
    const closeBtn = document.getElementById('closeDetailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const editBtn = document.getElementById('editBookBtn');
    
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    closeDetailsBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    editBtn.addEventListener('click', () => {
        const bookId = document.getElementById('bookDetailsContent').dataset.id;
        if (bookId) {
            modal.classList.add('hidden');
            openEditModal(bookId);
        }
    });
}
// Load books with pagination
async function loadBooks(page = 1, search = '') {
    currentPage = page;
    currentSearch = search;
    
    const tbody = document.getElementById('booksTable');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-4 text-center">
                <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const url = `${API_BASE_URL}/admin/books?page=${page}&search=${encodeURIComponent(search)}`;
        const response = await makeRequest(url, 'GET', null, true);
        
        if (response.success) {
            renderBooksTable(response.data);
            setupPagination('booksPagination', response.meta, loadBooks, search);
        } else {
            throw new Error(response.message || 'Failed to load books');
        }
    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-red-500">
                    ${error.message}
                </td>
            </tr>
        `;
        showMessage(error.message, 'error');
    }
}


// Render books table
function renderBooksTable(books) {
    const tbody = document.getElementById('booksTable');
    tbody.innerHTML = '';
    
    if (!books || books.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No books found
                </td>
            </tr>
        `;
        return;
    }
    
    books.forEach(book => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${book.title || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${book.author || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${book.genre || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full 
                    ${book.available_copies > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${book.available_copies || 0}/${book.total_copies || 0} available
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap space-x-2">
                <button onclick="viewBookDetails('${book.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition">
                    <i class="fas fa-eye mr-1"></i> View
                </button>
                <button onclick="openEditModal('${book.id}')" class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md text-sm transition">
                    <i class="fas fa-edit mr-1"></i> Edit
                </button>
                <button onclick="deleteBook('${book.id}', event )" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition">
                    <i class="fas fa-trash mr-1"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// View book details
async function viewBookDetails(bookId) {
    try {
        const modal = document.getElementById('bookDetailsModal');
        modal.classList.remove('hidden');
        
        const detailsContent = document.getElementById('bookDetailsContent');
        detailsContent.innerHTML = `
            <div class="flex justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        `;
        
        const response = await makeRequest(`${API_BASE_URL}/admin/books/${bookId}`, 'GET', null, true);
        
        if (response.success) {
            const book = response.data;
            detailsContent.dataset.id = bookId;
            detailsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-bold">Title</h4>
                        <p>${book.title || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-bold">Author</h4>
                        <p>${book.author || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-bold">ISBN</h4>
                        <p>${book.isbn || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-bold">Genre</h4>
                        <p>${book.genre || 'N/A'}</p>
                    </div>
                    <div class="md:col-span-2">
                        <h4 class="font-bold">Description</h4>
                        <p class="whitespace-pre-line">${book.description || 'No description available'}</p>
                    </div>
                    <div>
                        <h4 class="font-bold">Total Copies</h4>
                        <p>${book.total_copies || 0}</p>
                    </div>
                    <div>
                        <h4 class="font-bold">Available Copies</h4>
                        <p>${book.available_copies || 0}</p>
                    </div>
                </div>
            `;
        } else {
            throw new Error(response.message || 'Failed to load book details');
        }
    } catch (error) {
        document.getElementById('bookDetailsContent').innerHTML = `
            <div class="text-red-500 text-center">
                ${error.message}
            </div>
        `;
        showMessage(error.message, 'error');
    }
}
// Open edit modal
async function openEditModal(bookId) {
    try {
        const modal = document.getElementById('bookModal');
        const form = document.getElementById('bookForm');
        
        // Reset form and show loading state
        form.reset();
        modal.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = bookId;
        
        // Disable all fields while loading
        const fields = form.querySelectorAll('input, textarea');
        fields.forEach(field => {
            field.disabled = true;
            field.classList.add('opacity-50');
        });
        
        // Show loading state in submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.querySelector('#submitBtnText').textContent = 'Loading...';
        submitBtn.querySelector('#submitBtnSpinner').classList.remove('hidden');

        // Fetch book data
        const response = await makeRequest(`${API_BASE_URL}/admin/books/${bookId}`, 'GET', null, true);
        
        if (response.success && response.data) {
            const book = response.data;
            
            // Fill form with book data
            document.getElementById('title').value = book.title || '';
            document.getElementById('author').value = book.author || '';
            document.getElementById('isbn').value = book.isbn || '';
            document.getElementById('genre').value = book.genre || '';
            document.getElementById('description').value = book.description || '';
            document.getElementById('total_copies').value = book.total_copies || '';
            
            // Enable fields
            fields.forEach(field => {
                field.disabled = false;
                field.classList.remove('opacity-50');
            });
            
            // Update submit button
            submitBtn.disabled = false;
            submitBtn.querySelector('#submitBtnText').textContent = 'Update Book';
            submitBtn.querySelector('#submitBtnSpinner').classList.add('hidden');
        } else {
            throw new Error(response.message || 'Failed to load book data');
        }
    } catch (error) {
        showMessage(error.message, 'error');
        document.getElementById('bookModal').classList.add('hidden');
    }
}
// Delete book
async function deleteBook(bookId, event) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        return;
    }
    
    let deleteBtn;
    try {
        deleteBtn = event.target.closest('button');
        const originalContent = deleteBtn.innerHTML;
        
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Deleting...
            </span>
        `;

        // Get CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken
        };
        
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/books/${bookId}`, {
            method: 'DELETE',
            headers: headers,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete book');
        }
        
        console.log('Delete book response:', result);
        await loadBooks(currentPage, currentSearch);
        
    } catch (error) {
        console.error('Delete book error:', error);
        showMessage(error.message, 'error');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalContent;
        }
    }
}
// Setup book search
function setupBookSearch() {
    const searchInput = document.getElementById('bookSearch');
    
    const debouncedSearch = debounce(async (search) => {
        await loadBooks(1, search);
    }, 500);
    
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}
// Setup pagination
function setupPagination(elementId, meta, callback, ...args) {
    const pagination = document.getElementById(elementId);
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'px-3 py-1 mr-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50';
    prevButton.textContent = 'Previous';
    prevButton.disabled = meta.current_page === 1;
    prevButton.addEventListener('click', () => {
        callback(meta.current_page - 1, ...args);
    });
    pagination.appendChild(prevButton);
    
    // Page numbers
    const startPage = Math.max(1, meta.current_page - 2);
    const endPage = Math.min(meta.last_page, meta.current_page + 2);
    
    if (startPage > 1) {
        const firstPage = document.createElement('button');
        firstPage.className = 'px-3 py-1 mx-1 rounded-md';
        firstPage.textContent = '1';
        firstPage.addEventListener('click', () => {
            callback(1, ...args);
        });
        pagination.appendChild(firstPage);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-3 py-1';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `px-3 py-1 mx-1 rounded-md ${i === meta.current_page ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            callback(i, ...args);
        });
        pagination.appendChild(pageButton);
    }
    
    if (endPage < meta.last_page) {
        if (endPage < meta.last_page - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-3 py-1';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
        
        const lastPage = document.createElement('button');
        lastPage.className = 'px-3 py-1 mx-1 rounded-md';
        lastPage.textContent = meta.last_page;
        lastPage.addEventListener('click', () => {
            callback(meta.last_page, ...args);
        });
        pagination.appendChild(lastPage);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'px-3 py-1 ml-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50';
    nextButton.textContent = 'Next';
    nextButton.disabled = meta.current_page === meta.last_page;
    nextButton.addEventListener('click', () => {
        callback(meta.current_page + 1, ...args);
    });
    pagination.appendChild(nextButton);
}
// Dashboard functions
async function loadDashboardStats() {
    try {
        
        const response = await makeRequest(`${API_BASE_URL}/admin/dashboard-stats`, 'GET', null, true);
        const stats = response.data; // Make sure to access the data property
        
        // Update the stats cards
        document.getElementById('booksCount').textContent = stats.books_count || 0;
        document.getElementById('usersCount').textContent = stats.users_count || 0;
        document.getElementById('transactionsCount').textContent = stats.transactions_count || 0;
        document.getElementById('overdueCount').textContent = stats.overdue_count || 0;
        
        // Update recent transactions table
        const recentTransactions = document.getElementById('recentTransactions');
        recentTransactions.innerHTML = '';
        
        if (stats.recent_transactions && stats.recent_transactions.length > 0) {
            stats.recent_transactions.forEach(transaction => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 dark:hover:bg-dark-700';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${transaction.user_name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${transaction.book_title || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatDate(transaction.borrowed_date) || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatDate(transaction.due_date) || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full 
                            ${transaction.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                              transaction.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}">
                            ${transaction.status || 'N/A'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <a href="admin-transactions.html?id=${transaction.id}" class="action-btn btn-primary">
                            View
                        </a>
                    </td>
                `;
                recentTransactions.appendChild(row);
            });
        } else {
            recentTransactions.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No recent transactions found
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showMessage(error.message || 'Failed to load dashboard statistics', 'error');
        
        // Set default values if the request fails
        document.getElementById('booksCount').textContent = '0';
        document.getElementById('usersCount').textContent = '0';
        document.getElementById('transactionsCount').textContent = '0';
        document.getElementById('overdueCount').textContent = '0';
        
        const recentTransactions = document.getElementById('recentTransactions');
        recentTransactions.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    Failed to load transactions: ${error.message}
                </td>
            </tr>
        `;
    }
}
// User management functions
async function loadUsers(page = 1, search = '') {
    try {
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center">
                    <div class="flex justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    </div>
                </td>
            </tr>
        `;

        const url = `${API_BASE_URL}/admin/users?page=${page}&search=${encodeURIComponent(search)}`;
        const response = await makeRequest(url, 'GET', null, true);
        
        renderUsersTable(response.data);
        setupPagination('usersPagination', response.meta, loadUsers, search);
    } catch (error) {
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Failed to load users: ${error.message}
                </td>
            </tr>
        `;
        showMessage(error.message, 'error');
    }
}

function renderUsersTable(users) {
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = '';

    if (users.length === 0) {
        usersTable.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${user.name || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${user.email || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full 
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                    ${user.role || 'N/A'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap space-x-2">
                <button onclick="viewUser('${user.id}')" class="text-amber-600 hover:text-amber-800 dark:hover:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 px-3 py-1 rounded-md text-sm font-medium transition duration-200">
                    <i class="fas fa-eye mr-1"></i> View
                </button>
                <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-800 dark:hover:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-3 py-1 rounded-md text-sm font-medium transition duration-200">
                    <i class="fas fa-trash mr-1"></i> Delete
                </button>
            </td>
        `;
        usersTable.appendChild(row);
    });
}

// userview
async function viewUser(userId) {
    try {
        // Create and show modal with loading state
        const modalHtml = `
            <div id="userModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-800 dark:text-white">User Details</h3>
                        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('userModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Fetch user data
        const response = await makeRequest(`${API_BASE_URL}/admin/users/${userId}`, 'GET', null, true);
        const user = response.data;

        // Update modal with user data
        const modalContent = `
            <div class="space-y-4">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-20 h-20 rounded-full bg-amber-600 flex items-center justify-center text-white text-3xl font-bold">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <p class="mt-1 text-sm text-gray-900 dark:text-white">${user.name}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p class="mt-1 text-sm text-gray-900 dark:text-white">${user.email}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                    <p class="mt-1 text-sm text-gray-900 dark:text-white">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full 
                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                            ${user.role}
                        </span>
                    </p>
                </div>
                ${user.transactions && user.transactions.length > 0 ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recent Transactions</label>
                    <div class="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        ${user.transactions.slice(0, 3).map(transaction => `
                            <div class="p-2 border rounded dark:border-gray-700">
                                <p class="text-sm">${transaction.book?.title || 'Unknown Book'}</p>
                                <p class="text-xs text-gray-500">${formatDate(transaction.borrowed_date)} - ${transaction.status}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="mt-6 flex justify-end">
                <button onclick="closeModal()" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">
                    Close
                </button>
            </div>
        `;

        document.querySelector('#userModal .rounded-lg').querySelector('div:nth-child(2)').innerHTML = modalContent;

    } catch (error) {
        closeModal();
        showMessage(error.message || 'Failed to load user details', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.remove();
    }
}
function setupUserSearch() {
    const searchInput = document.getElementById('userSearch');
    
    const debouncedSearch = debounce(async (search) => {
        await loadUsers(1, search);
    }, 500);
    
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const deleteBtn = event.target.closest('button');
        const originalContent = deleteBtn.innerHTML;
        
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
            </div>
        `;

        const response = await makeRequest(`${API_BASE_URL}/admin/users/${userId}`, 'DELETE', null, true);
        
        if (response.success === false) {
            throw new Error(response.message || 'Failed to delete user');
        }

        console.log('Delete user response:', response);
        await loadUsers(currentPage, currentSearch);

    } catch (error) {
        showMessage(error.message || 'Failed to delete user', 'error');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalContent;
        }
    }
}
// Transaction management functions
async function loadTransactions(page = 1, status = '', search = '') {
    try {
        let url = `${API_BASE_URL}/admin/transactions?page=${page}`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await makeRequest(url, 'GET', null, true);
        const transactions = response.data;
        
        const tbody = document.getElementById('transactionsTable');
        tbody.innerHTML = '';
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const dueDate = new Date(transaction.due_date);
            const today = new Date();
            const isOverdue = transaction.status === 'borrowed' && dueDate < today;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="px-6 py-4">${transaction.user?.name || 'N/A'}</td>
                <td class="px-6 py-4">${transaction.book?.title || 'N/A'}</td>
                <td class="px-6 py-4">${formatDate(transaction.borrowed_date)}</td>
                <td class="px-6 py-4">${formatDate(transaction.due_date)}</td>
                <td class="px-6 py-4">${transaction.returned_date ? formatDate(transaction.returned_date) : '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${isOverdue ? 'bg-red-100 text-red-800' : 
                          transaction.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}">
                        ${isOverdue ? 'Overdue' : transaction.status}
                    </span>
                </td>
                <td class="px-6 py-4 space-x-2">
                    ${transaction.status === 'borrowed' ? 
                      `<button onclick="markAsReturned(${transaction.id})" class="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                        Mark Returned
                      </button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
        
            setupPagination('transactionsPagination', response.meta, (page) => {
            const status = document.getElementById('statusFilter').value;
            const search = document.getElementById('transactionSearch').value;
            loadTransactions(page, status, search);
        });
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}
function setupTransactionFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('transactionSearch');
    
    const applyFilters = () => {
        const status = statusFilter.value;
        const search = searchInput.value;
        loadTransactions(1, status, search);
    };
    
    statusFilter.addEventListener('change', applyFilters);
    
    const debouncedSearch = debounce(applyFilters, 500);
    searchInput.addEventListener('input', debouncedSearch);
}
async function markAsReturned(transactionId) {
    if (!confirm('Are you sure you want to mark this transaction as returned?')) return;
    
    try {
        const response = await makeRequest(
            `${API_BASE_URL}/admin/transactions/transactions/${transactionId}/mark-returned`,
            'POST',
            null,
            true
        );
        
        console.log('Mark returned response:', response);
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('transactionSearch').value;
        await loadTransactions(1, status, search);
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

 // Make functions available in global scope for HTML onclick attributes
window.viewBookDetails = viewBookDetails;
window.openEditModal = openEditModal;
window.deleteBook = deleteBook;
window.deleteUser = deleteUser;
window.markAsReturned = markAsReturned;
window.viewUser = viewUser;
window.closeModal = closeModal;