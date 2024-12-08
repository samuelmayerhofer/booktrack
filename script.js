// Initialize books array
const books = [];

class Book {
    constructor(title, author, currentPage, targetPage = null, targetDate = null) {
        this.title = title;
        this.author = author;
        this.currentPage = currentPage;
        this.coverUrl = null;
        this.totalPages = 0;  // Initialize to 0 instead of null
        this.publishYear = null;
        this.publisher = null;
        this.targetPage = targetPage;
        this.targetDate = targetDate;
        this.isbn = null;
        this.description = null;
        this.categories = [];
    }

    getProgress() {
        return (this.currentPage / this.totalPages) * 100;
    }

    getPagesPerDay() {
        if (!this.targetPage || !this.targetDate) return null;
        const today = new Date();
        const target = new Date(this.targetDate);
        const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) return null;
        return Math.ceil((this.targetPage - this.currentPage) / daysLeft);
    }
}

async function fetchBookData(title, author) {
    try {
        const query = `${title} ${author}`.replace(/\s+/g, '+');
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
        const data = await response.json();
        
        if (!data.items || !data.items[0]) {
            throw new Error('No book data found');
        }

        const book = data.items[0].volumeInfo;
        const imageLinks = book.imageLinks || {};
        
        return {
            coverUrl: imageLinks.thumbnail || 'https://via.placeholder.com/120x180?text=No+Cover',
            totalPages: book.pageCount || 0,
            publishYear: book.publishedDate ? new Date(book.publishedDate).getFullYear() : null,
            publisher: book.publisher || null,
            isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || 
                  book.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || null,
            description: book.description || null,
            categories: book.categories || []
        };
    } catch (error) {
        console.error('Error fetching book data:', error);
        return {
            coverUrl: 'https://via.placeholder.com/120x180?text=No+Cover',
            totalPages: 0,
            publishYear: null,
            publisher: null,
            isbn: null,
            description: null,
            categories: []
        };
    }
}

document.getElementById('book-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const currentPage = parseInt(document.getElementById('currentPage').value);
    const targetPage = parseInt(document.getElementById('targetPage').value) || null;
    const targetDate = document.getElementById('targetDate').value || null;

    if (!title || !author || isNaN(currentPage)) {
        alert('Please fill in all fields with valid values');
        return;
    }

    const newBook = new Book(title, author, currentPage, targetPage, targetDate);
    
    try {
        const bookData = await fetchBookData(title, author);
        Object.assign(newBook, bookData);
        
        if (newBook.totalPages && currentPage > newBook.totalPages) {
            alert('Current page cannot be greater than total pages');
            return;
        }

        books.push(newBook);
        displayBooks();
        this.reset();
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Error adding book. Please try again.');
    }
});

function getTotalPages() {
    return books.reduce((total, book) => {
        return {
            read: total.read + (book.currentPage || 0),
            total: total.total + (book.totalPages || 0)  // Will now always have a value
        };
    }, { read: 0, total: 0 });
}

function displayBooks() {
    const container = document.getElementById('books-container');
    container.innerHTML = '';

    const pageStats = getTotalPages();
    container.innerHTML = `
        <div class="total-pages">
            <p><strong>Total Pages Read:</strong> ${pageStats.read} of ${pageStats.total}</p>
        </div>
    `;

    books.forEach((book, index) => {
        const progress = book.totalPages ? book.getProgress() : 0;
        const pagesPerDay = book.getPagesPerDay();
        const bookElement = `
            <div class="book-card">
                <div style="display: flex; padding: 1.5rem; gap: 1.5rem;">
                    <img class="book-cover" src="${book.coverUrl}" alt="${book.title} cover">
                    <div class="book-info">
                        <h3>${book.title}</h3>
                        <p><strong>By</strong> ${book.author}</p>
                        <p><strong>Progress:</strong> ${book.currentPage} of ${book.totalPages || '?'} pages</p>
                        ${book.publishYear ? `<p><strong>Published:</strong> ${book.publishYear}</p>` : ''}
                        ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
                        ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                        ${book.categories.length ? `<p><strong>Categories:</strong> ${book.categories.join(', ')}</p>` : ''}
                        ${book.targetPage ? `<p><strong>Target:</strong> ${book.targetPage} pages` : ''}
                        ${book.targetDate ? ` by ${new Date(book.targetDate).toLocaleDateString()}</p>` : '</p>'}
                        ${pagesPerDay ? `<p><strong>Daily Goal:</strong> ${pagesPerDay} pages</p>` : ''}
                        ${book.description ? `<p class="book-description"><strong>Description:</strong> ${book.description}</p>` : ''}
                        <div class="progress-bar">
                            <div class="progress" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += bookElement;
    });
}

function convertToCSV() {
    const headers = ['Title', 'Author', 'Current Page', 'Total Pages', 'Target Page', 'Target Date', 'Publisher', 'Publish Year', 'ISBN', 'Categories'];
    const rows = books.map(book => [
        book.title,
        book.author,
        book.currentPage,
        book.totalPages,
        book.targetPage || '',
        book.targetDate || '',
        book.publisher || '',
        book.publishYear || '',
        book.isbn || '',
        book.categories.join('; ') || ''
    ]);
    
    const csvContent = [
        headers,
        ...rows
    ].map(row => row.map(cell => 
        `"${String(cell).replace(/"/g, '""')}"`
    ).join(',')).join('\n');
    
    return csvContent;
}

function downloadCSV() {
    const csv = convertToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'reading-list.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('download-csv').addEventListener('click', downloadCSV);