/**
 * SM-Dmall ERP Knowledge Base - Admin Dashboard
 * Admin Application Logic
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
      info: 'ℹ️'
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
  }
};

// ============================================
// Admin Session Management
// ============================================

const AdminSession = {
  KEY: 'admin_session',

  save(user) {
    localStorage.setItem(this.KEY, JSON.stringify(user));
  },

  get() {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : null;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  isLoggedIn() {
    return this.get() !== null;
  }
};

// ============================================
// Admin Login Page Logic
// ============================================

function initLoginPage() {
  // Redirect if already logged in
  if (AdminSession.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm = $('#login-form');
  const usernameInput = $('#username');
  const passwordInput = $('#password');

  // Demo admin account
  const DEMO_ADMIN = {
    username: 'admin',
    password: 'admin123',
    role: 'super-admin',
    roleName: 'Super Admin'
  };

  // Handle demo account click to auto-fill credentials
  $$('.login-account').forEach(el => {
    el.addEventListener('click', () => {
      const account = el.dataset.account;
      if (account === 'admin') {
        usernameInput.value = DEMO_ADMIN.username;
        passwordInput.value = DEMO_ADMIN.password;
        Toast.info(`Admin account filled`);
      }
    });
  });

  loginForm.addEventListener('submit', (e) => {
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

    // Validate credentials
    if (username !== DEMO_ADMIN.username || password !== DEMO_ADMIN.password) {
      Toast.error('Invalid username or password');
      passwordInput.focus();
      return;
    }

    // Save session
    AdminSession.save({
      username: DEMO_ADMIN.username,
      role: DEMO_ADMIN.role,
      roleName: DEMO_ADMIN.roleName
    });

    Toast.success(`Welcome, ${username}!`);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });
}

// ============================================
// Admin Main Page Logic
// ============================================

function initMainPage() {
  // Check if logged in
  if (!AdminSession.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = AdminSession.get();
  $('#user-name').textContent = user.username;
  $('#user-role').textContent = user.roleName;

  // Logout handler
  $('#btn-logout').addEventListener('click', () => {
    AdminSession.clear();
    Toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  });

  // Highlight current nav item based on URL
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
// Data Storage Keys
// ============================================

const AdminData = {
  KEYS: {
    USERS: 'admin_users',
    ROLES: 'admin_roles',
    BOTS: 'admin_bots',
    FEEDBACKS: 'admin_feedbacks',
    PERMISSIONS: 'admin_permissions'
  },

  // Initialize with demo data if not exists
  initDemoData() {
    if (!localStorage.getItem(this.KEYS.USERS)) {
      const demoUsers = [
        { id: 'u001', username: 'hq-admin', name: 'HQ Admin User', role: 'hq-admin', status: 'active', createdAt: '2026-01-15' },
        { id: 'u002', username: 'store-manager', name: 'Store Manager', role: 'store-manager', status: 'active', createdAt: '2026-02-01' },
        { id: 'u003', username: 'helpdesk', name: 'Helpdesk Agent', role: 'helpdesk', status: 'active', createdAt: '2026-02-10' },
        { id: 'u004', username: 'john.doe', name: 'John Doe', role: 'store-manager', status: 'active', createdAt: '2026-03-01' },
        { id: 'u005', username: 'jane.smith', name: 'Jane Smith', role: 'helpdesk', status: 'inactive', createdAt: '2026-03-15' }
      ];
      localStorage.setItem(this.KEYS.USERS, JSON.stringify(demoUsers));
    }

    if (!localStorage.getItem(this.KEYS.ROLES)) {
      const demoRoles = [
        { id: 'r001', name: 'HQ IT Admin', permissions: ['user.manage', 'role.manage', 'feedback.view', 'feedback.review', 'knowledge.*', 'bot.*'], userCount: 1 },
        { id: 'r002', name: 'Store Manager', permissions: ['feedback.view', 'bot.B'], userCount: 2 },
        { id: 'r003', name: 'Helpdesk', permissions: ['feedback.view', 'feedback.review', 'bot.A', 'bot.B'], userCount: 2 }
      ];
      localStorage.setItem(this.KEYS.ROLES, JSON.stringify(demoRoles));
    }

    if (!localStorage.getItem(this.KEYS.BOTS)) {
      const demoBots = [
        { id: 'A', name: 'System Issues', nameCn: '系统问题', description: 'Handles system errors and troubleshooting', status: 'enabled', createdAt: '2026-01-01' },
        { id: 'B', name: 'Usage Knowledge', nameCn: '使用知识', description: 'Guides on how to use ERP modules', status: 'enabled', createdAt: '2026-01-01' },
        { id: 'C', name: 'Version Content', nameCn: '版本内容', description: 'System release and version information', status: 'enabled', createdAt: '2026-03-01' }
      ];
      localStorage.setItem(this.KEYS.BOTS, JSON.stringify(demoBots));
    }

    if (!localStorage.getItem(this.KEYS.FEEDBACKS)) {
      const demoFeedbacks = [
        { id: 'f001', botId: 'A', question: 'SAP upload failed, how to handle?', rating: 'useful', status: 'pending', createdAt: '2026-04-15' },
        { id: 'f002', botId: 'B', question: 'How to process a refund?', rating: 'useful', status: 'reviewed', reviewer: 'admin', reviewedAt: '2026-04-16', result: 'valid' },
        { id: 'f003', botId: 'A', question: 'POS online failed', rating: 'not-useful', reason: 'incomplete', comment: 'Answer did not cover offline mode', status: 'pending', createdAt: '2026-04-18' },
        { id: 'f004', botId: 'C', question: 'What new features in version 3.5?', rating: 'useful', status: 'reviewed', reviewer: 'admin', reviewedAt: '2026-04-17', result: 'valid' }
      ];
      localStorage.setItem(this.KEYS.FEEDBACKS, JSON.stringify(demoFeedbacks));
    }
  },

  getUsers() {
    return JSON.parse(localStorage.getItem(this.KEYS.USERS) || '[]');
  },

  saveUsers(users) {
    localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
  },

  getRoles() {
    return JSON.parse(localStorage.getItem(this.KEYS.ROLES) || '[]');
  },

  saveRoles(roles) {
    localStorage.setItem(this.KEYS.ROLES, JSON.stringify(roles));
  },

  getBots() {
    return JSON.parse(localStorage.getItem(this.KEYS.BOTS) || '[]');
  },

  saveBots(bots) {
    localStorage.setItem(this.KEYS.BOTS, JSON.stringify(bots));
  },

  getFeedbacks() {
    return JSON.parse(localStorage.getItem(this.KEYS.FEEDBACKS) || '[]');
  },

  saveFeedbacks(feedbacks) {
    localStorage.setItem(this.KEYS.FEEDBACKS, JSON.stringify(feedbacks));
  },

  generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Initialize demo data on page load
AdminData.initDemoData();

// ============================================
// Page Initialization Router
// ============================================

function initPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  switch (page) {
    case 'login.html':
    case '':
      initLoginPage();
      break;
    case 'index.html':
    case 'dashboard.html':
    case 'users.html':
    case 'roles.html':
    case 'bots.html':
    case 'feedback.html':
      initMainPage();
      break;
    default:
      if (AdminSession.isLoggedIn()) {
        window.location.href = 'index.html';
      } else {
        window.location.href = 'login.html';
      }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPage);
