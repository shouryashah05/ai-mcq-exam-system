export function showToast(message, options = {}) {
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: {
      type: options.type || 'info',
      message,
      duration: options.duration,
    },
  }));
}

export function requestNavigation(to, options = {}) {
  window.dispatchEvent(new CustomEvent('app:navigate', {
    detail: {
      to,
      replace: options.replace ?? true,
      state: options.state,
    },
  }));
}

export function requestLogout(detail = {}) {
  window.dispatchEvent(new CustomEvent('app:logout', { detail }));
}