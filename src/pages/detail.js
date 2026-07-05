import { loadBook, loadCurrentBorrowStatus, loadBorrowRecords } from '../lib/data.js';
import { navigate } from '../lib/router.js';
import { isAuthenticated } from '../lib/auth.js';
import { getAuthState } from '../lib/state.js';

export async function renderBookDetail(container, isbn) {
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>加载图书详情…</p>
    </div>
  `;

  try {
    const book = await loadBook(isbn);

    if (!book) {
      container.innerHTML = `
        <div class="error-state">
          <p style="font-size: 2rem; margin-bottom: 0.5rem;">📭</p>
          <p>该书已被删除或不存在</p>
          <a href="#/" class="btn btn-primary">返回馆藏列表</a>
        </div>
      `;
      return;
    }

    const [currentBorrow, borrowHistory, authed] = await Promise.all([
      loadCurrentBorrowStatus(isbn),
      loadBorrowRecords(isbn),
      isAuthenticated().catch(() => false),
    ]);

    const isBorrowed = currentBorrow && currentBorrow.status === 'borrowed';
    const isBorrowRequested = currentBorrow && currentBorrow.status === 'borrow_requested';
    const isReturnRequested = currentBorrow && currentBorrow.status === 'return_requested';

    container.innerHTML = `
      <a href="#/" class="back-link">← 返回馆藏列表</a>
      <div class="detail-container">
        <div class="detail-header">
          ${renderCover(book)}
          <div class="detail-info">
            <h1>${escapeHtml(book.title)}</h1>
            <div class="detail-field">
              <span class="detail-field-label">ISBN：</span>${escapeHtml(book.isbn)}
            </div>
            <div class="detail-field">
              <span class="detail-field-label">作者：</span>${escapeHtml((book.authors || []).join('、') || '未知')}
            </div>
            <div class="detail-field">
              <span class="detail-field-label">出版社：</span>${escapeHtml(book.publisher || '未知')}
            </div>
            ${book.publish_year ? `<div class="detail-field"><span class="detail-field-label">出版年份：</span>${book.publish_year}</div>` : ''}
            ${book.tags?.length ? `<div class="detail-field"><span class="detail-field-label">标签：</span>${book.tags.map(t => escapeHtml(t)).join('、')}</div>` : ''}
            <div class="detail-field">
              <span class="detail-field-label">状态：</span>${renderStatusBadge(currentBorrow)}
            </div>
            ${renderBorrowerInfo(currentBorrow)}
            <div class="action-bar">
              ${renderBorrowActions(currentBorrow, isbn, authed)}
              ${authed ? renderAdminActions(book, currentBorrow) : ''}
            </div>
          </div>
        </div>
        ${renderBorrowHistory(borrowHistory)}
      </div>
    `;

    // Attach event listeners
    attachBorrowListeners(isbn, currentBorrow);

  } catch (err) {
    console.error('Failed to load book detail:', err);
    container.innerHTML = `
      <div class="error-state">
        <p>加载失败：${err.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">重试</button>
      </div>
    `;
  }
}

function renderCover(book) {
  if (book.cover_url) {
    return `<img class="detail-cover" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" onerror="this.outerHTML='<div class=\\'detail-cover-placeholder\\'>📖</div>'" />`;
  }
  return '<div class="detail-cover-placeholder">📖</div>';
}

function renderStatusBadge(record) {
  if (!record) return '<span class="status-badge status-available">可借</span>';
  switch (record.status) {
    case 'borrow_requested': return '<span class="status-badge status-borrow-requested">等待管理员确认借出</span>';
    case 'borrowed': return '<span class="status-badge status-borrowed">已借出</span>';
    case 'return_requested': return '<span class="status-badge status-borrow-requested">等待管理员确认归还</span>';
    case 'returned': return '<span class="status-badge status-returned">已归还</span>';
    default: return '<span class="status-badge status-available">可借</span>';
  }
}

function renderBorrowerInfo(record) {
  if (!record) return '';
  if (record.status === 'borrow_requested' || record.status === 'borrowed' || record.status === 'return_requested') {
    return `
      <div class="detail-field">
        <span class="detail-field-label">借阅人：</span>${escapeHtml(record.member_name)}（${escapeHtml(record.member_student_id)}）
      </div>
      ${record.borrowed_at ? `<div class="detail-field"><span class="detail-field-label">借阅日期：</span>${formatDate(record.borrowed_at)}</div>` : ''}
    `;
  }
  return '';
}

function renderBorrowActions(record, isbn, authed) {
  if (!record || record.status === 'returned') {
    // Available — anyone can request borrow
    return `<button class="btn btn-primary" id="btn-request-borrow">申请借阅</button>`;
  }
  if (record.status === 'borrowed') {
    // Only the borrower can request return
    return `<button class="btn btn-primary" id="btn-request-return">申请归还</button>`;
  }
  if (record.status === 'borrow_requested') {
    if (authed) {
      return `
        <button class="btn btn-primary" id="btn-confirm-borrow">确认借出</button>
        <button class="btn btn-danger" id="btn-reject-request">拒绝</button>
      `;
    }
    return `<p style="color: var(--color-warning);">等待管理员确认…</p>`;
  }
  if (record.status === 'return_requested') {
    if (authed) {
      return `
        <button class="btn btn-primary" id="btn-confirm-return">确认归还</button>
        <button class="btn btn-danger" id="btn-reject-request">拒绝</button>
      `;
    }
    return `<p style="color: var(--color-warning);">等待管理员确认…</p>`;
  }
  return '';
}

function renderAdminActions(book, record) {
  return `
    <button class="btn" id="btn-edit-book" style="background:var(--color-warning);color:white;">编辑图书</button>
    ${(!record || record.status === 'returned') ? `<button class="btn btn-danger" id="btn-delete-book">删除图书</button>` : ''}
  `;
}

function renderBorrowHistory(records) {
  if (!records || records.length === 0) {
    return '<div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--color-border);"><h3 style="margin-bottom:0.75rem;">📋 借阅历史</h3><p style="color:var(--color-text-muted);">暂无借阅记录</p></div>';
  }

  const items = records.map((r) => `
    <li class="timeline-item">
      <div class="meta">
        借阅日期：${formatDate(r.borrowed_at || r.confirmed_at || r.requested_at)}
        ${r.returned_at ? ` · 归还日期：${formatDate(r.returned_at)}` : r.status === 'borrowed' ? ' · <span style="color:var(--color-danger);">借阅中</span>' : ''}
      </div>
    </li>
  `).join('');

  return `
    <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--color-border);">
      <h3 style="margin-bottom:0.75rem;">📋 借阅历史（${records.length}条）</h3>
      <ul class="timeline">${items}</ul>
    </div>
  `;
}

// ─── Event Listeners ────────────────────────

function attachBorrowListeners(isbn, currentBorrow) {
  const btnBorrow = document.getElementById('btn-request-borrow');
  const btnReturn = document.getElementById('btn-request-return');
  const btnConfirmBorrow = document.getElementById('btn-confirm-borrow');
  const btnConfirmReturn = document.getElementById('btn-confirm-return');
  const btnReject = document.getElementById('btn-reject-request');
  const btnEdit = document.getElementById('btn-edit-book');
  const btnDelete = document.getElementById('btn-delete-book');

  if (btnBorrow) {
    btnBorrow.addEventListener('click', () => showBorrowForm(isbn, 'borrow'));
  }
  if (btnReturn) {
    btnReturn.addEventListener('click', () => showReturnVerifyForm(currentBorrow));
  }
  if (btnConfirmBorrow) {
    btnConfirmBorrow.addEventListener('click', () => handleConfirmBorrow(currentBorrow));
  }
  if (btnConfirmReturn) {
    btnConfirmReturn.addEventListener('click', () => handleConfirmReturn(currentBorrow));
  }
  if (btnReject) {
    btnReject.addEventListener('click', () => handleReject(currentBorrow, isbn));
  }
  if (btnEdit) {
    btnEdit.addEventListener('click', () => navigate(`#/admin/edit/${isbn}`));
  }
  if (btnDelete) {
    btnDelete.addEventListener('click', () => handleDelete(isbn));
  }
}

function showBorrowForm(isbn) {
  const actionBar = document.querySelector('.action-bar');
  if (!actionBar) return;

  actionBar.innerHTML = `
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
      <input type="text" id="borrow-name" placeholder="姓名" style="padding:0.5rem;border:1px solid var(--color-border);border-radius:var(--radius);" />
      <input type="text" id="borrow-student-id" placeholder="学号" style="padding:0.5rem;border:1px solid var(--color-border);border-radius:var(--radius);" />
      <button class="btn btn-primary" id="btn-submit-borrow">提交申请</button>
      <button class="btn" id="btn-cancel-borrow">取消</button>
    </div>
  `;

  document.getElementById('btn-submit-borrow').addEventListener('click', () => handleBorrowSubmit(isbn));
  document.getElementById('btn-cancel-borrow').addEventListener('click', () => {
    // Re-render to reset
    import('./books.js').then(() => {
      renderBookDetail(document.getElementById('app'), isbn);
    });
  });
}

async function handleBorrowSubmit(isbn) {
  const name = document.getElementById('borrow-name').value.trim();
  const studentId = document.getElementById('borrow-student-id').value.trim();

  if (!name || !studentId) {
    alert('请填写姓名和学号');
    return;
  }

  try {
    const { createBorrowRequest, loadCurrentBorrowStatus } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    // Check no active request
    const existing = await loadCurrentBorrowStatus(isbn);
    if (existing && existing.status !== 'returned') {
      alert('该书已有活跃的借阅请求，暂时无法申请');
      return;
    }

    await createBorrowRequest({
      bookIsbn: isbn,
      memberName: name,
      memberStudentId: studentId,
    });

    showToast('借阅申请已提交，等待管理员确认');
    // Small delay so user sees the toast
    setTimeout(() => renderBookDetail(document.getElementById('app'), isbn), 500);
  } catch (err) {
    alert(`提交失败：${err.message}`);
  }
}

function showReturnVerifyForm(record) {
  const actionBar = document.querySelector('.action-bar');
  if (!actionBar) return;

  actionBar.innerHTML = `
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
      <input type="text" id="return-name" placeholder="借阅时填写的姓名" style="padding:0.5rem;border:1px solid var(--color-border);border-radius:var(--radius);" />
      <input type="text" id="return-student-id" placeholder="借阅时填写的学号" style="padding:0.5rem;border:1px solid var(--color-border);border-radius:var(--radius);" />
      <button class="btn btn-primary" id="btn-verify-return">验证并申请归还</button>
      <button class="btn" id="btn-cancel-return">取消</button>
    </div>
  `;

  document.getElementById('btn-verify-return').addEventListener('click', () => handleReturnVerify(record));
  document.getElementById('btn-cancel-return').addEventListener('click', () => {
    renderBookDetail(document.getElementById('app'), record.book_isbn);
  });
}

async function handleReturnVerify(record) {
  const name = document.getElementById('return-name').value.trim();
  const studentId = document.getElementById('return-student-id').value.trim();

  if (!name || !studentId) {
    alert('请填写姓名和学号');
    return;
  }

  if (name !== record.member_name || studentId !== record.member_student_id) {
    alert('姓名或学号不匹配，无法确认是本人操作');
    return;
  }

  try {
    const { requestReturn } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    await requestReturn(record.id);
    showToast('归还申请已提交，等待管理员确认');
    setTimeout(() => renderBookDetail(document.getElementById('app'), record.book_isbn), 500);
  } catch (err) {
    alert(`提交失败：${err.message}`);
  }
}

async function handleConfirmBorrow(record) {
  try {
    const { confirmBorrow } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    await confirmBorrow(record.id);
    showToast('已确认借出');
    setTimeout(() => renderBookDetail(document.getElementById('app'), record.book_isbn), 500);
  } catch (err) {
    alert(`操作失败：${err.message}`);
  }
}

async function handleConfirmReturn(record) {
  try {
    const { confirmReturn } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    await confirmReturn(record.id);
    showToast('已确认归还');
    setTimeout(() => renderBookDetail(document.getElementById('app'), record.book_isbn), 500);
  } catch (err) {
    alert(`操作失败：${err.message}`);
  }
}

async function handleReject(record, isbn) {
  try {
    const { rejectRequest } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    await rejectRequest(record.id, record.status);
    showToast('已拒绝请求');
    setTimeout(() => renderBookDetail(document.getElementById('app'), isbn), 500);
  } catch (err) {
    alert(`操作失败：${err.message}`);
  }
}

async function handleDelete(isbn) {
  if (!confirm('确定要删除这本图书吗？此操作不可撤销。')) return;

  try {
    const { deleteBook } = await import('../lib/data.js');
    const { showToast } = await import('../lib/state.js');

    await deleteBook(isbn);
    showToast('图书已删除');
    setTimeout(() => navigate('#/'), 500);
  } catch (err) {
    alert(`删除失败：${err.message}`);
  }
}

// ─── Helpers ─────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
