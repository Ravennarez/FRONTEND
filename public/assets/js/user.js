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

// Load dashboard stats if on dashboard
if (document.getElementById('totalBorrowed')) {
    await loadDashboardStats();
}

// Load dashboard stats if on dashboard
if (document.getElementById('dashboardStats')) {
    await loadDashboardStats();
}
if (document.getElementById('transactionsTable')) {
    // Initialize with empty status to load all transactions
    await loadUserTransactions(1, '');
    setupUserTransactionFilters();
}
// Load appropriate content based on page
if (document.getElementById('booksList')) {
    await loadBooks();
    setupBookSearch();
}


// Dashboard functions
async function loadDashboardStats() {
    try {
        // Load user data first
        const user = await loadUserData();
        if (user) {
            document.getElementById('welcomeName').textContent = user.name;
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userEmail').textContent = user.email;
        }

        // Update avatar with first letter
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.textContent = user.name.charAt(0).toUpperCase();
            userAvatar.innerHTML = ''; // Clear any existing content
            userAvatar.textContent = user.name.charAt(0).toUpperCase();
        }
    

        console.log("Loading dashboard stats..."); // Debug log
        

        // 1. Load user stats
        const statsResponse = await makeRequest(`${API_BASE_URL}/transactions/stats`, 'GET', null, true);
        console.log("Stats response:", statsResponse); // Debug log
        
        if (!statsResponse || !statsResponse.data) {
            throw new Error('Invalid stats response from server');
        }

        const stats = statsResponse.data;
        console.log("Stats data:", stats); // Debug log
        
        // Update stats cards
        document.getElementById('totalBorrowed').textContent = stats.total_borrowed || 0;
        document.getElementById('currentlyBorrowed').textContent = stats.currently_borrowed || 0;
        document.getElementById('overdueBooks').textContent = stats.overdue_books || 0;
         
        // 2. Load active loans
        const loansResponse = await makeRequest(`${API_BASE_URL}/transactions?status=borrowed`, 'GET', null, true);
        console.log("Loans response:", loansResponse); // Debug log
        
        if (!loansResponse || !Array.isArray(loansResponse.data)) {
            throw new Error('Invalid loans response from server');
        }

        const loans = loansResponse.data || [];
        console.log("Loans data:", loans); // Debug loan data
        
        const activeLoansTable = document.getElementById('activeLoansTable');
        activeLoansTable.innerHTML = '';
        loadDashboardStats();
        if (loans.length === 0) {
            console.log("No loans found in response"); // Debug log
            activeLoansTable.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No active loans found
                    </td>
                </tr>
            `;
        } else {
            console.log(`Found ${loans.length} loans`); // Debug log
            const today = new Date();
            
            loans.forEach(loan => {
                console.log("Processing loan:", loan); // Debug each loan
                
                const dueDate = new Date(loan.due_date);
                const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = dueDate < today;
                
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 dark:hover:bg-dark-700';
                row.dataset.transactionId = loan.id; 
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${loan.book?.title || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${loan.book?.author || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatDate(loan.borrowed_date)}</td>
                    <td class="px-6 py-4 whitespace-nowrap ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}">
                        ${formatDate(loan.due_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap ${isOverdue ? 'text-red-600 dark:text-red-400' : (daysLeft <= 3 ? 'text-yellow-600 dark:text-yellow-400' : '')}">
                        ${isOverdue ? 
                          `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} overdue` : 
                          `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full 
                            ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}">
                            ${isOverdue ? 'Overdue' : 'Borrowed'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                   <button onclick="returnBook(${loan.id})" class="px-3 py-1 ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} text-white rounded-md text-sm">
                 <i class="fas fa-undo mr-1"></i> ${isOverdue ? 'Return Now' : 'Return'}
    </td>
`;
                activeLoansTable.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showMessage('Error loading dashboard data: ' + error.message, 'error');
        
        // Set fallback values
        document.getElementById('totalBorrowed').textContent = '0';
        document.getElementById('currentlyBorrowed').textContent = '0';
        document.getElementById('overdueBooks').textContent = '0';
        
        const activeLoansTable = document.getElementById('activeLoansTable');
        activeLoansTable.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-red-500">
                    Error loading active loans: ${error.message}
                </td>
            </tr>
        `;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    
    initCommonUI();
    
    const user = await loadUserData();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.textContent = user.name.charAt(0).toUpperCase();
    }
    
    // Load appropriate content based on page
    if (document.getElementById('booksList')) {
        await loadBooks();
        setupBookSearch();
    }
    
    if (document.getElementById('transactionsTable')) {
        await loadUserTransactions();
        setupUserTransactionFilters();
    }
    
    if (document.getElementById('dashboardStats')) {
        await loadDashboardStats();
    }
    
    // Set user information consistently
    document.getElementById('welcomeName').textContent = user.name;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
});

async function loadBooks(page = 1, search = '', genre = '', availability = '') {
    try {
        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        const booksList = document.getElementById('booksList');
        const emptyState = document.getElementById('emptyState');
        const pagination = document.getElementById('booksPagination');
        
        loadingIndicator.classList.remove('hidden');
        booksList.classList.add('hidden');
        emptyState.classList.add('hidden');
        if (pagination) pagination.classList.add('hidden');
        
        // Build query parameters
        let url = `${API_BASE_URL}/admin/books?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (genre) url += `&genre=${encodeURIComponent(genre)}`;
        if (availability === 'available') url += '&available=true';
        
        const response = await makeRequest(url, 'GET', null, true);
        const books = response.data;
        const meta = response.meta;
        
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        // Clear existing books
        booksList.innerHTML = '';
        
        if (books.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        // Populate books
        books.forEach(book => {
// In the loadBooks function, update the details button creation:
const card = document.createElement('div');
card.className = 'book-card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700';
card.dataset.id = book.id;
card.innerHTML = `
    <div class="h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        ${book.cover_image ? 
            `<img src="${book.cover_image}" alt="${book.title}" class="h-full w-full object-contain">` : 
            `<i class="fas fa-book-open text-5xl text-gray-400"></i>`
        }
    </div>
    <div class="p-4">
        <h3 class="font-bold text-lg mb-1 truncate">${book.title}</h3>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-1"><span class="font-semibold">Author:</span> ${book.author}</p>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-1"><span class="font-semibold">Genre:</span> ${book.genre}</p>
        <div class="flex justify-between items-center mt-3">
            <span class="availability-status text-sm ${book.available_copies > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                ${book.available_copies > 0 ? 'Available' : 'Out of stock'}
            </span>
            <span class="available-count text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                ${book.available_copies}/${book.total_copies}
            </span>
        </div>
        <div class="mt-4 flex justify-between gap-2">
            <button class="details-btn text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded flex-1">
                Details
            </button>
            <button class="borrow-btn text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded flex-1"
                ${book.available_copies < 1 ? 'disabled' : ''}>
                Borrow
            </button>
        </div>
    </div>
`;

// Add event listeners
const detailsBtn = card.querySelector('.details-btn');
detailsBtn.addEventListener('click', () => showBookDetails(book));

const borrowBtn = card.querySelector('.borrow-btn');
borrowBtn.addEventListener('click', () => borrowBook(book.id, card));

booksList.appendChild(card);

        });
        
        booksList.classList.remove('hidden');
        if (pagination) {
            pagination.classList.remove('hidden');
            setupPagination('booksPagination', meta, loadBooks, search, genre, availability);
        }
        
        // If this is the first load, populate genres filter
        if (page === 1 && document.getElementById('genreFilter') && document.getElementById('genreFilter').options.length <= 1) {
            const genres = [...new Set(books.map(book => book.genre).filter(Boolean))];
            const genreFilter = document.getElementById('genreFilter');
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
        }
    } catch (error) {
        showMessage(error.message, 'error');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }
}

function setupBookSearch() {
    const searchInput = document.getElementById('bookSearch');
    const searchButton = document.getElementById('bookSearchBtn');
    const genreFilter = document.getElementById('genreFilter');
    const availabilityFilter = document.getElementById('availabilityFilter');
    
     const performSearch = () => {
        const search = searchInput.value;
        const genre = genreFilter.value;
        const availability = availabilityFilter.value;
        console.log('Filter values:', {search, genre, availability}); // Debugging line
        loadBooks(1, search, genre, availability);
    };
    
    // Debounce the search input
    searchInput.addEventListener('input', debounce(() => {
        performSearch();
    }, 500));
    
    // Button click handler
    searchButton.addEventListener('click', performSearch);
    
    // Filter change handlers
    genreFilter.addEventListener('change', performSearch);
    availabilityFilter.addEventListener('change', performSearch);
}

function setupPagination(elementId, meta, callback, ...args) {
    const pagination = document.getElementById(elementId);
    if (!pagination || !meta) return;
    
    pagination.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = meta.current_page === 1;
    prevButton.addEventListener('click', () => {
        if (meta.current_page > 1) {
            callback(meta.current_page - 1, ...args);
        }
    });
    pagination.appendChild(prevButton);
    
    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, meta.current_page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(meta.last_page, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.textContent = '1';
        firstPageButton.className = 'pagination-btn';
        firstPageButton.addEventListener('click', () => {
            callback(1, ...args);
        });
        pagination.appendChild(firstPageButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2';
            pagination.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === meta.current_page ? 'pagination-btn active' : 'pagination-btn';
        pageButton.addEventListener('click', () => {
            callback(i, ...args);
        });
        pagination.appendChild(pageButton);
    }
    
    if (endPage < meta.last_page) {
        if (endPage < meta.last_page - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2';
            pagination.appendChild(ellipsis);
        }
        
        const lastPageButton = document.createElement('button');
        lastPageButton.textContent = meta.last_page;
        lastPageButton.className = 'pagination-btn';
        lastPageButton.addEventListener('click', () => {
            callback(meta.last_page, ...args);
        });
        pagination.appendChild(lastPageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = meta.current_page === meta.last_page;
    nextButton.addEventListener('click', () => {
        if (meta.current_page < meta.last_page) {
            callback(meta.current_page + 1, ...args);
        }
    });
    pagination.appendChild(nextButton);
}

// Make functions available in global scope for HTML onclick attributes
// In the borrowBook function, modify it to check if the book was the last available copy
window.borrowBook = async function(bookId, cardElement = null) {
    try {
        if (!confirm('Are you sure you want to borrow this book?')) return;

        // Show loading state
        const originalText = cardElement?.querySelector('.borrow-btn')?.textContent || 'Borrow';
        if (cardElement) {
            const btn = cardElement.querySelector('.borrow-btn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Processing...';
                btn.disabled = true;
            }
        }

        const response = await makeRequest(
            `${API_BASE_URL}/books/${bookId}/borrow`, 
            'POST', 
            null, 
            true
        );

        // Check if this was the last available copy
        const wasLastCopy = cardElement ? 
            parseInt(cardElement.querySelector('.available-count').textContent.split('/')[0]) === 1 : 
            false;

        // Update UI immediately
        if (cardElement) {
            updateBookAvailabilityUI(cardElement, -1);
            
            const btn = cardElement.querySelector('.borrow-btn');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = cardElement.querySelector('.available-count').textContent.split('/')[0] <= 0;
            }
        }

        // If this was the last copy, refresh the page to update all book listings
        if (wasLastCopy) {
            // Delay slightly to show the success message
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            // Refresh transactions and dashboard without full page reload
            if (document.getElementById('transactionsTable')) {
                const statusFilter = document.getElementById('statusFilter');
                const currentStatus = statusFilter ? statusFilter.value : '';
                await loadUserTransactions(1, currentStatus);
            }

            if (document.getElementById('dashboardStats')) {
                await loadDashboardStats();
            }

            // Update modal if open
            const modal = document.getElementById('bookDetailsModal');
            if (modal && !modal.classList.contains('hidden')) {
                const modalBookId = modal.dataset.bookId;
                if (modalBookId == bookId) {
                    updateModalAvailabilityUI(modal, -1);
                }
            }
        }

    } catch (error) {
        console.error('Borrow error:', error);
        showMessage(`Error: ${error.message}`, 'error');
        
        if (cardElement) {
            const btn = cardElement.querySelector('.borrow-btn');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }
};

// Helper function to update card availability UI
function updateBookAvailabilityUI(cardElement, change) {
    const availabilityElement = cardElement.querySelector('.availability-status');
    const countElement = cardElement.querySelector('.available-count');
    const borrowButton = cardElement.querySelector('.borrow-btn');
    
    if (countElement) {
        const [currentStr, totalStr] = countElement.textContent.split('/');
        let current = parseInt(currentStr);
        const total = parseInt(totalStr);
        
        current += change;
        current = Math.max(0, current); // Ensure it doesn't go below 0
        
        countElement.textContent = `${current}/${total}`;
        
        if (availabilityElement) {
            if (current === 0) {
                availabilityElement.textContent = 'Out of stock';
                availabilityElement.classList.remove('text-green-600', 'dark:text-green-400');
                availabilityElement.classList.add('text-red-600', 'dark:text-red-400');
            } else {
                availabilityElement.textContent = 'Available';
                availabilityElement.classList.add('text-green-600', 'dark:text-green-400');
                availabilityElement.classList.remove('text-red-600', 'dark:text-red-400');
            }
        }
        
        if (borrowButton) {
            borrowButton.disabled = current <= 0;
            borrowButton.classList.toggle('opacity-50', current <= 0);
            borrowButton.classList.toggle('cursor-not-allowed', current <= 0);
        }
    }
}
// Helper function to update modal availability UI
function updateModalAvailabilityUI(modal, change) {
    const modalAvailability = modal.querySelector('#modalBookAvailability');
    const modalBorrowBtn = modal.querySelector('#borrowBtn');
    
    if (modalAvailability) {
        const text = modalAvailability.textContent;
        const [currentStr, rest] = text.split(' of ');
        const current = parseInt(currentStr) + change;
        const total = rest.split(' ')[0];
        
        modalAvailability.textContent = `${Math.max(0, current)} of ${total} available`;
        
        if (modalBorrowBtn) {
            modalBorrowBtn.disabled = current <= 0;
            modalBorrowBtn.classList.toggle('opacity-50', current <= 0);
            modalBorrowBtn.classList.toggle('cursor-not-allowed', current <= 0);
        }
    }
}


async function loadUserTransactions(page = 1, status = '') {
    try {
        // Show loading state
        const tbody = document.getElementById('transactionsTable');
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">Loading transactions...</td></tr>';

        // Get current user
        const user = await loadUserData();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Build API URL with pagination and filters
        let url = `${API_BASE_URL}/transactions?page=${page}`;
        if (status) url += `&status=${status}`;
        
        // Fetch transactions
        const response = await makeRequest(url, 'GET', null, true);

        // Validate response structure
        if (!response || !response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid transactions data structure from server');
        }

        // Get transactions array
        const transactions = response.data;
        const meta = response.meta;

        // Clear and populate table
        tbody.innerHTML = '';
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render each transaction
        transactions.forEach(transaction => {
            const dueDate = new Date(transaction.due_date);
            const today = new Date();
            const isOverdue = transaction.status === 'borrowed' && dueDate < today;
            const overdueDays = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.dataset.transactionId = transaction.id;
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${transaction.book?.title || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${formatDate(transaction.borrowed_date)}</td>
                <td class="px-6 py-4 whitespace-nowrap ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}">
                    ${formatDate(transaction.due_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.returned_date ? formatDate(transaction.returned_date) : '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                          transaction.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}">
                        ${isOverdue ? 'Overdue' : transaction.status}
                        ${isOverdue ? ` (${overdueDays} days)` : ''}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${transaction.status === 'borrowed' ? 
                      `<button onclick="returnBook(${transaction.id})" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm">
                        <i class="fas fa-undo mr-1"></i> Return
                      </button>` : 
                      '<span class="text-gray-500 dark:text-gray-400">Completed</span>'}
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Setup pagination if meta data exists
        if (meta) {
            setupPagination('transactionsPagination', meta, (newPage) => {
                const status = document.getElementById('statusFilter').value;
                loadUserTransactions(newPage, status);
            });
        }
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        const tbody = document.getElementById('transactionsTable');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    Error loading transactions: ${error.message}
                </td>
            </tr>
        `;
    }

}

// Make sure this is available globally
window.returnBook = async function(transactionId) {
    if (!confirm('Are you sure you want to return this book?')) return;
    
    try {
        const response = await makeRequest(
            `${API_BASE_URL}/transactions/${transactionId}/return`,
            'POST', 
            null,
            true
        );
        
        //showMessage('Book returned successfully!', 'success');
        console.log('Return response:', response);
        // Refresh transactions with current filter
        const statusFilter = document.getElementById('statusFilter');
        const currentStatus = statusFilter ? statusFilter.value : '';
        await loadUserTransactions(1, currentStatus);
        
        // Also refresh dashboard if on dashboard
        if (document.getElementById('dashboardStats')) {
            await loadDashboardStats();
        }
        
    } catch (error) {
        console.error('Error returning book:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
};

function setupUserTransactionFilters() {
    const statusFilter = document.getElementById('statusFilter');
    
    if (!statusFilter) return;

    // Load initial transactions with current filter value
    const initialStatus = statusFilter.value;
    loadUserTransactions(1, initialStatus);

    // Handle filter changes
    statusFilter.addEventListener('change', debounce(() => {
        const status = statusFilter.value;
        loadUserTransactions(1, status);
    }, 300));
}


// Update DOMContentLoaded event
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    
    initCommonUI();
    
    const user = await loadUserData();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Set user avatar
const userAvatar = document.getElementById('userAvatar');
if (userAvatar) {
    userAvatar.textContent = user.name.charAt(0).toUpperCase();
}
    
    // Load appropriate content based on page
    if (document.getElementById('booksList')) {
        await loadBooks();
        setupBookSearch();
    }
    
    if (document.getElementById('transactionsTable')) {
        await loadUserTransactions();
    }
    
    if (document.getElementById('dashboardStats')) {
        await loadDashboardStats();
    }

    


});

// Helper function to show book details
window.showBookDetails = function(book) {
    const modal = document.getElementById('bookDetailsModal');
    if (!modal) return;

    // Store book ID in modal
    modal.dataset.bookId = book.id;
    
    // Populate modal with book data
    modal.querySelector('#modalBookTitle').textContent = book.title;
    modal.querySelector('#modalBookAuthor').textContent = book.author;
    modal.querySelector('#modalBookGenre').textContent = book.genre;
    modal.querySelector('#modalBookIsbn').textContent = book.isbn;
    modal.querySelector('#modalBookAvailability').textContent = 
        `${book.available_copies} of ${book.total_copies} available`;
    modal.querySelector('#modalBookDescription').textContent = 
        book.description || 'No description available.';
    
    const coverImg = modal.querySelector('#modalBookCover');
    if (book.cover_image) {
        coverImg.src = book.cover_image;
        coverImg.alt = `Cover of ${book.title}`;
    } else {
        coverImg.src = '../assets/img/Books.jpg';
        coverImg.alt = 'Default book cover';
    }
    
    const borrowBtn = modal.querySelector('#borrowBtn');
    if (borrowBtn) {
        borrowBtn.onclick = () => {
            const cardElement = document.querySelector(`.book-card[data-id="${book.id}"]`);
            window.borrowBook(book.id, cardElement);
        };
        borrowBtn.disabled = book.available_copies < 1;
        borrowBtn.classList.toggle('opacity-50', book.available_copies < 1);
        borrowBtn.classList.toggle('cursor-not-allowed', book.available_copies < 1);
    }
    
    // Add event listeners for close buttons
    modal.querySelector('#closeModal').onclick = () => modal.classList.add('hidden');
    modal.querySelector('#closeModalBtn').onclick = () => modal.classList.add('hidden');
    
    // Show modal
    modal.classList.remove('hidden');
};





//  available globally
window.returnBook = returnBook;
