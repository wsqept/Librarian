import { saveBook, loadBook } from '../lib/data.js';
import { navigate } from '../lib/router.js';
import { isAuthenticated } from '../lib/auth.js';
import { showToast } from '../lib/state.js';

export async function renderAddBookPage(container, editIsbn = null) {
  const authed = await isAuthenticated().catch(() => false);
  if (!authed) {
    container.innerHTML = `
      <div class="error-state">
        <p>请先<a href="#/login">登录</a></p>
      </div>
    `;
    return;
  }

  const isEdit = !!editIsbn;
  let book = null;

  if (isEdit) {
    try {
      book = await loadBook(editIsbn);
      if (!book) {
        container.innerHTML = `<div class="error-state"><p>图书不存在</p><a href="#/" class="btn btn-primary">返回</a></div>`;
        return;
      }
    } catch (err) {
      container.innerHTML = `<div class="error-state"><p>加载失败：${err.message}</p></div>`;
      return;
    }
  }

  container.innerHTML = `
    <a href="${isEdit ? `#/book/${editIsbn}` : '#/'}" class="back-link">← 返回</a>
    <h1 class="page-title">${isEdit ? '编辑图书' : '添加图书'}</h1>
    <form id="book-form" style="max-width:600px;background:var(--color-surface);padding:1.5rem;border:1px solid var(--color-border);border-radius:var(--radius);box-shadow:var(--shadow);">
      <div class="form-group">
        <label for="book-isbn">ISBN *</label>
        <input type="text" id="book-isbn" value="${escapeHtml(book?.isbn || '')}" placeholder="978-xxx" ${isEdit ? 'readonly' : ''} required />
      </div>
      <div class="form-group">
        <label for="book-title">书名 *</label>
        <input type="text" id="book-title" value="${escapeHtml(book?.title || '')}" required />
      </div>
      <div class="form-group">
        <label for="book-authors">作者（逗号分隔）</label>
        <input type="text" id="book-authors" value="${escapeHtml((book?.authors || []).join(', '))}" />
      </div>
      <div class="form-group">
        <label for="book-publisher">出版社</label>
        <input type="text" id="book-publisher" value="${escapeHtml(book?.publisher || '')}" />
      </div>
      <div class="form-group">
        <label for="book-year">出版年份</label>
        <input type="number" id="book-year" value="${book?.publish_year || ''}" min="1000" max="2099" />
      </div>
      <div class="form-group">
        <label for="book-tags">标签（逗号分隔）</label>
        <input type="text" id="book-tags" value="${escapeHtml((book?.tags || []).join(', '))}" />
      </div>
      <div class="form-group">
        <label for="book-cover">封面 URL</label>
        <input type="url" id="book-cover" value="${escapeHtml(book?.cover_url || '')}" placeholder="https://..." />
      </div>
      <div id="form-error" style="color:var(--color-danger);font-size:0.875rem;margin-bottom:0.75rem;display:none;"></div>
      <button type="submit" class="btn btn-primary" style="width:100%;">${isEdit ? '保存修改' : '添加图书'}</button>
    </form>
  `;

  // Attach listeners
  attachFormListeners(isEdit, editIsbn);
}

function attachFormListeners(isEdit, editIsbn) {
  const form = document.getElementById('book-form');
  const errorEl = document.getElementById('form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isbn = document.getElementById('book-isbn').value.trim();
    const title = document.getElementById('book-title').value.trim();
    const authorsStr = document.getElementById('book-authors').value.trim();
    const publisher = document.getElementById('book-publisher').value.trim();
    const year = parseInt(document.getElementById('book-year').value) || null;
    const tagsStr = document.getElementById('book-tags').value.trim();
    const coverUrl = document.getElementById('book-cover').value.trim();

    // Validate
    if (!isbn) {
      showError(errorEl, '请输入 ISBN');
      return;
    }
    if (!title) {
      showError(errorEl, '请输入书名');
      return;
    }

    const authors = authorsStr ? authorsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const tags = tagsStr ? tagsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const bookData = {
      isbn,
      title,
      authors,
      publisher: publisher || null,
      publish_year: year,
      tags,
      cover_url: coverUrl || null,
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '提交中…';
    errorEl.style.display = 'none';

    try {
      if (isEdit) {
        const { updateBook } = await import('../lib/data.js');
        await updateBook(editIsbn, bookData);
        showToast('图书已更新');
        navigate(`#/book/${editIsbn}`);
      } else {
        await saveBook(bookData);
        showToast('图书已添加');
        navigate(`#/book/${isbn}`);
      }
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('duplicate')) {
        showError(errorEl, '该 ISBN 已存在');
      } else {
        showError(errorEl, err.message || '提交失败');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = isEdit ? '保存修改' : '添加图书';
    }
  });
}

function showError(el, message) {
  el.textContent = message;
  el.style.display = 'block';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
