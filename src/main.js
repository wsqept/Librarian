import { initRouter, onRoute, navigate } from './lib/router.js';
import { initSupabase } from './lib/supabase.js';
import { onAuthStateChange, getSessionSync, logout } from './lib/auth.js';
import { setAuthState, getAuthState } from './lib/state.js';
import { renderBookList } from './pages/books.js';

// ─── Init Supabase ───────────────────────────

initSupabase();

// ─── Auth State ──────────────────────────────

onAuthStateChange((_event, session) => {
  setAuthState({ loading: false, user: session?.user || null });
  updateNav();
});

// Force an initial auth check
getSessionSync().then((session) => {
  setAuthState({ loading: false, user: session?.user || null });
  updateNav();
});

// ─── Routes ──────────────────────────────────

onRoute('#/', () => {
  renderBookList(document.getElementById('app'));
});

onRoute('#/book/:isbn', (params) => {
  import('./pages/detail.js').then(({ renderBookDetail }) => {
    renderBookDetail(document.getElementById('app'), params.isbn);
  });
});

onRoute('#/login', () => {
  import('./pages/login.js').then(({ renderLoginPage }) => {
    renderLoginPage(document.getElementById('app'));
  });
});

onRoute('#/admin/add-book', () => {
  import('./pages/add-book.js').then(({ renderAddBookPage }) => {
    renderAddBookPage(document.getElementById('app'));
  });
});

onRoute('#/admin/edit/:isbn', (params) => {
  import('./pages/add-book.js').then(({ renderAddBookPage }) => {
    renderAddBookPage(document.getElementById('app'), params.isbn);
  });
});

onRoute('#/admin', () => {
  import('./pages/admin.js').then(({ renderAdminPage }) => {
    renderAdminPage(document.getElementById('app'));
  });
});

// ─── Nav Update ──────────────────────────────

function updateNav() {
  const { loading, user } = getAuthState();
  const nav = document.getElementById('nav-links');

  if (loading) {
    nav.innerHTML = '';
    return;
  }

  if (user) {
    nav.innerHTML = `
      <a href="#/admin">管理后台</a>
      <a href="#/admin/add-book">添加图书</a>
      <a href="#/" id="logout-link" style="cursor:pointer;">退出 (${user.email})</a>
    `;
    queueMicrotask(() => {
      const link = document.getElementById('logout-link');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          logout().then(() => {
            setAuthState({ user: null });
            updateNav();
            navigate('#/');
          });
        });
      }
    });
  } else {
    nav.innerHTML = `
      <a href="#/login">管理员登录</a>
    `;
  }
}

// ─── Start Router ────────────────────────────

initRouter();
