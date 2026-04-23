/**
 * SM-Dmall ERP Knowledge Base - Admin Dashboard
 * Admin Application Logic (M5)
 *
 * 使用AdminApiService进行真实API对接
 */

// ============================================
// Utility Functions
// ============================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

// ============================================
// Session Management (wraps TokenManager from admin-api-service)
// ============================================

const AdminSession = {
  isLoggedIn() {
    return !!(TokenManager.getRefreshToken() || TokenManager.getAccessToken());
  },

  get() {
    return AdminApiService.getCurrentUser();
  },

  clear() {
    TokenManager.clearTokens();
    AdminApiService.logout();
  }
};

// ============================================
// Toast Notification System
// ============================================

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  warning(message) {
    this.show(message, 'warning');
  },

  info(message) {
    this.show(message, 'info');
  },
};

// ============================================
// Auth State Handler
// ============================================

function setupAuthHandler() {
  window.addEventListener('auth:expired', () => {
    Toast.warning('登录已过期，请重新登录');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  });
}

// ============================================
// Check Existing Auth
// ============================================

async function checkExistingAuth() {
  if (AdminApiService.getMode() === 'mock') {
    return TokenManager.isLoggedIn();
  }

  try {
    const user = await AdminApiService.checkAuth();
    return !!user;
  } catch (e) {
    return false;
  }
}

// ============================================
// Admin Login Page Logic
// ============================================

async function initLoginPage() {
  if (await checkExistingAuth()) {
    window.location.href = 'index.html';
    return;
  }

  setupAuthHandler();

  const loginForm = $('#login-form');
  const usernameInput = $('#username');
  const passwordInput = $('#password');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Demo admin account auto-fill
  $$('.login-account').forEach(el => {
    el.addEventListener('click', () => {
      const account = el.dataset.account;
      if (account === 'admin') {
        usernameInput.value = 'admin';
        passwordInput.value = 'admin123';
        Toast.info('Admin account filled');
      }
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
      Toast.error('Please enter your username');
      usernameInput.focus();
      return;
    }

    if (!password) {
      Toast.error('Please enter your password');
      passwordInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Logging in...</span>';

    try {
      const result = await AdminApiService.login(username, password);

      if (result.success && result.data) {
        Toast.success(`Welcome, ${result.data.user?.display_name || username}!`);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      }
    } catch (error) {
      Toast.error(error.message || 'Login failed');
      passwordInput.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Login</span><span>→</span>';
    }
  });
}

// ============================================
// Admin Main Page Logic
// ============================================

async function initMainPage() {
  if (!(await checkExistingAuth())) {
    window.location.href = 'login.html';
    return;
  }

  setupAuthHandler();

  let user = AdminApiService.getCurrentUser();
  if (!user) {
    try {
      await AdminApiService.getMe();
      user = AdminApiService.getCurrentUser();
    } catch (e) {
      window.location.href = 'login.html';
      return;
    }
  }

  if (user) {
    $('#user-name').textContent = user.display_name || user.username || 'Admin';
    $('#user-role').textContent = user.roleName || user.role || '';
  }

  // Logout handler
  $('#btn-logout')?.addEventListener('click', async () => {
    await AdminApiService.logout();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  });

  highlightCurrentNav();
}

function highlightCurrentNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage) {
      item.classList.add('active');
    }
  });
}

// ============================================
// Page Initialization Router
// ============================================

async function initPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  switch (page) {
    case 'login.html':
    case '':
      await initLoginPage();
      break;
    case 'index.html':
    case 'dashboard.html':
    case 'users.html':
    case 'roles.html':
    case 'bots.html':
    case 'feedback.html':
      await initMainPage();
      break;
    default:
      if (await checkExistingAuth()) {
        window.location.href = 'index.html';
      } else {
        window.location.href = 'login.html';
      }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPage);
