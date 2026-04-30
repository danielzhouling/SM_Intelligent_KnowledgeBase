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

/**
 * 检查管理员权限（user.manage）
 * 调用 /api/users 接口验证权限，返回 true 表示有权限
 */
async function checkAdminPermission() {
  if (AdminApiService.getMode() === 'mock') {
    return true; // mock 模式不检查
  }

  try {
    await AdminApiService.getUsers();
    return true;
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

  // Check admin permission (user.manage)
  const hasPermission = await checkAdminPermission();
  if (!hasPermission) {
    Toast.error('您没有管理员权限，即将跳转...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
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
    case 'announcements.html':
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

// ============================================
// Admin Profile Modal (M7)
// ============================================

const AdminProfileModal = {
  _tab: 'profile',

  show() {
    this._tab = 'profile';
    this._render();
    this._loadProfile();
  },

  _render() {
    let existing = document.getElementById('admin-profile-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admin-profile-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border-radius:var(--radius-lg);width:420px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
        <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">Personal Settings</h3>
          <button id="apm-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">&times;</button>
        </div>
        <div style="padding:0 20px;border-bottom:1px solid var(--border);">
          <button class="profile-tab ${this._tab === 'profile' ? 'active' : ''}" data-tab="profile" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:500;border-bottom:2px solid ${this._tab === 'profile' ? 'var(--primary)' : 'transparent'};color:${this._tab === 'profile' ? 'var(--primary)' : 'var(--text-muted)'};">Profile</button>
          <button class="profile-tab ${this._tab === 'password' ? 'active' : ''}" data-tab="password" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:500;border-bottom:2px solid ${this._tab === 'password' ? 'var(--primary)' : 'transparent'};color:${this._tab === 'password' ? 'var(--primary)' : 'var(--text-muted)'};">Change Password</button>
        </div>
        <div style="padding:20px;">
          <div id="apm-profile-panel" style="display:${this._tab === 'profile' ? 'block' : 'none'};">
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Display Name</label>
              <input id="apm-display-name" type="text" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Email</label>
              <input id="apm-email" type="email" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Phone</label>
              <input id="apm-phone" type="tel" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
            </div>
            <div id="apm-profile-msg" class="profile-msg"></div>
            <button id="apm-save-profile" class="btn btn-primary" style="width:100%;margin-top:8px;">Save</button>
          </div>
          <div id="apm-password-panel" style="display:${this._tab === 'password' ? 'block' : 'none'};">
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Current Password</label>
              <input id="apm-current-pwd" type="password" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">New Password</label>
              <input id="apm-new-pwd" type="password" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
              <div id="apm-strength" class="pwd-strength" style="display:none;margin-top:6px;">
                <div class="pwd-strength-bar"><div id="apm-strength-fill" class="pwd-strength-fill"></div></div>
                <span id="apm-strength-text" class="pwd-strength-text"></span>
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Confirm New Password</label>
              <input id="apm-confirm-pwd" type="password" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;" />
            </div>
            <div id="apm-pwd-msg" class="profile-msg"></div>
            <button id="apm-save-pwd" class="btn btn-primary" style="width:100%;margin-top:8px;">Change Password</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('apm-close').addEventListener('click', () => overlay.remove());

    overlay.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._tab = tab.dataset.tab;
        this._render();
      });
    });

    document.getElementById('apm-save-profile').addEventListener('click', () => this._saveProfile());
    document.getElementById('apm-save-pwd').addEventListener('click', () => this._savePassword());

    const newPwdInput = document.getElementById('apm-new-pwd');
    if (newPwdInput) {
      newPwdInput.addEventListener('input', () => this._updateStrength(newPwdInput.value));
    }
  },

  async _loadProfile() {
    try {
      const result = await AdminApiService.getProfile();
      if (result.success && result.data) {
        const d = result.data;
        const dn = document.getElementById('apm-display-name');
        const em = document.getElementById('apm-email');
        const ph = document.getElementById('apm-phone');
        if (dn) dn.value = d.display_name || '';
        if (em) em.value = d.email || '';
        if (ph) ph.value = d.phone || '';
      }
    } catch (e) { console.error(e); }
  },

  _updateStrength(pwd) {
    const el = document.getElementById('apm-strength');
    const fill = document.getElementById('apm-strength-fill');
    const text = document.getElementById('apm-strength-text');
    if (!el) return;

    if (!pwd) { el.style.display = 'none'; return; }
    el.style.display = 'block';

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    const levels = [
      { w: '20%', c: '#EF4444', t: 'Very Weak' },
      { w: '40%', c: '#F97316', t: 'Weak' },
      { w: '60%', c: '#EAB308', t: 'Fair' },
      { w: '80%', c: '#22C55E', t: 'Strong' },
      { w: '100%', c: '#10B981', t: 'Very Strong' },
    ];
    const lvl = levels[Math.min(score, 4)];
    fill.style.width = lvl.w;
    fill.style.background = lvl.c;
    text.textContent = lvl.t;
    text.style.color = lvl.c;
  },

  async _saveProfile() {
    const msgEl = document.getElementById('apm-profile-msg');
    const displayName = document.getElementById('apm-display-name')?.value.trim();
    const email = document.getElementById('apm-email')?.value.trim();
    const phone = document.getElementById('apm-phone')?.value.trim();
    try {
      const result = await AdminApiService.updateProfile({ display_name: displayName, email, phone });
      if (result.success) {
        msgEl.textContent = 'Profile updated!';
        msgEl.className = 'profile-msg success';
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && displayName) userNameEl.textContent = displayName;
      } else {
        msgEl.textContent = result.error?.message || 'Update failed';
        msgEl.className = 'profile-msg error';
      }
    } catch (e) {
      msgEl.textContent = e.message;
      msgEl.className = 'profile-msg error';
    }
  },

  async _savePassword() {
    const msgEl = document.getElementById('apm-pwd-msg');
    const currentPwd = document.getElementById('apm-current-pwd')?.value;
    const newPwd = document.getElementById('apm-new-pwd')?.value;
    const confirmPwd = document.getElementById('apm-confirm-pwd')?.value;

    if (!currentPwd || !newPwd || !confirmPwd) {
      msgEl.textContent = 'All fields required';
      msgEl.className = 'profile-msg error';
      return;
    }
    if (newPwd !== confirmPwd) {
      msgEl.textContent = 'Passwords do not match';
      msgEl.className = 'profile-msg error';
      return;
    }
    try {
      const result = await AdminApiService.changePassword({
        current_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      if (result.success) {
        msgEl.textContent = 'Password changed! Please re-login.';
        msgEl.className = 'profile-msg success';
        setTimeout(() => {
          const modal = document.getElementById('admin-profile-modal');
          if (modal) modal.remove();
          AdminSession.clear();
          window.location.href = 'login.html';
        }, 1500);
      } else {
        msgEl.textContent = result.error?.message || 'Failed';
        msgEl.className = 'profile-msg error';
      }
    } catch (e) {
      msgEl.textContent = e.message;
      msgEl.className = 'profile-msg error';
    }
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPage);
