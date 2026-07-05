export async function guardSubmit(btn, action, options = {}) {
  const {
    loadingText = '提交中…',
    originalText = btn.textContent,
  } = options;

  if (btn.disabled) return; // already submitting

  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = loadingText;

  try {
    await action();
  } finally {
    btn.disabled = false;
    btn.textContent = originalText || prevText;
  }
}
