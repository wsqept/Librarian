import { renderFilteredList } from './books.js';

// State
let allBooks = [];
let statusMap = new Map();

export function initSearch(books, map) {
  allBooks = books;
  statusMap = map;
}

export function renderSearchBar(container) {
  // Extract unique publishers and authors from data
  const publishers = [...new Set(allBooks.map((b) => b.publisher).filter(Boolean))].sort();
  const authors = [...new Set(allBooks.flatMap((b) => b.authors || []))].sort();

  container.innerHTML = `
    <div class="search-bar">
      <input type="text" id="search-input" placeholder="搜索书名…" />
      <select id="filter-publisher">
        <option value="">全部出版社</option>
        ${publishers.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
      </select>
      <select id="filter-author">
        <option value="">全部作者</option>
        ${authors.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('')}
      </select>
      <button class="btn" id="btn-clear-filters">清除筛选</button>
    </div>
  `;

  const searchInput = document.getElementById('search-input');
  const publisherSelect = document.getElementById('filter-publisher');
  const authorSelect = document.getElementById('filter-author');
  const clearBtn = document.getElementById('btn-clear-filters');

  searchInput.addEventListener('input', applyFilters);
  publisherSelect.addEventListener('change', applyFilters);
  authorSelect.addEventListener('change', applyFilters);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    publisherSelect.value = '';
    authorSelect.value = '';
    applyFilters();
  });
}

function applyFilters() {
  const query = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const publisher = document.getElementById('filter-publisher')?.value || '';
  const author = document.getElementById('filter-author')?.value || '';

  let filtered = allBooks;

  if (query) {
    filtered = search(filtered, query);
  }
  if (publisher) {
    filtered = filterByPublisher(filtered, publisher);
  }
  if (author) {
    filtered = filterByAuthor(filtered, author);
  }

  renderFilteredList(document.getElementById('app'), filtered, statusMap);
}

// Pure functions — testable
export function search(books, query) {
  const q = query.toLowerCase();
  return books.filter((b) => b.title.toLowerCase().includes(q));
}

export function filterByPublisher(books, publisher) {
  return books.filter((b) => b.publisher === publisher);
}

export function filterByAuthor(books, author) {
  return books.filter((b) => (b.authors || []).includes(author));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
