import { isAuthenticated } from '../lib/auth.js';
import { loadPendingRequests, loadActiveBorrows, confirmBorrow, confirmReturn, rejectRequest, subscribeBorrowRequests } from '../lib/data.js';
import { showToast } from '../lib/state.js';

let subscription = null;

export async function renderAdminPage(container) {
  // Clean up previous subscription to prevent leaks
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }

  const authed = await isAuthenticated().catch(() => false);
  if (!authed) {
    container.innerHTML = `
      <div class="error-state">
        <p>请先<a href="#/login">登录</a></p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <h1 class="page-title">管理后台</h1>
    <div class="admin-panel">
      <button class="tab active" data-tab="pending">待确认请求</button>
      <button class="tab" data-tab="active">当前借出中</button>
    </div>
    <div id="admin-content">
      <div class="loading">
        <div class="spinner"></div>
        <p>加载中…</p>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      loadTabContent(tab.dataset.tab);
    });
  });

  // Subscribe to realtime new borrow requests
  subscription = subscribeBorrowRequests((newRecord) => {
    showToast(`新借阅请求：${newRecord.member_name} 申请借书`);
    // Refresh current tab
    const activeTab = container.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.tab === 'pending') {
      loadTabContent('pending');
    }
  });

  // Load default tab
  loadTabContent('pending');
}

async function loadTabContent(tab) {
  const content = document.getElementById('admin-content');

  try {
    if (tab === 'pending') {
      const requests = await loadPendingRequests();
      renderPendingRequests(content, requests);
    } else if (tab === 'active') {
      const active = await loadActiveBorrows();
      renderActiveBorrows(content, active);
    }
  } catch (err) {
    content.innerHTML = `
      <div class="error-state">
        <p>加载失败：${err.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">重试</button>
      </div>
    `;
  }
}

function renderPendingRequests(container, requests) {
  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p style="font-size: 2rem; margin-bottom: 0.5rem;">✅</p>
        <p>没有待确认的请求</p>
      </div>
    `;
    return;
  }

  const rows = requests.map((r) => `
    <tr id="req-${r.id}">
      <td><strong>${escapeHtml(r.books?.title || r.book_isbn)}</strong></td>
      <td>${escapeHtml(r.member_name)}</td>
      <td>${escapeHtml(r.member_student_id)}</td>
      <td>${r.status === 'borrow_requested' ? '📥 申请借阅' : '📤 申请归还'}</td>
      <td>${formatDateTime(r.requested_at)}</td>
      <td>
        <button class="btn btn-primary" data-action="confirm" data-id="${r.id}" data-type="${r.status}">确认</button>
        <button class="btn btn-danger" data-action="reject" data-id="${r.id}" data-type="${r.status}">拒绝</button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);overflow:hidden;">
      <thead style="background:var(--color-bg);">
        <tr>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">书名</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">借阅人</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">学号</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">类型</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">时间</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Attach button listeners
  container.querySelectorAll('[data-action="confirm"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      btn.disabled = true;
      btn.textContent = '处理中…';

      try {
        if (type === 'borrow_requested') {
          await confirmBorrow(id);
          showToast('已确认借出');
        } else if (type === 'return_requested') {
          await confirmReturn(id);
          showToast('已确认归还');
        }
        // Refresh
        loadTabContent('pending');
      } catch (err) {
        showToast(`操作失败：${err.message}`);
        btn.disabled = false;
        btn.textContent = '确认';
      }
    });
  });

  container.querySelectorAll('[data-action="reject"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定拒绝此请求？')) return;
      const id = btn.dataset.id;
      btn.disabled = true;

      try {
        await rejectRequest(id, btn.dataset.type);
        showToast('已拒绝请求');
        loadTabContent('pending');
      } catch (err) {
        showToast(`操作失败：${err.message}`);
        btn.disabled = false;
      }
    });
  });
}

function renderActiveBorrows(container, records) {
  if (!records || records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p style="font-size: 2rem; margin-bottom: 0.5rem;">📚</p>
        <p>当前没有借出中的图书</p>
      </div>
    `;
    return;
  }

  const rows = records.map((r) => `
    <tr>
      <td><strong>${escapeHtml(r.books?.title || r.book_isbn)}</strong></td>
      <td>${escapeHtml(r.member_name)}</td>
      <td>${escapeHtml(r.member_student_id)}</td>
      <td>${formatDate(r.borrowed_at)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);overflow:hidden;">
      <thead style="background:var(--color-bg);">
        <tr>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">书名</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">借阅人</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">学号</th>
          <th style="padding:0.75rem;text-align:left;font-size:0.85rem;">借出日期</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

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
  return new Date(isoStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
