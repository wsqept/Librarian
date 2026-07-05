import { login } from '../lib/auth.js';
import { navigate } from '../lib/router.js';
import { setAuthState } from '../lib/state.js';

export function renderLoginPage(container) {
  container.innerHTML = `
    <div style="max-width:400px;margin:3rem auto;">
      <h1 class="page-title">管理员登录</h1>
      <form id="login-form" style="background:var(--color-surface);padding:1.5rem;border:1px solid var(--color-border);border-radius:var(--radius);box-shadow:var(--shadow);">
        <div class="form-group">
          <label for="login-email">邮箱</label>
          <input type="email" id="login-email" placeholder="admin@example.com" required autofocus />
        </div>
        <div class="form-group">
          <label for="login-password">密码</label>
          <input type="password" id="login-password" placeholder="密码" required />
        </div>
        <div id="login-error" style="color:var(--color-danger);font-size:0.875rem;margin-bottom:0.75rem;display:none;"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">登录</button>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      errorEl.textContent = '请填写邮箱和密码';
      errorEl.style.display = 'block';
      return;
    }

    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = '登录中…';
    errorEl.style.display = 'none';

    try {
      const { session } = await login(email, password);
      setAuthState({ user: session.user });
      navigate('#/');
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        errorEl.textContent = '邮箱或密码错误';
      } else {
        errorEl.textContent = err.message || '登录失败';
      }
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
}
