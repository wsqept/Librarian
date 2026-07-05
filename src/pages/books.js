import { loadBooks, loadCurrentBorrowStatus } from '../lib/data.js';
import { navigate } from '../lib/router.js';
import { initSearch, renderSearchBar } from './search.js';

export async function renderBookList(container) {
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>加载馆藏中…</p>
    </div>
  `;

  try {
    const books = await loadBooks();

    if (!books || books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 3rem; margin-bottom: 1rem;"></p>
          <h2>图书馆暂无藏书</h2>
          <p style="color: var(--color-text-muted);">请联系管理员添加图书</p>
        </div>
      `;
      return;
    }

    const statusMap = new Map();
    await Promise.all(
      books.map(async (book) => {
        try {
          const status = await loadCurrentBorrowStatus(book.isbn);
          statusMap.set(book.isbn, status);
        } catch {
          statusMap.set(book.isbn, null);
        }
      })
    );

    const cards = books
      .map((book) => renderBookCard(book, statusMap.get(book.isbn)))
      .join('');

    container.innerHTML = `
      <h1 class="page-title">全部馆藏 (${books.length})</h1>
      <div id="search-area"></div>
      <div class="book-grid">${cards}</div>
    `;

    // Init search bar
    initSearch(books, statusMap);
    renderSearchBar(document.getElementById('search-area'));

    // Attach click listeners
    container.querySelectorAll('.book-card').forEach((card) => {
      card.addEventListener('click', () => {
        navigate(`#/book/${card.dataset.isbn}`);
      });
    });
  } catch (err) {
    console.error('Failed to load books:', err);
    container.innerHTML = `
      <div class="error-state">
        <p>加载失败：${err.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">重试</button>
      </div>
    `;
  }
}

function renderBookCard(book, borrowStatus) {
  const cover = book.cover_url
    ? `<img class="book-card-cover" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.querySelector('.book-card-cover-placeholder')?.remove(); this.outerHTML='<div class=\\'book-card-cover-placeholder\\'></div>'" />`
    : '<div class="book-card-cover-placeholder"></div>';

  const statusLabel = getStatusLabel(borrowStatus);
  const statusClass = getStatusClass(borrowStatus);

  const authors = book.authors ? book.authors.join('、') : '未知作者';
  const publisher = book.publisher || '未知出版社';

  return `
    <div class="book-card" data-isbn="${escapeHtml(book.isbn)}">
      ${cover}
      <div class="book-card-body">
        <div class="book-card-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
        <div class="book-card-meta">${escapeHtml(authors)} · ${escapeHtml(publisher)}</div>
        <span class="status-badge status-${statusClass}">${statusLabel}</span>
      </div>
    </div>
  `;
}

function getStatusLabel(record) {
  if (!record) return '可借';
  switch (record.status) {
    case 'borrow_requested': return '待确认借出';
    case 'borrowed': return `已借出 · ${record.member_name}`;
    case 'return_requested': return '待确认归还';
    default: return '可借';
  }
}

function getStatusClass(record) {
  if (!record) return 'available';
  switch (record.status) {
    case 'borrow_requested':
    case 'return_requested':
      return 'borrow-requested';
    case 'borrowed': return 'borrowed';
    default: return 'available';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Called by search/filter module later to re-render list with filtered data
export function renderFilteredList(container, books, statusMap) {
  if (books.length === 0) {
    document.querySelector('.book-grid').innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <p style="font-size: 2rem; margin-bottom: 0.5rem;"></p>
        <p>未找到匹配的图书</p>
      </div>
    `;
    return;
  }

  const cards = books
    .map((book) => {
      const status = statusMap.get(book.isbn) || null;
      return renderBookCard(book, status);
    })
    .join('');

  const grid = document.querySelector('.book-grid');
  if (grid) {
    grid.innerHTML = cards;
    grid.querySelectorAll('.book-card').forEach((card) => {
      card.addEventListener('click', () => {
        navigate(`#/book/${card.dataset.isbn}`);
      });
    });
  }

  const title = document.querySelector('.page-title');
  if (title) {
    title.textContent = `全部馆藏 (${books.length})`;
  }
}
