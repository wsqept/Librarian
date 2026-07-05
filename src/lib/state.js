// Global UI state
let _authState = { loading: true, user: null };

const listeners = [];

export function getAuthState() {
  return _authState;
}

export function setAuthState(state) {
  _authState = { ..._authState, ...state };
  listeners.forEach((fn) => fn(_authState));
}

export function onAuthChange(fn) {
  listeners.push(fn);
}

// toast helper
let toastTimer = null;

export function showToast(message, duration = 3000) {
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.remove();
    toastTimer = null;
  }, duration);
}
