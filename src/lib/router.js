const routes = [];
let currentPath = '';

export function navigate(path) {
  window.location.hash = path;
}

export function onRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

function matchRoute(hash) {
  const path = hash || '#/';

  for (const { pattern, handler } of routes) {
    // Convert ":param" patterns to regex groups
    const regexStr = pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    const regex = new RegExp(`^${regexStr}$`);
    const match = path.match(regex);

    if (match) {
      const params = match.groups || {};
      return { handler, params };
    }
  }
  return null;
}

function handleRoute() {
  currentPath = window.location.hash || '#/';

  const route = matchRoute(currentPath);
  if (route) {
    route.handler(route.params);
  } else {
    document.getElementById('app').innerHTML = `
      <div class="error-state">
        <p>页面未找到：${currentPath}</p>
        <a href="#/" class="btn btn-primary">返回首页</a>
      </div>
    `;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('DOMContentLoaded', handleRoute);
  if (document.readyState !== 'loading') {
    handleRoute();
  }
}

export function getCurrentPath() {
  return currentPath;
}
